import { sql } from '@vercel/postgres';
import { rateLimit } from './_ratelimit.js';
import { requireCloudflare, getClientIP } from './_security.js';

// Cache for 5 minutes (stats don't change rapidly)
let cached = null;
let cacheExpiry = 0;

export default async function handler(req, res) {
  function errResp(code, body) {
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(code).json(body);
  }

  if (req.method !== 'GET') {
    return errResp(405, { error: 'Method not allowed' });
  }

  if (!requireCloudflare(req, res)) return;

  const ip = getClientIP(req) || 'unknown';
  const allowed = await rateLimit(ip, 'stats', 30, 60);
  if (!allowed) {
    return errResp(429, { error: 'Rate limit exceeded. Try again in 1 minute.' });
  }

  const now = Date.now();
  if (cached && now < cacheExpiry) {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(cached);
  }

  try {
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE type = 'claim_confirmed' AND contract != 'donation' AND amount_eth > 0) AS total_claims,
        COUNT(DISTINCT address) FILTER (WHERE type = 'claim_confirmed' AND contract != 'donation' AND amount_eth > 0) AS unique_claimers,
        COALESCE(SUM(amount_eth) FILTER (WHERE type = 'claim_confirmed' AND contract != 'donation' AND amount_eth > 0), 0) AS eth_claimed,
        COUNT(DISTINCT address) FILTER (WHERE type = 'check' AND address IS NOT NULL) AS unique_checks,
        COUNT(DISTINCT address) FILTER (WHERE type = 'found' AND address IS NOT NULL) AS unique_found
      FROM events
    `;

    const row = result.rows[0];
    cached = {
      total_claims: parseInt(row.total_claims, 10),
      unique_claimers: parseInt(row.unique_claimers, 10),
      eth_claimed: parseFloat(parseFloat(row.eth_claimed).toFixed(2)),
      unique_checks: parseInt(row.unique_checks, 10),
      unique_found: parseInt(row.unique_found, 10),
    };
    cacheExpiry = now + 300000; // 5 min

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).json(cached);
  } catch (e) {
    console.error('Stats query failed:', e.message);
    return errResp(500, { error: 'Stats not available' });
  }
}
