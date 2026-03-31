#!/usr/bin/env node

import { formatEther, Interface, JsonRpcProvider, isAddress } from 'ethers';
import { loadExchanges } from './load-exchanges.js';

const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11';
const MULTICALL3_ABI = [
  'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)',
];
const DEFAULT_RPC = 'https://ethereum.publicnode.com';
const FALLBACK_RPCS = [
  DEFAULT_RPC,
  'https://eth.llamarpc.com',
  'https://1rpc.io/eth',
];

function parseArgs(argv) {
  const options = {
    rpc: DEFAULT_RPC,
    json: false,
    maxBatchSize: null,
  };
  let target = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--rpc') {
      options.rpc = argv[i + 1];
      i += 1;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--max-batch-size') {
      options.maxBatchSize = Number.parseInt(argv[i + 1], 10);
      i += 1;
    } else if (!target) {
      target = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!target) {
    throw new Error('Usage: npm run check:address -- <address-or-ens> [--rpc URL] [--json] [--max-batch-size N]');
  }

  if (options.maxBatchSize !== null && (!Number.isInteger(options.maxBatchSize) || options.maxBatchSize < 1)) {
    throw new Error('--max-batch-size must be a positive integer');
  }

  return { target, options };
}

function toSerializable(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(toSerializable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, toSerializable(inner)]));
  }
  return value;
}

function normalizeDecoded(iface, functionName, decoded) {
  const fragment = iface.getFunction(functionName);
  if (!fragment) {
    throw new Error(`Missing ABI fragment for ${functionName}`);
  }
  return fragment.outputs.length === 1 ? decoded[0] : decoded;
}

function getCheckableEntries(exchanges) {
  const supported = [];
  const skipped = [];

  for (const [key, cfg] of Object.entries(exchanges)) {
    if (cfg.noWalletCheck || !cfg.balanceAbi || !cfg.balanceCall || typeof cfg.balanceArgs !== 'function') {
      skipped.push({
        key,
        name: cfg.name,
        reason: cfg.noWalletCheck ? 'requires precomputed/offchain discovery' : 'missing direct balance view',
      });
      continue;
    }

    const iface = new Interface([cfg.balanceAbi]);
    supported.push({ key, cfg, iface });
  }

  return { supported, skipped };
}

async function runAggregate(provider, calls) {
  const multicall = new Interface(MULTICALL3_ABI);
  const data = multicall.encodeFunctionData('aggregate3', [calls]);
  const raw = await provider.call({ to: MULTICALL3, data });
  const [results] = multicall.decodeFunctionResult('aggregate3', raw);
  return results;
}

async function executeWithFallback(provider, calls, depth = 0) {
  try {
    const results = await runAggregate(provider, calls.map((call) => ({
      target: call.target,
      allowFailure: true,
      callData: call.callData,
    })));
    return calls.map((call, index) => ({
      ...call,
      success: results[index][0],
      returnData: results[index][1],
    }));
  } catch (error) {
    if (calls.length === 1) {
      return [{ ...calls[0], success: false, returnData: '0x', aggregateError: error.message }];
    }
    const midpoint = Math.ceil(calls.length / 2);
    const left = await executeWithFallback(provider, calls.slice(0, midpoint), depth + 1);
    const right = await executeWithFallback(provider, calls.slice(midpoint), depth + 1);
    return left.concat(right);
  }
}

function buildCalls(entries, address) {
  return entries.map(({ key, cfg, iface }) => ({
    key,
    name: cfg.name,
    contract: cfg.contract,
    iface,
    cfg,
    callData: iface.encodeFunctionData(cfg.balanceCall, cfg.balanceArgs(address)),
    target: cfg.contract,
  }));
}

