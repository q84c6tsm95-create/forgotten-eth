import { readFileSync } from 'fs';
import { join } from 'path';
import { rateLimit } from './_ratelimit.js';
import { requireCloudflare, getClientIP } from './_security.js';

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

export default async function handler(req, res) {
  // Error responses must explicitly set no-store so Cloudflare doesn't
  // edge-cache a 4xx and serve it to unrelated users. vercel.json applies
  // an s-maxage to all responses on these paths — same root cause as the
  // 2026-04-07 incident post-mortem. Matches the check.js pattern.
  function errResp(code, body) {
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(code).json(body);
  }

  if (req.method !== 'GET') {
    return errResp(405, { error: 'Method not allowed' });
  }

  if (!requireCloudflare(req, res)) return;

  const ip = getClientIP(req) || 'unknown';
  const allowed = await rateLimit(ip, 'table', 60, 60);
  if (!allowed) {
    return errResp(429, { error: 'Rate limit exceeded. Try again in 1 minute.' });
  }

  const { exchange } = req.query;

  if (!exchange || !EXCHANGE_FILES[exchange]) {
    return errResp(400, { error: 'Invalid exchange parameter' });
  }

  const meta = loadMeta(exchange);
  if (!meta) {
    return errResp(404, { error: 'Data not available' });
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
