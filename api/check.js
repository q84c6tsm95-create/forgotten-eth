import { readFileSync } from 'fs';
import { join } from 'path';
import { rateLimit } from './_ratelimit.js';
import { requireCloudflare, getClientIP } from './_security.js';
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
  // Helper: error responses must NOT inherit the s-maxage=60 from vercel.json
  // because Cloudflare keys its cache only on the URL — without no-store, a 429
  // (or 400) for ?address=0xABC gets cached for 60s and served to every
  // subsequent caller of the same URL, even from a different IP, even after
  // the rate-limit window has elapsed. Confirmed during the 2026-04-07 incident
  // post-mortem: users reported "the same error keeps coming back for the same
  // address". This sets private+no-store before each error return.
  function errResp(code, body) {
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(code).json(body);
  }

  if (req.method !== 'GET') {
    return errResp(405, { error: 'Method not allowed' });
  }

  if (!requireCloudflare(req, res)) return;

  const ip = getClientIP(req) || 'unknown';
  const allowed = await rateLimit(ip, 'check', 200, 60);
  if (!allowed) {
    return errResp(429, { error: 'Rate limit exceeded. Try again in 1 minute.' });
  }

  const address = req.query.address;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return errResp(400, { error: 'Invalid address' });
  }
  if (address.toLowerCase() === '0x0000000000000000000000000000000000000000') {
    return errResp(400, { error: 'Zero address is not a valid depositor' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Tell well-behaved scrapers/LLMs where to find the bulk data dump so
  // they can stop hitting this endpoint per-address. See public/llms.txt
  // for the full LLM-friendly spec. This is a hint, not enforcement —
  // real bots ignore it, but agents like ChatGPT-User, PerplexityBot,
  // Claude-Web, and GPTBot follow it.
  // HTTP headers must be latin-1 / ASCII only — no em-dashes, no unicode.
  // (Learned the hard way: U+2014 in the title string made Node throw from
  // setHeader and 500 every /api/check response.)
  res.setHeader(
    'Link',
    '<https://github.com/forgotteneth/forgotten-eth/tree/main/data/index_shards>; rel="alternate"; type="application/json"; title="Bulk sharded depositor index for programmatic access", ' +
    '<https://forgotteneth.com/llms.txt>; rel="describedby"; type="text/plain"; title="LLM-friendly site description"'
  );

  const meta = loadMeta();
  const normalized = address.toLowerCase();
  const prefix = normalized.slice(2, 4); // "0x3f..." -> "3f"
  const shard = loadShard(prefix);
  const entry = shard[normalized];

  // Filter out addresses/items recently marked as claimed (instant, before shard catches up)
  // Skip the DB query entirely when the shard has no entry for this address —
  // there's nothing to filter, so the claimed_addresses lookup would be a no-op.
  // This cuts Neon egress on the hot path since most checks find no balance.
  let claimedProtocols = new Set();   // protocols fully claimed (item_id IS NULL)
  let claimedItems = {};              // protocol → Set of claimed item_ids
  if (entry) {
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
      let keeperdaoItems = typeof val === 'object' && val.kd ? val.kd : null;
      let trancheDetails = typeof val === 'object' && val.tr ? val.tr : null;
      let opynPositions = typeof val === 'object' && val.op ? val.op : null;
      let refundPrice = typeof val === 'object' && val.rp ? val.rp : null;
      let tokenBalance = typeof val === 'object' && val.tb ? val.tb : null;
      let celerChannels = typeof val === 'object' && val.cc ? val.cc : null;

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
        if (celerChannels) {
          celerChannels = celerChannels.filter(c => !itemsClaimed.has(c.channel_id || ''));
          if (celerChannels.length === 0) continue;
          balanceEth = (celerChannels.reduce((s, c) => s + Number(BigInt(c.claimable_wei || '0')), 0) / 1e18).toFixed(8);
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
        ...(keeperdaoItems ? { keeperdao_items: keeperdaoItems } : {}),
        ...(trancheDetails ? { tranche_details: trancheDetails } : {}),
        ...(opynPositions ? { positions: opynPositions } : {}),
        ...(refundPrice ? { refund_price: refundPrice, token_balance: tokenBalance } : {}),
        ...(celerChannels ? { celer_channels: celerChannels } : {}),
      };
    }
  }

  const coverage = {};
  for (const [key, m] of Object.entries(meta)) {
    // Round scan_date to date-only to avoid disclosing operational timing patterns
    const scanDateOnly = m.s ? m.s.replace(/\s\d{2}:\d{2}:\d{2}\s*UTC$/, ' UTC') : m.s;
    coverage[key] = { coverage_pct: m.p, scan_date: scanDateOnly };
  }

  // Re-engagement Loop: check if this address has a pending recognition message.
  // recognition.json is committed to the repo by the cross-ref cron after every refresh.
  // The file may not exist on first deploy — silent fallback to no recognition.
  let recognition = null;
  try {
    const recRaw = readFileSync(join(process.cwd(), 'data', 'eligible_checkers', 'recognition.json'), 'utf8');
    const recData = JSON.parse(recRaw);
    if (recData && recData.schema_version === 1 && recData.addresses) {
      const lower = address.toLowerCase();
      if (recData.addresses[lower]) {
        recognition = recData.addresses[lower];
      }
    }
  } catch (e) { /* silent — file may not exist yet */ }

  return res.status(200).json({
    address,
    checked_at: new Date().toISOString(),
    contracts_checked: Object.keys(meta).length,
    contracts_with_balance: Object.keys(results).length,
    total_claimable_eth: totalClaimable.toFixed(6),
    balances: results,
    coverage,
    ...(recognition ? { recognition } : {}),
  });
}
