#!/usr/bin/env node

import { createPublicClient, formatEther, getAddress, http, isAddress, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { loadExchanges } from './load-exchanges.js';

const MULTICALL3 = mainnet.contracts.multicall3.address;
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

function getCheckableEntries(exchanges) {
  const supported = [];
  const skipped = [];

  for (const [key, cfg] of Object.entries(exchanges)) {
    if (cfg.noWalletCheck || cfg.directViewCheckUnsupported || !cfg.balanceAbi || !cfg.balanceCall || typeof cfg.balanceArgs !== 'function') {
      skipped.push({
        key,
        name: cfg.name,
        reason: cfg.noWalletCheck
          ? 'requires precomputed/offchain discovery'
          : cfg.directViewCheckUnsupported || 'missing direct balance view',
      });
      continue;
    }

    supported.push({
      key,
      cfg,
      abi: parseAbi([cfg.balanceAbi]),
    });
  }

  return { supported, skipped };
}

function createClient(rpc) {
  return createPublicClient({
    chain: mainnet,
    transport: http(rpc),
  });
}

function formatError(error) {
  return error?.shortMessage || error?.details || error?.message || 'call reverted';
}

async function executeWithFallback(client, contracts) {
  try {
    const results = await client.multicall({
      allowFailure: true,
      contracts: contracts.map((contract) => contract.request),
    });
    return contracts.map((contract, index) => ({
      ...contract,
      ...results[index],
    }));
  } catch (error) {
    if (contracts.length === 1) {
      return [{
        ...contracts[0],
        status: 'failure',
        error,
      }];
    }
    const midpoint = Math.ceil(contracts.length / 2);
    const left = await executeWithFallback(client, contracts.slice(0, midpoint));
    const right = await executeWithFallback(client, contracts.slice(midpoint));
    return left.concat(right);
  }
}

function buildContracts(entries, address) {
  return entries.map(({ key, cfg, abi }) => ({
    key,
    name: cfg.name,
    contract: cfg.contract,
    cfg,
    request: {
      address: getAddress(cfg.contract),
      abi,
      functionName: cfg.balanceCall,
      args: cfg.balanceArgs(address),
    },
  }));
}

function decodeBalances(results) {
  const matches = [];
  const failures = [];

  for (const result of results) {
    if (result.status !== 'success') {
      failures.push({
        key: result.key,
        name: result.name,
        contract: result.contract,
        error: formatError(result.error),
      });
      continue;
    }

    try {
      const wei = result.cfg.balanceTransform ? result.cfg.balanceTransform(result.result) : result.result;
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

async function resolveTarget(client, target) {
  if (isAddress(target)) return target;
  const resolved = await client.getEnsAddress({ name: normalize(target) });
  if (!resolved) {
    throw new Error(`Could not resolve ENS name: ${target}`);
  }
  return resolved;
}

async function runCheck(target, options) {
  const client = createClient(options.rpc);
  const address = await resolveTarget(client, target);
  const exchanges = loadExchanges();
  const { supported, skipped } = getCheckableEntries(exchanges);

  const allContracts = buildContracts(supported, address);
  const batches = options.maxBatchSize
    ? Array.from({ length: Math.ceil(allContracts.length / options.maxBatchSize) }, (_, index) =>
        allContracts.slice(index * options.maxBatchSize, (index + 1) * options.maxBatchSize))
    : [allContracts];

  const callResults = [];
  for (const batch of batches) {
    const batchResults = await executeWithFallback(client, batch);
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
