import { readFileSync } from 'fs';
import { join } from 'path';

let cached = null;

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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
