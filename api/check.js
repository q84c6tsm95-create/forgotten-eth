import { readFileSync } from 'fs';
import { join } from 'path';
import { rateLimit } from './_ratelimit.js';
import { sql } from '@vercel/postgres';

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

  const ip = req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const allowed = await rateLimit(ip, 'check', 200, 60);
  if (!allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again in 1 minute.' });
  }

  const address = req.query.address;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }
  if (address.toLowerCase() === '0x0000000000000000000000000000000000000000') {
    return res.status(400).json({ error: 'Zero address is not a valid depositor' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const meta = loadMeta();
  const normalized = address.toLowerCase();
  const prefix = normalized.slice(2, 4); // "0x3f..." -> "3f"
  const shard = loadShard(prefix);
  const entry = shard[normalized];

  // Filter out addresses/items recently marked as claimed (instant, before shard catches up)
  let claimedProtocols = new Set();   // protocols fully claimed (item_id IS NULL)
  let claimedItems = {};              // protocol → Set of claimed item_ids
  try {
    const { rows } = await sql`SELECT protocol, item_id FROM claimed_addresses WHERE address = ${normalized}`;
    for (const r of rows) {
      if (!r.item_id) {
        claimedProtocols.add(r.protocol);
      } else {
        if (!claimedItems[r.protocol]) claimedItems[r.protocol] = new Set();
        claimedItems[r.protocol].add(r.item_id);
      }
    }
  } catch {
    // DB down — fall back to shard data only (no regression)
  }

  const results = {};
  let totalClaimable = 0;

  if (entry) {
    for (const [key, val] of Object.entries(entry)) {
      if (claimedProtocols.has(key)) continue;
      const contractMeta = meta[key];
      if (!contractMeta) continue;
      let balanceEth = typeof val === 'object' ? val.e : val;

      // Filter out individually claimed items for multi-item protocols
      const itemsClaimed = claimedItems[key];
      let deeds = typeof val === 'object' && val.d ? val.d : null;
      let bounties = typeof val === 'object' && val.b ? val.b : null;
      let epochs = typeof val === 'object' && val.ep ? val.ep : null;
      let augurClaims = typeof val === 'object' && val.ac ? val.ac : null;

      if (itemsClaimed && itemsClaimed.size > 0) {
        if (deeds) {
          deeds = deeds.filter(d => !itemsClaimed.has(d.labelHash || d.hash || ''));
          if (deeds.length === 0) continue; // all deeds claimed
          balanceEth = deeds.reduce((s, d) => s + parseFloat(d.value_eth || 0), 0).toFixed(8);
        }
        if (bounties) {
          bounties = bounties.filter(b => !itemsClaimed.has(String(b.id)));
          if (bounties.length === 0) continue;
          balanceEth = bounties.reduce((s, b) => s + parseFloat(b.eth || 0), 0).toFixed(8);
        }
        if (epochs) {
          epochs = epochs.filter(e => !itemsClaimed.has(String(e.epoch)));
          if (epochs.length === 0) continue;
          balanceEth = epochs.reduce((s, e) => s + parseFloat(e.eth || 0), 0).toFixed(8);
        }
        if (augurClaims) {
          augurClaims = augurClaims.filter(c => !itemsClaimed.has(c.id || ''));
          if (augurClaims.length === 0) continue;
        }
      }

      const balFloat = parseFloat(balanceEth);
      totalClaimable += balFloat;
      const balanceWei = BigInt(Math.round(balFloat * 1e18)).toString();
      results[key] = {
        contract: contractMeta.c,
        balance_wei: balanceWei,
        balance_eth: balanceEth,
        ...(deeds ? { deeds } : {}),
        ...(typeof val === 'object' && val.a ? { adoption_requests: val.a } : {}),
        ...(bounties ? { bounty_details: bounties } : {}),
        ...(epochs ? { epoch_details: epochs } : {}),
        ...(augurClaims ? { augur_claims: augurClaims } : {}),
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
