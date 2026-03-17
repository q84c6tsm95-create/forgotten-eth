import { readFileSync } from 'fs';
import { join } from 'path';
import { verifyToken } from './token.js';

// Balance files mapped by exchange key
const EXCHANGE_FILES = {
  idex: 'idex_eth_balances.json',
  etherdelta: 'etherdelta_eth_balances.json',
  tokenstore: 'tokenstore_eth_balances.json',
  singularx: 'singularx_eth_balances.json',
  enclaves: 'unknown_dex_eth_balances.json',
  decentrex: 'decentrex_eth_balances.json',
  joyso: 'joyso_eth_balances.json',
  ethen: 'ethen_eth_balances.json',
  bitcratic: 'bitcratic_eth_balances.json',
  etherc: 'etherc_eth_balances.json',
  enclavesdex: 'enclavesdex_eth_balances.json',
  etherdelta_m1: 'etherdelta_m1_eth_balances.json',
  confideal: 'confideal_eth_balances.json',
  mooncatrescue: 'mooncatrescue_eth_balances.json',
  dada: 'dada_eth_balances.json',
  ens_old: 'ens_old_eth_balances.json',
  fomo3d_long: 'fomo3d_long_eth_balances.json',
  fomo3d_quick: 'fomo3d_quick_eth_balances.json',
  fomo3d_short: 'fomo3d_short_eth_balances.json',
  etherdelta_m0: 'etherdelta_m0_eth_balances.json',
  neufund: 'neufund_eth_balances.json',
  bancor_eth: 'bancor_eth_eth_balances.json',
};

// In-memory rate limiter (resets on cold start, ~5 min TTL on Vercel)
const rateMap = new Map();
const RATE_LIMIT = 30;     // requests per window
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    rateMap.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// Pre-built lookup maps (persists across warm invocations)
let lookupMaps = null;

function buildLookups() {
  if (lookupMaps) return lookupMaps;
  lookupMaps = {};
  const baseDir = join(process.cwd(), 'data', 'balances');
  for (const [key, file] of Object.entries(EXCHANGE_FILES)) {
    try {
      const raw = readFileSync(join(baseDir, file), 'utf8');
      const data = JSON.parse(raw);
      const map = new Map();
      for (const entry of data.balances) {
        map.set(entry.address.toLowerCase(), entry);
      }
      lookupMaps[key] = {
        map,
        meta: {
          contract: data.contract,
          total_eth: data.total_eth_in_balances,
          addresses_with_balance: data.addresses_with_balance,
          coverage_pct: data.coverage_pct,
          scan_date: data.scan_date,
        },
      };
    } catch (e) {
      // File might not exist yet (e.g. fomo3d before first scan)
    }
  }
  return lookupMaps;
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Token verification
  const token = req.query.token || req.headers['x-api-token'];
  if (!verifyToken(token)) {
    return res.status(403).json({ error: 'Invalid or expired token. Request a token from /api/token first.' });
  }

  // Rate limiting
  const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',').pop()?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again in 1 minute.' });
  }

  const address = req.query.address;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address. Provide a valid Ethereum address as ?address=0x...' });
  }

  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const lookups = buildLookups();
  const normalized = address.toLowerCase();
  const results = {};
  let totalClaimable = 0;

  for (const [key, { map, meta }] of Object.entries(lookups)) {
    const entry = map.get(normalized);
    if (entry) {
      totalClaimable += parseFloat(entry.balance_eth);
      results[key] = {
        contract: meta.contract,
        balance_wei: entry.balance_wei,
        balance_eth: entry.balance_eth,
        rank: entry.rank,
        // Include deed data for ENS if available
        ...(entry.deeds ? { deeds: entry.deeds } : {}),
      };
    }
  }

  return res.status(200).json({
    address,
    checked_at: new Date().toISOString(),
    contracts_checked: Object.keys(lookups).length,
    contracts_with_balance: Object.keys(results).length,
    total_claimable_eth: totalClaimable.toFixed(6),
    balances: results,
  });
}
