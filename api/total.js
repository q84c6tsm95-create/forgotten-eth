import { readFileSync } from 'fs';
import { join } from 'path';
import { rateLimit } from './_ratelimit.js';

let cached = null;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const allowed = await rateLimit(ip, 'total', 60, 60);
  if (!allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again in 1 minute.' });
  }

  if (!cached) {
    try {
      const raw = readFileSync(join(process.cwd(), 'data', 'total.json'), 'utf8');
      cached = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({ error: 'Total data not available' });
    }
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  return res.status(200).json(cached);
}
