import { readFileSync } from 'fs';
import { join } from 'path';
import { rateLimit } from './_ratelimit.js';

// Sharded index: 256 prefix files (~200KB avg) + tiny meta.json
// Cold start loads only meta (6KB) + 1 shard (~200KB) = ~50ms instead of 46MB = ~800ms
let metaData = null;
const shardCache = {};

function loadMeta() {
  if (metaData) return metaData;
  const raw = readFileSync(join(process.cwd(), 'data', 'index_shards', 'meta.json'), 'utf8');
  metaData = JSON.parse(raw);
  return metaData;
}

function loadShard(prefix) {
  if (shardCache[prefix]) return shardCache[prefix];
  try {
    const raw = readFileSync(join(process.cwd(), 'data', 'index_shards', prefix + '.json'), 'utf8');
    shardCache[prefix] = JSON.parse(raw);
  } catch (e) {
    shardCache[prefix] = {};
  }
  return shardCache[prefix];
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const allowed = await rateLimit(ip, 'check', 30, 60);
  if (!allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again in 1 minute.' });
  }

  const address = req.query.address;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }

  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const meta = loadMeta();
  const normalized = address.toLowerCase();
  const prefix = normalized.slice(2, 4); // "0x3f..." -> "3f"
  const shard = loadShard(prefix);
  const entry = shard[normalized];

  const results = {};
  let totalClaimable = 0;

  if (entry) {
    for (const [key, val] of Object.entries(entry)) {
      const contractMeta = meta[key];
      if (!contractMeta) continue;
      const balanceEth = typeof val === 'object' ? val.e : val;
      const balFloat = parseFloat(balanceEth);
      totalClaimable += balFloat;
      const balanceWei = BigInt(Math.round(balFloat * 1e18)).toString();
      results[key] = {
        contract: contractMeta.c,
        balance_wei: balanceWei,
        balance_eth: balanceEth,
        ...(typeof val === 'object' && val.d ? { deeds: val.d } : {}),
        ...(typeof val === 'object' && val.a ? { adoption_requests: val.a } : {}),
        ...(typeof val === 'object' && val.b ? { bounty_details: val.b } : {}),
        ...(typeof val === 'object' && val.ep ? { epoch_details: val.ep } : {}),
      };
    }
  }

  const coverage = {};
  for (const [key, m] of Object.entries(meta)) {
    // Round scan_date to date-only to avoid disclosing operational timing patterns
    const scanDateOnly = m.s ? m.s.replace(/\s\d{2}:\d{2}:\d{2}\s*UTC$/, ' UTC') : m.s;
    coverage[key] = { coverage_pct: m.p, scan_date: scanDateOnly };
  }

  return res.status(200).json({
    address,
    checked_at: new Date().toISOString(),
    contracts_checked: Object.keys(meta).length,
    contracts_with_balance: Object.keys(results).length,
    total_claimable_eth: totalClaimable.toFixed(6),
    balances: results,
    coverage,
  });
}