function decodeBalances(callResults) {
  const matches = [];
  const failures = [];

  for (const result of callResults) {
    if (!result.success) {
      failures.push({
        key: result.key,
        name: result.name,
        contract: result.contract,
        error: result.aggregateError || 'call reverted',
      });
      continue;
    }

    try {
      const decoded = result.iface.decodeFunctionResult(result.cfg.balanceCall, result.returnData);
      const normalized = normalizeDecoded(result.iface, result.cfg.balanceCall, decoded);
      const wei = result.cfg.balanceTransform ? result.cfg.balanceTransform(normalized) : normalized;
      if (typeof wei !== 'bigint') {
        throw new Error(`Expected bigint result, got ${typeof wei}`);
      }
      if (wei > 0n) {
        matches.push({
          key: result.key,
          name: result.name,
          contract: result.contract,
          wei,
          eth: formatEther(wei),
        });
      }
    } catch (error) {
      failures.push({
        key: result.key,
        name: result.name,
        contract: result.contract,
        error: error.message,
      });
    }
  }

  matches.sort((a, b) => (a.wei === b.wei ? a.name.localeCompare(b.name) : (a.wei > b.wei ? -1 : 1)));
  return { matches, failures };
}

async function resolveTarget(provider, target) {
  if (isAddress(target)) return target;
  const resolved = await provider.resolveName(target);
  if (!resolved) {
    throw new Error(`Could not resolve ENS name: ${target}`);
  }
  return resolved;
}

async function runCheck(target, options) {
  const provider = new JsonRpcProvider(options.rpc);
  const address = await resolveTarget(provider, target);
  const exchanges = loadExchanges();
  const { supported, skipped } = getCheckableEntries(exchanges);

  const allCalls = buildCalls(supported, address);
  const batches = options.maxBatchSize
    ? Array.from({ length: Math.ceil(allCalls.length / options.maxBatchSize) }, (_, index) =>
        allCalls.slice(index * options.maxBatchSize, (index + 1) * options.maxBatchSize))
    : [allCalls];

  const callResults = [];
  for (const batch of batches) {
    const batchResults = await executeWithFallback(provider, batch);
    callResults.push(...batchResults);
  }

  const { matches, failures } = decodeBalances(callResults);
  const totalWei = matches.reduce((sum, item) => sum + item.wei, 0n);

  const output = {
    input: target,
    address,
    rpc: options.rpc,
    multicall3: MULTICALL3,
    checked_contracts: supported.length,
    skipped_contracts: skipped.length,
    failed_contracts: failures.length,
    total_claimable_wei: totalWei.toString(),
    total_claimable_eth: formatEther(totalWei),
    matches: matches.map((item) => ({
      key: item.key,
      name: item.name,
      contract: item.contract,
      wei: item.wei.toString(),
      eth: item.eth,
    })),
    skipped,
    failures,
  };

  return output;
}

function printOutput(output, asJson) {
  if (asJson) {
    console.log(JSON.stringify(toSerializable(output), null, 2));
    return;
  }

  console.log(`Address: ${output.address}`);
  console.log(`RPC: ${output.rpc}`);
  console.log(`Checked: ${output.checked_contracts} direct-view contracts via Multicall3`);
  console.log(`Skipped: ${output.skipped_contracts} contracts that need precomputed or offchain discovery`);
  console.log(`Failures: ${output.failed_contracts}`);
  console.log(`Total claimable: ${output.total_claimable_eth} ETH`);

  if (output.matches.length > 0) {
    console.log('');
    console.log('Matches:');
    for (const match of output.matches) {
      console.log(`- ${match.name}: ${match.eth} ETH (${match.contract})`);
    }
  }

  if (output.skipped.length > 0) {
    console.log('');
    console.log('Skipped:');
    for (const item of output.skipped) {
      console.log(`- ${item.name}: ${item.reason}`);
    }
  }

  if (output.failures.length > 0) {
    console.log('');
    console.log('Failures:');
    for (const item of output.failures) {
      console.log(`- ${item.name}: ${item.error}`);
    }
  }
}

async function main() {
  const { target, options } = parseArgs(process.argv.slice(2));
  const rpcCandidates = options.rpc === DEFAULT_RPC ? FALLBACK_RPCS : [options.rpc];
  let lastError = null;

  for (const rpc of rpcCandidates) {
    try {
      const output = await runCheck(target, { ...options, rpc });
      printOutput(output, options.json);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Address check failed');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
