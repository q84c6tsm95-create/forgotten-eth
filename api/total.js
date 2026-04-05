import { readFileSync } from 'fs';
import { join } from 'path';
import { sql } from '@vercel/postgres';
import { rateLimit } from './_ratelimit.js';

let fileData = null;
let fileDataExpiry = 0;
let claimsCache = null;
let claimsCacheExpiry = 0;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const allowed = await rateLimit(ip, 'total', 60, 60);
  if (!allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again in 1 minute.' });
  }

  const ts = Date.now();
  if (!fileData || ts > fileDataExpiry) {
    try {
      const raw = readFileSync(join(process.cwd(), 'data', 'total.json'), 'utf8');
      fileData = JSON.parse(raw);
      fileDataExpiry = ts + 300000; // re-read every 5 min
    } catch (e) {
      if (!fileData) return res.status(500).json({ error: 'Total data not available' });
    }
  }

  // Live claims from DB (cached 5 min, falls back to static file data)
  const now = Date.now();
  if (!claimsCache || now > claimsCacheExpiry) {
    try {
      const result = await sql`
        SELECT COALESCE(SUM(amount_eth), 0) AS eth, COUNT(DISTINCT address) AS wallets
        FROM events
        WHERE type = 'claim_confirmed' AND contract != 'donation'
        AND amount_eth > 0 AND tx_hash IS NOT NULL
      `;
      const siteEth = parseFloat(parseFloat(result.rows[0].eth).toFixed(2));
      const siteWallets = parseInt(result.rows[0].wallets, 10);
      // Add detected onchain withdrawals (not done through the site)
      const detectedEth = parseFloat(fileData.detected_eth || 0);
      const detectedWallets = parseInt(fileData.detected_wallets || 0, 10);
      claimsCache = {
        eth_claimed: parseFloat((siteEth + detectedEth).toFixed(2)),
        unique_claimers: siteWallets + detectedWallets,
      };
      claimsCacheExpiry = now + 300000; // 5 min
    } catch {
      // DB unavailable — use static file values
      claimsCache = {
        eth_claimed: fileData.eth_claimed || 0,
        unique_claimers: fileData.unique_claimers || 0,
      };
      claimsCacheExpiry = now + 60000; // retry in 1 min
    }
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({
    ...fileData,
    eth_claimed: claimsCache.eth_claimed,
    unique_claimers: claimsCache.unique_claimers,
  });
}
