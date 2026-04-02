import { sql } from '@vercel/postgres';
import { rateLimit } from './_ratelimit.js';

// Cache for 10 minutes
let cached = null;
let cacheExpiry = 0;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const allowed = await rateLimit(ip, 'claims', 30, 60);
  if (!allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again in 1 minute.' });
  }

  const now = Date.now();
  if (cached && now < cacheExpiry) {
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json(cached);
  }

  try {
    const result = await sql`
      SELECT ts, address, contract, amount_eth, tx_hash, extra
      FROM events
      WHERE type = 'claim_confirmed'
        AND contract != 'donation'
        AND amount_eth > 0
        AND tx_hash IS NOT NULL
      ORDER BY ts DESC
    `;

    const claims = result.rows.map(row => {
      const claim = {
        timestamp: row.ts.toISOString(),
        address: row.address,
        protocol: row.contract,
        eth: parseFloat(parseFloat(row.amount_eth).toFixed(6)),
        tx_hash: row.tx_hash,
      };

      // Parse extra JSON for deed details (ENS)
      if (row.extra) {
        try {
          const extra = typeof row.extra === 'string' ? JSON.parse(row.extra) : row.extra;
          if (extra.deed_name) claim.deed_name = extra.deed_name;
          if (extra.deed_hash) claim.deed_hash = extra.deed_hash;
        } catch {}
      }

      return claim;
    });

    // Aggregate stats
    const totalEth = claims.reduce((s, c) => s + c.eth, 0);
    const uniqueAddresses = new Set(claims.map(c => c.address)).size;
    const byProtocol = {};
    for (const c of claims) {
      if (!byProtocol[c.protocol]) byProtocol[c.protocol] = { claims: 0, eth: 0 };
      byProtocol[c.protocol].claims++;
      byProtocol[c.protocol].eth = parseFloat((byProtocol[c.protocol].eth + c.eth).toFixed(6));
    }

    cached = {
      total_claims: claims.length,
      unique_addresses: uniqueAddresses,
      total_eth: parseFloat(totalEth.toFixed(2)),
      by_protocol: byProtocol,
      claims,
    };
    cacheExpiry = now + 600000; // 10 min

    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).json(cached);
  } catch (e) {
    console.error('Claims query failed:', e.message);
    return res.status(500).json({ error: 'Claims not available' });
  }
}
