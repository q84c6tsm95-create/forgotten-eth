// RSS 2.0 feed for the Forgotten ETH changelog.
// Reads public/changelog.html, parses entries via regex, generates RSS XML.
// Cached at the edge: s-maxage=3600, stale-while-revalidate=86400.

import { readFileSync } from 'fs';
import { join } from 'path';

const SITE_URL = 'https://forgotteneth.com';

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseChangelogEntries(html) {
  // Match each .changelog-entry div: extract the .changelog-date,
  // Strategy: split the HTML on the changelog-entry opening tag to get
  // independent entry blocks, then extract date/name/desc from each block
  // independently. This avoids the regex-greediness pitfall where nested
  // </div> closing tags were matching prematurely.
  const dateRegex = /<span\s+class="changelog-date"[^>]*>([^<]+)<\/span>/;
  const nameRegex = /<div\s+class="changelog-name"[^>]*>([\s\S]*?)<\/div>/;
  const descRegex = /<div\s+class="changelog-desc"[^>]*>([\s\S]*?)<\/div>/;
  const linkRegex = /<a\s+href="([^"]+)"/;

  // Split on the entry opening tag. The first chunk before the first match
  // is the page header (drop it). Subsequent chunks each contain one entry's
  // content followed by trailing markup.
  const chunks = html.split(/<div\s+class="changelog-entry"[^>]*>/);
  const entries = [];
  let idx = 0;
  for (let i = 1; i < chunks.length; i++) {
    const block = chunks[i];
    const dateMatch = block.match(dateRegex);
    const nameMatch = block.match(nameRegex);
    const descMatch = block.match(descRegex);
    if (!dateMatch || !nameMatch) continue;
    const dateStr = dateMatch[1].trim();
    const nameHtml = nameMatch[1];
    const linkMatch = nameHtml.match(linkRegex);
    const titleText = nameHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
    if (!titleText) continue;
    entries.push({
      idx: idx++,
      date: dateStr,
      title: titleText.length > 100 ? titleText.slice(0, 97) + '...' : titleText,
      summary: desc.length > 280 ? desc.slice(0, 277) + '...' : desc,
      slug: linkMatch ? linkMatch[1] : '/changelog',
    });
  }
  return entries;
}

function dateToRfc822(dateStr) {
  const year = new Date().getFullYear();
  const parsed = new Date(dateStr + ' ' + year);
  if (isNaN(parsed.getTime())) {
    return new Date().toUTCString();
  }
  // If parsed date is in the future (e.g. month + day cross year boundary),
  // assume it's last year instead
  if (parsed.getTime() > Date.now() + 86400000) {
    parsed.setFullYear(year - 1);
  }
  return parsed.toUTCString();
}

function buildRss(entries) {
  const itemsXml = entries.slice(0, 30).map((e) => '\n    <item>' +
    '\n      <title>' + escapeXml(e.title) + '</title>' +
    '\n      <link>' + SITE_URL + escapeXml(e.slug) + '</link>' +
    '\n      <description>' + escapeXml(e.summary) + '</description>' +
    '\n      <pubDate>' + dateToRfc822(e.date) + '</pubDate>' +
    '\n      <guid isPermaLink="false">forgotteneth-changelog-' + e.idx + '</guid>' +
    '\n    </item>'
  ).join('');

  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '\n<rss version="2.0">' +
    '\n  <channel>' +
    '\n    <title>Forgotten ETH — Changelog</title>' +
    '\n    <link>' + SITE_URL + '/changelog</link>' +
    '\n    <description>Protocol additions and notable changes to the Forgotten ETH recovery index.</description>' +
    '\n    <language>en</language>' +
    '\n    <lastBuildDate>' + new Date().toUTCString() + '</lastBuildDate>' +
    itemsXml +
    '\n  </channel>' +
    '\n</rss>\n';
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    // no-store on errors so Cloudflare doesn't edge-cache the 405 and serve
    // it to other clients. See check.js errResp comment for background.
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(405).send('Method not allowed');
    return;
  }
  try {
    const path = join(process.cwd(), 'public', 'changelog.html');
    const html = readFileSync(path, 'utf-8');
    const entries = parseChangelogEntries(html);
    const xml = buildRss(entries);
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(xml);
  } catch (e) {
    console.error('feed generation failed:', e.message);
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(500).json({ error: 'feed generation failed' });
  }
}
