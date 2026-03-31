import { sql } from '@vercel/postgres';

let cached = null;
let cacheTime = 0;
const CACHE_TTL = 300000; // 5 minutes

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', 'https://forgotteneth.com');

  // Return cached if fresh
  if (cached && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cached);
  }

  try {
    const { rows } = await sql`
      SELECT
        COUNT(*) FILTER (WHERE type = 'check') AS total_checks,
        COUNT(DISTINCT address) FILTER (WHERE type = 'check') AS unique_checked,
        COUNT(*) FILTER (WHERE type = 'found') AS total_found,
        COUNT(DISTINCT address) FILTER (WHERE type = 'found') AS unique_found,
        COUNT(*) FILTER (WHERE type = 'claim_confirmed') AS total_claims,
        COALESCE(SUM(amount_eth) FILTER (WHERE type = 'claim_confirmed'), 0) AS eth_claimed
      FROM events
    `;

    const stats = {
      total_checks: Number(rows[0].total_checks),
      unique_checked: Number(rows[0].unique_checked),
      total_found: Number(rows[0].total_found),
      unique_found: Number(rows[0].unique_found),
      total_claims: Number(rows[0].total_claims),
      eth_claimed: Number(rows[0].eth_claimed),
    };

    cached = stats;
    cacheTime = Date.now();

    return res.status(200).json(stats);
  } catch (e) {
    return res.status(200).json({
      total_checks: 0, unique_checked: 0, total_found: 0,
      unique_found: 0, total_claims: 0, eth_claimed: 0,
    });
  }
}
