import { readFileSync } from 'fs';
import { join } from 'path';

let protocolInfo = null;

function loadProtocolInfo() {
  if (protocolInfo) return protocolInfo;
  const raw = readFileSync(join(process.cwd(), 'data', 'protocol_info.json'), 'utf8');
  protocolInfo = JSON.parse(raw);
  return protocolInfo;
}

export default async function handler(req, res) {
  const info = loadProtocolInfo();
  const base = 'https://forgotteneth.com';

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += `  <url><loc>${base}/</loc><priority>1.0</priority></url>\n`;

  for (const [key, p] of Object.entries(info)) {
    if (!p.slug || p.slug === 'undefined') continue;
    xml += `  <url><loc>${base}/${p.slug}</loc><priority>0.7</priority></url>\n`;
  }

  xml += '</urlset>';

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800');
  return res.status(200).send(xml);
}
