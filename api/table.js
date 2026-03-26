import { readFileSync } from 'fs';
import { join } from 'path';

// Load protocol metadata from single source of truth
const protocols = JSON.parse(readFileSync(join(process.cwd(), 'data', 'protocols.json'), 'utf8'));
const EXCHANGE_FILES = {};
for (const p of protocols) {
  EXCHANGE_FILES[p.key] = p.balance_file;
}


// Cache: pre-computed meta (tiny files)
const metaCache = {};

function loadMeta(key) {
  if (metaCache[key]) return metaCache[key];
  try {
    const raw = readFileSync(join(process.cwd(), 'data', 'table_meta', key + '.json'), 'utf8');
    const meta = JSON.parse(raw);
    try {
      const tvlRaw = readFileSync(join(process.cwd(), 'data', 'tvl', key + '.json'), 'utf8');
      meta.tvl = JSON.parse(tvlRaw).history;
    } catch (_) {}
    metaCache[key] = meta;
    return meta;
  } catch (e) {
    return null;
  }
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // No rate limiting needed — table only serves public metadata (no addresses).
  // Individual address lookups are rate-limited via /api/check.

  const { exchange } = req.query;

  if (!exchange || !EXCHANGE_FILES[exchange]) {
    return res.status(400).json({ error: 'Invalid exchange parameter' });
  }

  const meta = loadMeta(exchange);
  if (!meta) {
    return res.status(404).json({ error: 'Data not available' });
  }

  // No individual addresses served — privacy protection.
  // Users check their own address via /api/check.

  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex');

  // Round scan_date to date-only to avoid disclosing operational timing patterns
  const sanitizedMeta = { ...meta };
  if (sanitizedMeta.scan_date) {
    sanitizedMeta.scan_date = sanitizedMeta.scan_date.replace(/\s\d{2}:\d{2}:\d{2}\s*UTC$/, ' UTC');
  }

  return res.status(200).json({
    exchange,
    meta: sanitizedMeta,
  });
}
