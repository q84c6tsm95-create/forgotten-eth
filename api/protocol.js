import { readFileSync } from 'fs';
import { join } from 'path';
import { requireCloudflare } from './_security.js';

let protocolInfo = null;
const metaCache = {};
const htmlCache = {};

function loadProtocolInfo() {
  if (protocolInfo) return protocolInfo;
  const raw = readFileSync(join(process.cwd(), 'data', 'protocol_info.json'), 'utf8');
  protocolInfo = JSON.parse(raw);
  return protocolInfo;
}

function loadMeta(key) {
  if (metaCache[key]) return metaCache[key];
  try {
    const raw = readFileSync(join(process.cwd(), 'data', 'table_meta', key + '.json'), 'utf8');
    metaCache[key] = JSON.parse(raw);
  } catch { metaCache[key] = null; }
  return metaCache[key];
}

function fmtEth(v) {
  const n = parseFloat(v);
  if (n >= 1000) return n.toLocaleString('en', { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtNum(v) { return parseInt(v).toLocaleString('en'); }

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function renderDistribution(dist) {
  if (!dist) return '';
  const order = ['>=100 ETH', '10-100 ETH', '1-10 ETH', '0.1-1 ETH', '0.01-0.1 ETH', '<0.01 ETH'];
  let rows = '';
  for (const range of order) {
    const d = dist[range];
    if (!d) continue;
    rows += `<tr><td>${esc(range)}</td><td>${fmtNum(d.count)}</td><td>${fmtEth(d.total_eth)} ETH</td></tr>`;
  }
  if (!rows) return '';
  return `
    <div style="margin-top:32px">
      <h3 style="font-size:12px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;font-weight:700">Balance Distribution</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Range</th><th>Addresses</th><th>Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

// Per-protocol SEO overrides
const SEO_OVERRIDES = {
  ens_old: {
    title: 'Reclaim ENS Deed Deposit — ENS Old Registrar Recovery | Forgotten ETH',
    metaDesc: 'Reclaim your ENS deed deposit from the old registrar. Call releaseDeed to recover ETH locked since the 2017 ENS auction. 11,292 addresses still unclaimed.',
    faq: [
      { q: 'How do I recover my ENS deposit from the old registrar?', a: 'Connect the wallet that originally bid in the 2017 ENS auction and call releaseDeed with your name\'s labelHash. The contract returns your original deposit. You can do this through Forgotten ETH or directly on Etherscan.' },
      { q: 'Will releasing my ENS deed lose my domain name?', a: 'No. The deed deposit and the ENS name registration are separate. Your name is managed by the new permanent registrar since May 2019. Calling releaseDeed only reclaims the ETH deposit locked in the old auction contract.' },
      { q: 'What is an ENS labelHash?', a: 'A labelHash is the keccak256 hash of your ENS name\'s label (the part before .eth). For example, the labelHash of "example" is keccak256("example"). This hash is the argument required by the releaseDeed function.' },
      { q: 'How much ETH is stuck in the ENS old registrar?', a: 'Approximately 11,324 ETH remains in unclaimed deed deposits across 11,292 addresses. These funds have been recoverable since the May 2019 migration but most users have not called releaseDeed to withdraw.' },
    ],
  },
  digixdao: {
    title: 'DigixDAO DGD Refund — Burn DGD for ETH | Forgotten ETH',
    metaDesc: 'Burn your DGD tokens to reclaim ETH from the DigixDAO dissolution. 12,491 ETH remains in the Acid refund contract. Free, no deadline, open source.',
    faq: [
      { q: 'How do I reclaim ETH from DigixDAO?', a: 'If you hold DGD tokens, approve them to the Acid refund contract, then call burn(). This permanently burns all your DGD and sends ETH to your wallet at a fixed rate of ~0.193 ETH per DGD. You can do this through Forgotten ETH or directly on Etherscan.' },
      { q: 'Why was DigixDAO dissolved?', a: 'In January 2020, DGD holders voted 97% in favor of "Project Ragnarok" to dissolve the DAO and return the ETH treasury. The gold-backed DGX token had limited adoption after years of development, and holders preferred a direct ETH refund.' },
      { q: 'Is there a deadline to claim?', a: 'No. The Acid refund contract has no expiration, no admin withdrawal function, and no pause mechanism. It will accept DGD burns as long as Ethereum exists and the contract holds ETH.' },
      { q: 'How much ETH do I get per DGD?', a: 'The fixed rate is 0.193054 ETH per DGD token. This was set at deployment based on the treasury size divided by DGD supply. The rate never changes.' },
      { q: 'Can I burn only some of my DGD?', a: 'No. The burn() function burns your entire DGD balance in one transaction. There is no partial burn option.' },
    ],
  },
};

function renderPage(slug, key, info, meta) {
  const seo = SEO_OVERRIDES[key] || {};
  const allProtocols = loadProtocolInfo();
  const contractCount = Object.keys(allProtocols).length;
  const title = seo.title || `${info.name} - Forgotten ETH | ${fmtEth(meta.total_eth)} ETH Unclaimed`;
  const descShort = seo.metaDesc || (info.desc ? info.desc.slice(0, 155).replace(/["\n]/g, ' ') + '...' : `${fmtEth(meta.total_eth)} ETH stuck in ${info.name}`);
  const scanDate = meta.scan_date ? meta.scan_date.replace(/\s\d{2}:\d{2}:\d{2}\s*UTC$/, '') : '';
  const tvlJson = meta.tvl ? JSON.stringify(meta.tvl) : 'null';
  const activityJson = meta.activity ? JSON.stringify(meta.activity) : 'null';

  // Use the exact same CSS variables and font as the main page
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<title>${esc(title)}</title>
<meta name="description" content="${esc(descShort)}">
<meta property="og:title" content="${esc(info.name)} - ${fmtEth(meta.total_eth)} ETH Unclaimed">
<meta property="og:description" content="${esc(descShort)}">
<meta property="og:type" content="website">
<meta property="og:image" content="https://forgotteneth.com/og-image-wide.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="https://forgotteneth.com/${slug}">
<link rel="canonical" href="https://forgotteneth.com/${slug}">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(info.name)} - ${fmtEth(meta.total_eth)} ETH Unclaimed">
<meta name="twitter:description" content="${esc(descShort)}">
<meta name="twitter:image" content="https://forgotteneth.com/og-image-wide.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;700&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
<script src="/theme-init.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js" integrity="sha384-vsrfeLOOY6KuIYKDlmVH5UiBmgIdB1oEf7p01YgWHuqmOHfZr374+odEv96n9tNC" crossorigin="anonymous"></script>
<style>
  :root {
    --bg: #faf9f7; --bg2: #f0eee9; --bg3: #e5e2db;
    --border: #d4d0c8; --border-strong: #b8b3a8;
    --text: #1a1a1a; --text2: #6b6560;
    --accent: #0f766e; --accent2: #0d6560; --accent-text: #0f766e; --accent-glow: rgba(15, 118, 110, 0.15);
    --green: #16a34a; --green-glow: transparent;
    --gold: #b45309; --gold-glow: rgba(180, 83, 9, 0.3);
    --red: #dc2626; --yellow: #ca8a04; --orange: #c2410c;
    --glass: #f0eee9; --glass-border: #d4d0c8;
    --radius: 3px; --radius-sm: 2px; --radius-lg: 6px;
    --connect-bg: rgba(15, 118, 110, 0.06); --connect-border: rgba(15, 118, 110, 0.20);
    --font-display: 'Cormorant Garamond', 'Georgia', 'Times New Roman', serif;
    --font-body: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  }
  [data-theme="dark"] {
    --bg: #12111a; --bg2: #1a1924; --bg3: #23212e;
    --border: #2d2a3a; --border-strong: #3d3950;
    --text: #d4d0de; --text2: #7d7890;
    --accent: #7ec8be; --accent2: #a3ddd5; --accent-text: #7ec8be; --accent-glow: rgba(126, 200, 190, 0.12);
    --green: #6bc9a0; --green-glow: transparent;
    --gold: #d4a96a; --gold-glow: rgba(212, 169, 106, 0.3);
    --red: #d47b7b; --yellow: #d4a96a; --orange: #d49a6a;
    --glass: #1a1924; --glass-border: #2d2a3a;
    --connect-bg: rgba(126, 200, 190, 0.04); --connect-border: rgba(126, 200, 190, 0.12);
  }
  /* Corrupt Light theme */
  [data-theme="corrupt-light"] {
    --bg: #faf9f7; --bg2: #f0eee9; --bg3: #e5e2db;
    --border: #d4d0c8; --border-strong: #b8b3a8;
    --text: #1a1a1a; --text2: #6b6560;
    --accent: #ff0066; --accent2: #ff3388; --accent-text: #ff0066;
    --accent-glow: rgba(255,0,102,0.15);
    --green: #16a34a; --green-glow: transparent;
    --gold: #b45309; --gold-glow: rgba(180,83,9,0.3);
    --red: #dc2626; --yellow: #ca8a04; --orange: #c2410c;
    --glass: #f0eee9; --glass-border: #d4d0c8;
    --connect-bg: rgba(255,0,102,0.04); --connect-border: rgba(255,0,102,0.15);
  }
  /* Corrupt Dark theme */
  [data-theme="corrupt-dark"] {
    --bg: #030805; --bg2: #071209; --bg3: #0c1c12;
    --border: #163020; --border-strong: #20442e;
    --text: #00ff41; --text2: #00aa2a;
    --accent: #ff0066; --accent2: #ff3388; --accent-text: #ff0066;
    --accent-glow: rgba(255,0,102,0.2);
    --green: #00ff41; --green-glow: rgba(0,255,65,0.15);
    --gold: #ffcc00; --gold-glow: rgba(255,204,0,0.3);
    --red: #ff3333; --yellow: #ffcc00; --orange: #ff8833;
    --glass: #071209; --glass-border: #163020;
    --connect-bg: rgba(0,255,65,0.03); --connect-border: rgba(0,255,65,0.12);
  }
  /* Corrupt overrides (shared by both corrupt themes) */
  [data-theme^="corrupt"] body { font-family: 'JetBrains Mono', 'SF Mono', monospace; }
  [data-theme^="corrupt"] a:hover { color: #ff0066; text-shadow: 0 0 8px rgba(255,0,102,0.5); }
  [data-theme^="corrupt"] .header .site-name { text-shadow: 3px 0 #ff0066, -3px 0 #00ffff, 0 0 10px rgba(0,255,65,0.4); animation: glitchTitle 3s infinite; }
  [data-theme^="corrupt"] .subtitle { text-shadow: 1px 0 #ff006640, -1px 0 #00ffff40; animation: glitchSubtle 5s infinite; }
  [data-theme^="corrupt"] .connect-section { border-left-color: #ff0066; animation: glitchBorder 8s infinite; opacity: 1; }
  [data-theme^="corrupt"] .btn { border-color: #ff0066; color: #ff0066; background: transparent; }
  [data-theme^="corrupt"] .btn:hover { background: rgba(255,0,102,0.1); }
  [data-theme^="corrupt"] .wallet-btn { border-color: var(--accent); color: var(--accent); background: transparent; }
  [data-theme^="corrupt"] .wallet-btn:hover { background: rgba(255,0,102,0.08); }
  [data-theme^="corrupt"] .wallet-btn.connected { background: var(--bg); }
  [data-theme^="corrupt"] .faq-q:hover { color: #ff0066; }
  [data-theme^="corrupt"] #corruptToggle { color: #ff0066 !important; text-shadow: 0 0 8px rgba(255,0,102,0.5); }
  [data-theme="corrupt-light"] .header .site-name { text-shadow: 3px 0 #ff0066, -3px 0 #0088aa, 0 0 10px rgba(255,0,102,0.3); }
  /* CRT scanlines */
  [data-theme="corrupt-light"] body::after { content: ''; position: fixed; inset: 0; z-index: 9998; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 2px); animation: scanlineFlicker 0.1s infinite; }
  [data-theme="corrupt-dark"] body::after { content: ''; position: fixed; inset: 0; z-index: 9998; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 2px); animation: scanlineFlicker 0.15s infinite; }
  /* Noise grain */
  [data-theme="corrupt-light"] body::before { content: ''; position: fixed; inset: -10%; width: 120%; height: 120%; z-index: 9997; pointer-events: none; opacity: 0.04; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); background-size: 256px 256px; animation: grainShift 0.3s steps(6) infinite; }
  [data-theme="corrupt-dark"] body::before { content: ''; position: fixed; inset: -10%; width: 120%; height: 120%; z-index: 9997; pointer-events: none; opacity: 0.06; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); background-size: 256px 256px; animation: grainShift 0.3s steps(6) infinite; }
  /* Tear line */
  [data-theme^="corrupt"] .container::after { content: ''; position: fixed; left: 0; right: 0; height: 2px; z-index: 9999; pointer-events: none; background: linear-gradient(90deg, transparent 5%, #00ffff 20%, #ff0066 50%, #00ff41 80%, transparent 95%); opacity: 0.8; animation: tearLine 3s linear infinite; }
  [data-theme^="corrupt"] .container::before { content: ''; position: fixed; left: 0; right: 0; height: 1px; z-index: 9999; pointer-events: none; background: linear-gradient(90deg, transparent 15%, #ff0066 40%, #00ffff 60%, transparent 85%); opacity: 0.4; animation: tearLine 7s linear infinite reverse; }
  /* Tile jitter */
  [data-theme^="corrupt"] .header { animation: tileShift 7s infinite; opacity: 1; }
  [data-theme^="corrupt"] .about-section { animation: tileShift 11s infinite; opacity: 1; }
  [data-theme^="corrupt"] .site-footer { animation: tileShift 13s infinite reverse; }
  [data-theme^="corrupt"] .faq-q { animation: paletteBleed 10s infinite; }
  [data-theme^="corrupt"] .faq-item:hover .faq-q { text-shadow: 1px 0 #ff006630, -1px 0 #00ffff30; }
  [data-theme^="corrupt"] .container { animation: pageGlitch 6s infinite; }
  /* Glitched VRAM tile grid background */
  [data-theme="corrupt-light"] body {
    background-image:
      repeating-linear-gradient(90deg, rgba(255,0,102,0.03) 0px, rgba(255,0,102,0.03) 32px, transparent 32px, transparent 64px),
      repeating-linear-gradient(0deg, rgba(0,136,170,0.03) 0px, rgba(0,136,170,0.03) 32px, transparent 32px, transparent 64px),
      repeating-linear-gradient(90deg, rgba(255,0,102,0.05) 0px, transparent 1px, transparent 32px),
      repeating-linear-gradient(0deg, rgba(0,136,170,0.05) 0px, transparent 1px, transparent 32px);
    background-size: 64px 64px, 64px 64px, 32px 32px, 32px 32px;
    background-position: 0 0, 3px 5px, 0 0, -2px 3px;
    animation: bgGlitch 4s steps(1) infinite;
  }
  [data-theme="corrupt-dark"] body {
    background-image:
      repeating-linear-gradient(90deg, rgba(255,0,102,0.06) 0px, rgba(255,0,102,0.06) 32px, transparent 32px, transparent 64px),
      repeating-linear-gradient(0deg, rgba(0,255,65,0.04) 0px, rgba(0,255,65,0.04) 32px, transparent 32px, transparent 64px),
      repeating-linear-gradient(90deg, rgba(255,0,102,0.08) 0px, transparent 1px, transparent 32px),
      repeating-linear-gradient(0deg, rgba(0,255,65,0.08) 0px, transparent 1px, transparent 32px);
    background-size: 64px 64px, 64px 64px, 32px 32px, 32px 32px;
    background-position: 0 0, 3px 5px, 0 0, -2px 3px;
    animation: bgGlitch 4s steps(1) infinite;
  }
  [data-theme^="corrupt"] .neon-world { display: none !important; }
  .corrupt-btn { background: none; border: none; cursor: pointer; font-family: var(--font-mono); font-size: 14px; color: #ff0066; padding: 0; letter-spacing: 0.5px; text-shadow: 1px 0 #ff006640, -1px 0 #00ffff40; animation: corruptBtnGlitch 4s infinite; }
  .corrupt-btn:hover { text-shadow: 2px 0 #ff0066, -2px 0 #00ffff; }
  /* Keyframes */
  @keyframes scanlineFlicker { 0%,100%{opacity:1}50%{opacity:0.97} }
  @keyframes glitchTitle { 0%,82%,100%{text-shadow:3px 0 #ff0066,-3px 0 #00ffff,0 0 10px rgba(0,255,65,0.4);transform:none}83%{text-shadow:-6px 0 #ff0066,6px 0 #00ffff;transform:translateX(-4px) skewX(-3deg)}84%{text-shadow:5px 4px #ff0066,-5px -3px #00ffff;transform:translateX(4px) skewX(2deg)}85%{text-shadow:-4px -3px #ff0066,4px 3px #00ffff,0 0 25px #ff0066;transform:translateX(-3px) skewX(-4deg)}86%{text-shadow:6px 2px #ff0066,-6px -1px #00ffff;transform:translateX(3px)}87%{text-shadow:3px 0 #ff0066,-3px 0 #00ffff,0 0 10px rgba(0,255,65,0.4);transform:none} }
  @keyframes glitchSubtle { 0%,95%,100%{transform:none;opacity:1}96%{transform:translateX(-1px);opacity:0.8}97%{transform:translateX(2px) skewX(-1deg);opacity:0.9}98%{transform:translateX(-1px);opacity:1} }
  @keyframes glitchBorder { 0%,94%,100%{border-left-color:#ff0066}95%{border-left-color:#00ffff}96%{border-left-color:#00ff41}97%{border-left-color:#ff0066} }
  @keyframes tileShift { 0%,87%,100%{transform:none}88%{transform:translateX(-4px)}89%{transform:translateX(3px) skewX(-0.5deg)}90%{transform:translateX(-2px) translateY(2px)}91%{transform:translateX(1px) skewX(0.3deg)}92%{transform:none} }
  @keyframes pageGlitch { 0%,96%,100%{transform:none;filter:none}97%{transform:translateX(-5px);filter:hue-rotate(90deg)}98%{transform:translateX(3px) skewX(-0.5deg);filter:hue-rotate(-60deg) saturate(2)}99%{transform:translateX(-2px);filter:hue-rotate(30deg)} }
  @keyframes tearLine { 0%{top:-2px}100%{top:100vh} }
  @keyframes paletteBleed { 0%,96%,100%{border-color:var(--border)}97%{border-color:#00ffff}98%{border-color:#ff0066}99%{border-color:#00ff41} }
  @keyframes grainShift { 0%{transform:translate(0,0)}16%{transform:translate(-3px,2px)}33%{transform:translate(2px,-1px)}50%{transform:translate(-1px,3px)}66%{transform:translate(3px,-2px)}83%{transform:translate(-2px,1px)}100%{transform:translate(1px,-3px)} }
  @keyframes bgGlitch { 0%,85%,100%{background-position:0 0,3px 5px,0 0,-2px 3px}86%{background-position:-4px 2px,6px -3px,3px -1px,-5px 4px}88%{background-position:2px -3px,-5px 7px,-2px 4px,3px -6px}90%{background-position:0 0,3px 5px,0 0,-2px 3px} }
  @keyframes corruptBtnGlitch { 0%,88%,100%{transform:none;text-shadow:1px 0 #ff006640,-1px 0 #00ffff40}89%{transform:translateX(-1px);text-shadow:2px 0 #ff0066,-2px 0 #00ffff}90%{transform:translateX(1px) skewX(-2deg);text-shadow:-1px 0 #ff0066,1px 0 #00ffff}91%{transform:none;text-shadow:1px 0 #ff006640,-1px 0 #00ffff40} }

  [data-theme="dark"] a:hover { color: #a3ddd5; }
  [data-theme="dark"] .wallet-btn.connected { background: var(--bg); }
  [data-theme="dark"] .wallet-btn.connected:hover { border-color: var(--red); color: var(--red); }
  [data-theme="dark"] .btn { box-shadow: 2px 2px 0 rgba(126, 200, 190, 0.2); }
  [data-theme="dark"] .btn:hover { box-shadow: 3px 3px 0 rgba(126, 200, 190, 0.3); }
  [data-theme="dark"] .connect-section { box-shadow: 0 0 40px -10px rgba(126, 200, 190, 0.08), inset 0 0 30px -15px rgba(126, 200, 190, 0.03); background: rgba(18, 17, 26, 0.9); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
  body, .card, .btn, .connect-section, .site-footer, input, table, th, td { transition: background-color 0.35s, color 0.35s, border-color 0.35s, box-shadow 0.35s; }

  /* Pixel cursor (Yume Nikki) */
  * { cursor: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAUElEQVR4nGNgoAYQEZH7T7EBFBkC0lx3Yh/5hsAMINsQZAPIMgTdAJINwWYASYbgMoBoQ/C5gGwDyAoDsqMT2alkGYKukOKEhWwIxXmEkAEAaCednTE3BIIAAAAASUVORK5CYII=") 1 1, auto; }
  a, button, [role="button"], select, input[type="submit"] { cursor: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAUElEQVR4nGNgoAYQEZH7T7EBFBkC0lx3Yh/5hsAMINsQZAPIMgTdAJINwWYASYbgMoBoQ/C5gGwDyAoDsqMT2alkGYKukOKEhWwIxXmEkAEAaCednTE3BIIAAAAASUVORK5CYII=") 1 1, pointer; }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--font-body); background: var(--bg); color: var(--text); line-height: 1.6; min-height: 100vh; }
  /* Light mode: Yume Nikki checkerboard */
  body { background-color: var(--bg); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='16' height='16' fill='%23f0eee9'/%3E%3Crect x='16' y='16' width='16' height='16' fill='%23f0eee9'/%3E%3Crect x='16' width='16' height='16' fill='%23ece9e3'/%3E%3Crect y='16' width='16' height='16' fill='%23ece9e3'/%3E%3C/svg%3E"); background-size: 32px 32px; }
  body::before { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: -2; background: radial-gradient(ellipse 700px 450px at 15% 25%, rgba(15, 118, 110, 0.06), transparent 70%), radial-gradient(ellipse 500px 400px at 80% 20%, rgba(180, 130, 80, 0.05), transparent 70%), radial-gradient(ellipse 600px 350px at 50% 75%, rgba(15, 118, 110, 0.04), transparent 70%); }
  body::after { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: -1; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cpolygon points='64,52 58,64 70,64' fill='%230f766e' opacity='0.06'/%3E%3C/svg%3E"), linear-gradient(rgba(15, 118, 110, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 118, 110, 0.05) 1px, transparent 1px); background-size: 128px 128px, 32px 32px, 32px 32px; }
  /* Dark mode: Neon World */
  @keyframes neonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
  [data-theme="dark"] body { background-color: #0a0a12; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='16' height='16' fill='%23161425'/%3E%3Crect x='16' y='16' width='16' height='16' fill='%23161425'/%3E%3Crect x='16' width='16' height='16' fill='%230e0d18'/%3E%3Crect y='16' width='16' height='16' fill='%230e0d18'/%3E%3C/svg%3E"); background-size: 32px 32px; }
  [data-theme="dark"] body::before { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: -2; opacity: 1; animation: neonPulse 8s ease-in-out infinite; background: radial-gradient(ellipse 800px 500px at 10% 20%, rgba(160,50,180,0.08), transparent 70%), radial-gradient(ellipse 600px 400px at 85% 15%, rgba(80,200,180,0.07), transparent 70%), radial-gradient(ellipse 700px 450px at 50% 80%, rgba(100,80,220,0.06), transparent 70%), radial-gradient(ellipse 500px 350px at 75% 50%, rgba(200,60,120,0.05), transparent 70%); }
  [data-theme="dark"] body::after { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: -1; opacity: 1; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cpolygon points='64,52 58,64 70,64' fill='%236030a0' opacity='0.15'/%3E%3C/svg%3E"), linear-gradient(rgba(200,80,180,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(80,200,190,0.08) 1px, transparent 1px); background-size: 128px 128px, 32px 32px, 32px 32px; }
  a { color: var(--accent-text); text-decoration: underline; }
  a:hover { color: #0d6560; }
  .container { max-width: 1400px; margin: 0 auto; padding: 0 24px 32px; }

  /* Header */
  .header { padding: 24px 0 12px; text-align: center; }
  .header h1, .header .site-name { font-family: var(--font-display); font-size: 38px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 4px; }
  .header h1 a, .header .site-name a { color: inherit; text-decoration: none; }
  .header .subtitle { font-family: var(--font-display); font-size: 16px; color: var(--text2); font-weight: 400; margin-bottom: 20px; font-style: italic; letter-spacing: 0.3px; opacity: 0.8; }
  .hero-tagline { font-family: var(--font-display); color: var(--text); font-size: 17px; line-height: 1.5; max-width: 700px; margin: 0 auto 18px; font-weight: 400; text-align: center; }
  .hero-tagline a { color: var(--text2); }
  .header-nav { display: inline-flex; align-items: center; justify-content: center; gap: 24px; margin-top: 2px; font-size: 13px; font-family: var(--font-mono); }
  .header-nav a { color: var(--text2); text-decoration: none; transition: color 150ms ease; text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 3px; }
  .header-nav a:hover { color: var(--accent); text-decoration-color: var(--accent); }
  .nav-sep { display: none; }
  #themeToggle { background: none; border: none; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; color: var(--text2); transition: color 150ms ease; padding: 0; line-height: 1; font-family: var(--font-mono); }
  #themeToggle:hover { color: var(--accent); }

  /* Protocol content */
  .project-desc { color: var(--text2); font-size: 13px; line-height: 1.6; margin-bottom: 16px; }
  .color-bar { height: 4px; width: 48px; border-radius: 2px; margin-bottom: 16px; }
  .protocol-hero { padding: 28px 0 0; }
  .protocol-hero h2 { font-family: var(--font-display); font-size: 28px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.2px; }

  /* Cards — matches main page */
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
  .card .label { font-size: 11px; color: var(--text2); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-weight: 700; }
  .card .value { font-size: 20px; font-weight: 700; }
  .card .value.eth { color: var(--accent-text); }

  /* Charts — matches main page */
  .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; max-width: 100%; overflow: hidden; }
  .chart-box { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; min-width: 0; }
  .chart-box h3 { font-size: 12px; color: var(--text2); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
  .chart-wrap { position: relative; height: 300px; }

  /* Contract info */
  .contract-info { font-family: var(--font-mono); font-size: 12px; color: var(--text2); margin-bottom: 16px; text-align: center; }

  /* Table — matches main page */
  .table-wrap { overflow-x: auto; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th { position: sticky; top: 0; background: var(--bg2); padding: 10px 12px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text); border-bottom: 1px solid var(--border); }
  tbody tr { border-bottom: 1px solid var(--border); }
  tbody tr:nth-child(even) { background: var(--bg2); }
  tbody tr:hover { background: var(--bg3); }
  tbody td { padding: 8px 12px; }

  /* CTA / Check section */
  .connect-section { background: var(--connect-bg); border: 1px solid var(--connect-border); border-left: 3px solid var(--accent); border-radius: 4px 14px 14px 4px; padding: 28px 32px; margin: 32px auto; font-size: 13px; display: flex; flex-direction: column; align-items: stretch; gap: 16px; max-width: 680px; }
  .connect-input-row { display: flex; gap: 8px; align-items: center; }
  .connect-input-wrap { flex: 1; }
  .connect-input { width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius); font-family: var(--font-mono); font-size: 13px; outline: none; background: var(--bg); color: var(--text); transition: border-color 0.15s, box-shadow 0.15s; }
  .connect-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1); }
  .connect-divider { display: flex; align-items: center; gap: 12px; color: var(--text2); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 500; opacity: 0.5; }
  .connect-divider::before, .connect-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .connect-feedback { display: none; font-size: 11px; margin-top: 4px; }
  .connect-feedback.error { color: var(--red); }
  .connect-feedback.info { color: var(--text2); }
  .btn { padding: 7px 14px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius); cursor: pointer; font-size: 12px; font-weight: 600; white-space: nowrap; text-decoration: none; display: inline-block; font-family: inherit; transition: background 0.15s, color 0.15s; }
  .btn:hover { background: var(--accent2); color: #fff; text-decoration: none; }
  .btn.ghost { background: var(--bg); border: 1px solid var(--border); color: var(--text2); }
  .btn.ghost:hover { border-color: var(--accent); color: var(--accent); }

  /* Address check */
  .check-box { background: var(--connect-bg); border: 1px solid var(--connect-border); border-radius: var(--radius); padding: 20px; margin-bottom: 24px; text-align: center; }
  .check-box h3 { font-size: 14px; font-weight: 700; margin-bottom: 12px; }
  .check-form { display: flex; gap: 8px; max-width: 520px; margin: 0 auto; }
  .check-form input { flex: 1; padding: 10px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 13px; font-family: var(--font-mono); outline: none; }
  .check-form input:focus { border-color: var(--accent); }
  .check-form input::placeholder { color: var(--text2); opacity: 0.6; }
  .check-result:empty { display: none; }
  .check-result { margin-top: 16px; font-size: 13px; text-align: center; }
  .check-result .found { color: var(--green); font-weight: 700; font-size: 18px; }
  .check-result .not-found { color: var(--text2); }
  .check-result .others { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--connect-border); font-size: 13px; color: var(--text2); }
  .check-result .others a.others-cta { display: inline-block; margin-top: 8px; padding: 8px 20px; background: var(--accent); color: #fff; border-radius: var(--radius); text-decoration: none; font-weight: 600; font-size: 13px; }
  .check-result .others a.others-cta:hover { background: #5b21b6; color: #fff; }

  /* About / FAQ — matches main page */
  .about-section { border-top: 1px solid var(--border); margin-top: 48px; padding: 40px 0 8px; }
  .about-section h2 { font-family: var(--font-mono); font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center; letter-spacing: -0.3px; }
  .about-section > p { font-size: 14px; color: var(--text2); line-height: 1.8; margin-bottom: 32px; text-align: center; max-width: 600px; margin-left: auto; margin-right: auto; }
  .faq-label { font-family: var(--font-display); font-size: 18px; letter-spacing: 0.3px; color: var(--text2); font-weight: 600; margin-bottom: 16px; text-align: center; font-style: italic; }
  .faq-list { max-width: 640px; margin: 0 auto; }
  .faq-item { margin-bottom: 8px; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; transition: border-color 0.2s; }
  .faq-item:hover { border-color: var(--border-strong); }
  .faq-item.open { border-color: var(--border-strong); }
  .faq-q { padding: 16px 20px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; background: var(--bg2); transition: background 0.15s; }
  .faq-q:hover { background: var(--bg3); }
  .faq-q .faq-arrow { transition: transform 0.2s ease; font-size: 10px; color: var(--text2); }
  .faq-item.open .faq-q .faq-arrow { transform: rotate(180deg); color: var(--accent); }
  .faq-a { max-height: 0; overflow: hidden; padding: 0 20px; font-size: 14px; color: var(--text2); line-height: 1.8; transition: max-height 0.3s ease, padding 0.3s ease; }
  .faq-item.open .faq-a { max-height: 300px; padding: 16px 20px; }

  /* Wallet — matches main page */
  .wallet-area { display: flex; align-items: center; gap: 10px; }
  .wallet-btn { padding: 10px 20px; background: transparent; border: 1.5px solid var(--accent); color: var(--accent); border-radius: var(--radius); cursor: pointer; font-size: 13px; font-weight: 600; font-family: var(--font-body); width: 100%; transition: background 0.15s, color 0.15s; }
  .wallet-btn:hover { background: var(--accent); color: #fff; }
  .wallet-btn.connected { background: var(--bg); border: 1px solid var(--green); color: var(--green); }
  .wallet-btn.connected:hover { border-color: var(--red); color: var(--red); }
  .wallet-addr { font-family: var(--font-mono); font-size: 12px; color: var(--text2); background: var(--bg2); padding: 4px 10px; border-radius: var(--radius); border: 1px solid var(--border); display: none; }
  [data-theme="dark"] .wallet-btn.connected { background: var(--bg); }
  [data-theme="dark"] .wallet-btn.connected:hover { border-color: var(--red); color: var(--red); }

  /* Back link */
  .back-link { display: inline-block; font-size: 14px; color: var(--accent-text); text-decoration: none; margin: 16px 0 8px; padding: 10px 24px; background: var(--connect-bg); border: 1px solid var(--connect-border); border-radius: var(--radius); font-weight: 700; }
  .back-link:hover { background: var(--accent); color: #fff; text-decoration: none; }

  /* Footer */
  .site-footer { text-align: center; padding: 32px 0 28px; border-top: 1px solid var(--border); margin-top: 48px; }
  .footer-credit { font-size: 12px; color: var(--text2); opacity: 0.6; }
  .site-footer a svg { transition: color 150ms ease; }
  .site-footer a:hover { color: var(--accent) !important; }

  @media (max-width: 768px) {
    .charts { grid-template-columns: 1fr; }
    .cards { grid-template-columns: repeat(2, 1fr); }
    .connect-input-row { flex-direction: column; }
    .chart-wrap { height: 250px; }
    .connect-section { padding: 20px 16px; gap: 14px; max-width: 100%; }
    .wallet-btn { width: 100%; padding: 12px 18px; font-size: 15px; }
  }
  @media (max-width: 480px) {
    h1 { font-size: 20px !important; }
    .cards { grid-template-columns: 1fr; }
    .container { padding: 0 12px 32px; }
    .faq-q { font-size: 13px; }
    .table-wrap { font-size: 12px; }
  }
</style>
</head>
<body data-protocol-key="${key}" data-protocol-name="${esc(info.name)}">
<div class="container">

  <!-- Header — same as main page -->
  <div class="header">
    <div class="header-left">
      <div class="site-name"><a href="/">Forgotten &#926;TH</a></div>
      <p class="subtitle">Recover ETH stuck in old smart contracts</p>
      <nav class="header-nav">
        <a href="/">Home</a>
        <span class="nav-sep">&middot;</span>
        <a href="/#faq">FAQ</a>
        <span class="nav-sep">&middot;</span>
        <a href="/api">API</a>
        <span class="nav-sep">&middot;</span>
        <a href="/changelog">Changelog</a>
        <span class="nav-sep">&middot;</span>
        <button id="themeToggle" title="Toggle dark/light mode" aria-label="Toggle dark/light mode"></button>
        <span class="nav-sep">&middot;</span>
        <button id="corruptToggle" class="corrupt-btn" title="Corrupt mode" aria-label="Toggle corrupt mode">C&#x338;O&#x2591;R&#x2593;RUPT</button>
      </nav>
    </div>
  </div>

  <p class="hero-tagline"><span style="font-weight:600">Thousands of ETH sit forgotten in defunct contracts from the 2015&ndash;2019 era.</span><br><span style="color:var(--text2)"><a href="https://debank.com" target="_blank" rel="noopener noreferrer">DeBank</a>, <a href="https://zapper.xyz" target="_blank" rel="noopener noreferrer">Zapper</a>, and other portfolio trackers don't detect them.</span></p>

  <!-- Address check -->
  <div class="connect-section">
    <div class="connect-input-row">
      <div class="connect-input-wrap">
        <input type="text" id="checkAddr" class="connect-input" placeholder="0x... or ENS name" spellcheck="false" autocomplete="off">
      </div>
      <button class="btn" id="checkBtn" style="padding:10px 24px;font-size:13px;font-weight:700;flex-shrink:0">Check</button>
    </div>
    <div id="checkResult" class="check-result"></div>
  </div>

  <!-- Protocol info -->
  <div class="protocol-hero">
    <div class="color-bar" style="background:${esc(info.color)}"></div>
    <h1 style="font-family:var(--font-mono);font-size:24px;font-weight:800;margin-bottom:8px;letter-spacing:-0.3px">${esc(info.name)}</h1>
    <p class="project-desc">${esc(info.desc)}</p>
    <div class="contract-info">
      Contract: <a href="https://etherscan.io/address/${esc(info.contract)}" target="_blank" rel="noopener noreferrer">${esc(info.contract)}</a>
      &middot; Deployed: ${esc(info.deployed)}
    </div>
  </div>

  <div class="cards">
    <div class="card"><div class="label">Unclaimed ETH</div><div class="value eth">${fmtEth(meta.total_eth)} ETH</div></div>
    <div class="card"><div class="label">Addresses</div><div class="value eth">${fmtNum(meta.addresses_with_balance)}</div></div>
  </div>

  <div class="charts">
    <div class="chart-box">
      <h3>ETH Balance Over Time</h3>
      <div class="chart-wrap"><canvas id="tvlChart"></canvas></div>
    </div>
    <div class="chart-box">
      <h3>Contract Interactions</h3>
      <div class="chart-wrap"><canvas id="actChart"></canvas></div>
    </div>
  </div>

  ${renderDistribution(meta.distribution)}

  ${seo.faq ? `
  <div style="margin-top:32px">
    <h3 style="font-size:12px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;font-weight:700">Frequently Asked Questions</h3>
    <div class="faq-list">
      ${seo.faq.map(f => `<div class="faq-item">
        <div class="faq-q" data-faq-toggle>${esc(f.q)} <span class="faq-arrow">&#x25BC;</span></div>
        <div class="faq-a">${esc(f.a)}</div>
      </div>`).join('')}
    </div>
  </div>
  <script type="application/ld+json">
  ${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": seo.faq.map(f => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a } })) })}
  </script>` : ''}

  <!-- FAQ Section -->
  <div class="about-section" id="faq">
    <div class="faq-label">Frequently Asked Questions</div>
    <div class="faq-list">
    <div class="faq-item">
      <div class="faq-q" data-faq-toggle>How does it work? <span class="faq-arrow">&#x25BC;</span></div>
      <div class="faq-a">Paste any address or connect your wallet. We check ${contractCount} defunct contracts for unclaimed balances. If found, click Withdraw — the transaction goes directly from the original contract to your wallet.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q" data-faq-toggle>Is this safe? <span class="faq-arrow">&#x25BC;</span></div>
      <div class="faq-a">Yes. Fully <a href="https://github.com/q84c6tsm95-create/forgotten-eth" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">open source</a>. No proxy contracts, no intermediaries. Most withdrawals are simple ETH transfers with no approvals needed. A few contracts (e.g. wrapped ETH variants, dividend tokens) require a token burn or two-step process — the UI explains each case. Every withdrawal can be done manually on Etherscan — this site just makes it easier.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q" data-faq-toggle>Why can't my portfolio tracker see these? <span class="faq-arrow">&#x25BC;</span></div>
      <div class="faq-a">DeBank, Zerion, and Zapper only index active protocols. These contracts are defunct or too obscure to be tracked. Your ETH is still onchain, it just doesn't show up in standard wallet interfaces.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q" data-faq-toggle>Do you charge fees? <span class="faq-arrow">&#x25BC;</span></div>
      <div class="faq-a">No. Completely free. After a successful claim, there's an optional donation prompt — entirely voluntary.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q" data-faq-toggle>What contracts are tracked? <span class="faq-arrow">&#x25BC;</span></div>
      <div class="faq-a">${contractCount} contracts across defunct DEXes (EtherDelta, IDEX v1, Token.Store), dividend tokens (PoWH3D, Fomo3D), NFT auctions (MoonCatRescue, DADA), bounty platforms, ICO escrows, ENS old registrar deeds, DAO treasury refunds (DigixDAO), and wrapped ETH variants.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q" data-faq-toggle>Don't trust, verify <span class="faq-arrow">&#x25BC;</span></div>
      <div class="faq-a">You don't need this site to claim. Every withdrawal can be done directly on Etherscan: go to the contract, click "Write Contract", connect your wallet, call the withdraw function. We simply facilitate the crafting of withdrawal transactions on your behalf — each contract's address and function is shown in the claim details. Our code is <a href="https://github.com/q84c6tsm95-create/forgotten-eth" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">open source</a> for anyone to audit. Know a contract we're missing? <a href="https://github.com/q84c6tsm95-create/forgotten-eth/issues" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">Open an issue</a>.</div>
    </div>
    </div>
  </div>

</div>

<footer class="site-footer" style="text-align:center;padding:16px 0 20px;margin-top:12px">
  <p style="margin-bottom:8px;display:flex;justify-content:center;gap:24px;align-items:center">
    <a href="https://github.com/q84c6tsm95-create/forgotten-eth" target="_blank" rel="noopener noreferrer" title="GitHub" style="color:var(--text2)"><svg width="29" height="29" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg></a>
    <a href="https://x.com/3pa15" target="_blank" rel="noopener noreferrer" title="X/Twitter" style="color:var(--text2)"><svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
    <a href="https://t.me/forgottenETH_bot" target="_blank" rel="noopener noreferrer" title="Telegram" style="color:var(--text2)"><svg width="29" height="29" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></a>
  </p>
  <p style="font-size:13px;color:var(--text2);opacity:0.7">made with <svg width="14" height="18" viewBox="0 0 14 18" style="vertical-align:middle;margin:0 3px" aria-label="Madotsuki"><rect x="4" y="0" width="6" height="2" fill="#5c3a1e"/><rect x="3" y="2" width="8" height="2" fill="#5c3a1e"/><rect x="2" y="2" width="1" height="6" fill="#5c3a1e"/><rect x="11" y="2" width="1" height="6" fill="#5c3a1e"/><rect x="3" y="4" width="8" height="2" fill="#f0c8a0"/><rect x="4" y="4" width="2" height="1" fill="#2a2018"/><rect x="8" y="4" width="2" height="1" fill="#2a2018"/><rect x="3" y="6" width="8" height="2" fill="#f0c8a0"/><rect x="3" y="8" width="8" height="5" fill="#c84b6b"/><rect x="5" y="9" width="1" height="2" fill="#f0c8a0"/><rect x="8" y="9" width="1" height="2" fill="#f0c8a0"/><rect x="6" y="9" width="2" height="3" fill="#87ceeb"/><rect x="3" y="13" width="3" height="3" fill="#c84b6b"/><rect x="8" y="13" width="3" height="3" fill="#c84b6b"/><rect x="3" y="16" width="3" height="2" fill="#5c3a1e"/><rect x="8" y="16" width="3" height="2" fill="#5c3a1e"/></svg> by <a href="https://t.me/syLKf" target="_blank" rel="noopener noreferrer" style="color:var(--text);text-decoration:none;font-weight:700">aaaaaaaaaaway</a></p>
  <p style="margin-top:4px;font-size:11px;color:var(--text2);opacity:0.7"><a href="https://etherscan.io/address/0xAE7d7C366F7Ebc2b58E17D0Fb3Aa9C870ea77891" target="_blank" rel="noopener noreferrer" style="color:var(--text2);text-decoration:none;font-family:var(--font-mono)">forgotteneth.eth</a></p>
</footer>

<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": title,
  "description": descShort,
  "url": `https://forgotteneth.com/${slug}`,
  "mainEntity": {
    "@type": "SoftwareApplication",
    "name": info.name,
    "applicationCategory": "FinanceApplication",
    "operatingSystem": "Ethereum",
  }
})}
</script>
<script id="tvl-data" type="application/json">${tvlJson}</script>
<script id="act-data" type="application/json">${activityJson}</script>
<script src="/protocol.js"></script>
</body>
</html>`;
}

export default async function handler(req, res) {
  // Error paths here serve HTML (SSR, not JSON) so we can't reuse the
  // check.js errResp closure. Set no-store inline before each 4xx so
  // Cloudflare doesn't edge-cache error HTML. See check.js errResp
  // comment for the 2026-04-07 incident background.
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireCloudflare(req, res)) return;

  const slug = req.query.slug;
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(400).json({ error: 'Invalid slug' });
  }

  // Slug-to-key aliases for cleaner URLs
  const SLUG_ALIASES = { 'ens': 'ens_old' };
  let key = slug.replace(/-/g, '_');
  if (SLUG_ALIASES[key]) key = SLUG_ALIASES[key];
  const info = loadProtocolInfo();
  const protocol = info[key];
  if (!protocol) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send('<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Not Found — Forgotten ETH</title><style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#12111a;color:#d4d0de;text-align:center}a{color:#7ec8be}</style></head><body><div><h1>Protocol not found</h1><p style="margin-top:12px"><a href="/">Back to Forgotten ETH</a></p></div></body></html>');
  }

  const meta = loadMeta(key);
  if (!meta) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send('<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Not Found — Forgotten ETH</title><style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#12111a;color:#d4d0de;text-align:center}a{color:#7ec8be}</style></head><body><div><h1>Protocol data not found</h1><p style="margin-top:12px"><a href="/">Back to Forgotten ETH</a></p></div></body></html>');
  }

  const html = htmlCache[key] || (htmlCache[key] = renderPage(slug, key, protocol, meta));

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res.status(200).send(html);
}
