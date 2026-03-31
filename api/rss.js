import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

let cached = null;
let cacheTime = 0;
const CACHE_TTL = 600000; // 10 minutes

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('GET only');

  if (cached && Date.now() - cacheTime < CACHE_TTL) {
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    return res.status(200).send(cached);
  }

  try {
    const metaDir = join(process.cwd(), 'data', 'table_meta');
    const protocolInfo = JSON.parse(readFileSync(join(process.cwd(), 'data', 'protocol_info.json'), 'utf8'));
    const files = readdirSync(metaDir).filter(f => f.endsWith('.json'));

    const items = [];
    for (const file of files) {
      const key = file.replace('.json', '');
      try {
        const meta = JSON.parse(readFileSync(join(metaDir, file), 'utf8'));
        const info = protocolInfo[key] || {};
        const slug = key.replace(/_/g, '-');
        items.push({
          key,
          name: info.name || key,
          eth: meta.total_eth || 0,
          addresses: meta.addresses_with_balance || 0,
          coverage: meta.coverage_pct || 0,
          scanDate: meta.scan_date || '',
          slug,
          description: info.description || '',
        });
      } catch (e) {}
    }

    items.sort((a, b) => b.eth - a.eth);

    const now = new Date().toUTCString();
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Forgotten ETH</title>
  <link>https://forgotteneth.com</link>
  <description>ETH stuck in defunct smart contracts from 2015-2019. Check if you have claimable funds.</description>
  <language>en</language>
  <lastBuildDate>${now}</lastBuildDate>
  <atom:link href="https://forgotteneth.com/api/rss" rel="self" type="application/rss+xml"/>
`;

    for (const item of items.slice(0, 50)) {
      const ethDisplay = item.eth >= 1 ? Math.round(item.eth).toLocaleString() : item.eth.toFixed(2);
      xml += `  <item>
    <title>${esc(item.name)} - ${ethDisplay} ETH claimable</title>
    <link>https://forgotteneth.com/${esc(item.slug)}</link>
    <guid isPermaLink="true">https://forgotteneth.com/${esc(item.slug)}</guid>
    <description>${esc(item.name)}: ${ethDisplay} ETH across ${item.addresses.toLocaleString()} addresses. Coverage: ${item.coverage}%.</description>
  </item>
`;
    }

    xml += `</channel>
</rss>`;

    cached = xml;
    cacheTime = Date.now();

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    return res.status(200).send(xml);
  } catch (e) {
    return res.status(500).end('Internal error');
  }
}
