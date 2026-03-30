import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const rateMap = new Map();
const RATE_LIMIT = 60;
const RATE_WINDOW = 60000;

function checkRateLimit(ip) {
  const now = Date.now();
  if (rateMap.size > 500) {
    for (const [k, v] of rateMap) {
      if (now - v.start > RATE_WINDOW) rateMap.delete(k);
    }
  }
  const entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    rateMap.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// Cache the entire summary since it changes only on deploy
let cachedSummary = null;

function buildSummary() {
  if (cachedSummary) return cachedSummary;

  const metaDir = join(process.cwd(), 'data', 'table_meta');
  const contracts = {};
  let totalEth = 0;
  let contractCount = 0;

  let files;
  try {
    files = readdirSync(metaDir).filter(f => f.endsWith('.json'));
  } catch (e) {
    return null;
  }

  for (const file of files) {
    const key = file.replace('.json', '');
    try {
      const raw = readFileSync(join(metaDir, file), 'utf8');
      const meta = JSON.parse(raw);
      contracts[key] = {
        contract: meta.contract,
        total_eth: meta.total_eth,
        contract_eth_balance: meta.contract_eth_balance,
        addresses_with_balance: meta.addresses_with_balance,
        coverage_pct: meta.coverage_pct,
        scan_date: meta.scan_date ? meta.scan_date.replace(/\s\d{2}:\d{2}:\d{2}\s*UTC$/, ' UTC') : meta.scan_date,
      };
      totalEth += meta.total_eth || 0;
      contractCount++;
    } catch (e) {
      // Skip unreadable files
    }
  }

  cachedSummary = { contracts, total_eth: totalEth, contract_count: contractCount };
  return cachedSummary;
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again in 1 minute.' });
  }

  const summary = buildSummary();
  if (!summary) {
    return res.status(500).json({ error: 'Summary data not available' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex');

  return res.status(200).json(summary);
}
