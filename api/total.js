import { readFileSync } from 'fs';
import { join } from 'path';
import { sql } from '@vercel/postgres';
import { rateLimit } from './_ratelimit.js';
import { requireCloudflare, getClientIP } from './_security.js';

let fileData = null;
let fileDataExpiry = 0;
let claimsCache = null;
let claimsCacheExpiry = 0;

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
  const allowed = await rateLimit(ip, 'total', 300, 60);
  if (!allowed) {
    return errResp(429, { error: 'Rate limit exceeded. Try again in 1 minute.' });
  }

  const ts = Date.now();
  if (!fileData || ts > fileDataExpiry) {
    try {
      const raw = readFileSync(join(process.cwd(), 'data', 'total.json'), 'utf8');
      fileData = JSON.parse(raw);
      fileDataExpiry = ts + 300000; // re-read every 5 min
    } catch (e) {
      if (!fileData) return errResp(500, { error: 'Total data not available' });
    }
  }

  // Live claims from DB (cached 5 min, falls back to static file data).
  //
  // Critical: the displayed value MUST never decrease. Two reasons:
  //   1. The events table prunes claim_confirmed rows older than 90 days
  //      (api/health.js DB cleanup), so a raw DB sum drops over time.
  //   2. build_index.py already ratchets eth_claimed in data/total.json
  //      (line 305: "eth_claimed is cumulative — never decrease").
  // Without a matching ratchet here, the live API regresses to the
  // unratcheted DB value and users see the hero counter fluctuate.
  // We take max(file, live) per field so the value can only go up.
  const now = Date.now();
  if (!claimsCache || now > claimsCacheExpiry) {
    const fileEth = parseFloat(fileData.eth_claimed || 0);
    const fileWallets = parseInt(fileData.unique_claimers || 0, 10);
    try {
      const result = await sql`
        SELECT COALESCE(SUM(amount_eth), 0) AS eth, COUNT(DISTINCT address) AS wallets
        FROM events
        WHERE type = 'claim_confirmed' AND contract != 'donation'
        AND amount_eth > 0
      `;
      const siteEth = parseFloat(parseFloat(result.rows[0].eth).toFixed(2));
      const siteWallets = parseInt(result.rows[0].wallets, 10);
      // Add detected onchain withdrawals (not done through the site)
      const detectedEth = parseFloat(fileData.detected_eth || 0);
      const detectedWallets = parseInt(fileData.detected_wallets || 0, 10);
      const liveEth = parseFloat((siteEth + detectedEth).toFixed(2));
      const liveWallets = siteWallets + detectedWallets;
      claimsCache = {
        eth_claimed: Math.max(fileEth, liveEth),
        unique_claimers: Math.max(fileWallets, liveWallets),
      };
      claimsCacheExpiry = now + 300000; // 5 min
    } catch {
      // DB unavailable — use static file values
      claimsCache = {
        eth_claimed: fileEth,
        unique_claimers: fileWallets,
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
