import { readFileSync } from 'fs';
import { join } from 'path';

let protocolInfo = null;
const metaCache = {};

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
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 784 1277'><polygon fill='%23343434' points='392.07,0 383.5,29.11 383.5,873.74 392.07,882.29 784.13,650.54'/><polygon fill='%238C8C8C' points='392.07,0 0,650.54 392.07,882.29 392.07,472.33'/><polygon fill='%233C3C3B' points='392.07,956.52 387.24,962.41 387.24,1263.28 392.07,1277.38 784.37,724.89'/><polygon fill='%238C8C8C' points='392.07,1277.38 392.07,956.52 0,724.89'/><polygon fill='%23141414' points='392.07,882.29 784.13,650.54 392.07,472.33'/><polygon fill='%23393939' points='0,650.54 392.07,882.29 392.07,472.33'/></svg>">
<title>${esc(title)}</title>
<meta name="description" content="${esc(descShort)}">
<meta property="og:title" content="${esc(info.name)} - ${fmtEth(meta.total_eth)} ETH Unclaimed">
<meta property="og:description" content="${esc(descShort)}">
<meta property="og:type" content="website">
<meta property="og:image" content="https://forgotteneth.com/og-image.png">
<link rel="canonical" href="https://forgotteneth.com/${slug}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(info.name)} - ${fmtEth(meta.total_eth)} ETH Unclaimed">
<meta name="twitter:description" content="${esc(descShort)}">
<meta name="twitter:image" content="https://forgotteneth.com/og-image.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
<script defer src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js" integrity="sha384-vsrfeLOOY6KuIYKDlmVH5UiBmgIdB1oEf7p01YgWHuqmOHfZr374+odEv96n9tNC" crossorigin="anonymous"></script>
<style>
  :root {
    --bg: #fdfcfa; --bg2: #f6f4f0; --bg3: #edeae4;
    --border: #ddd8d0; --border-strong: #c5bfb6;
    --text: #1c1917; --text2: #78716c;
    --accent: #7c3aed; --accent2: #6d28d9; --accent-text: #6d28d9; --accent-glow: rgba(124, 58, 237, 0.15);
    --green: #16a34a; --green-glow: transparent;
    --gold: #b45309; --gold-glow: rgba(180, 83, 9, 0.3);
    --red: #dc2626; --yellow: #ca8a04; --orange: #c2410c;
    --glass: #f6f4f0; --glass-border: #ddd8d0;
    --radius: 8px; --radius-sm: 4px;
    --connect-bg: rgba(124, 58, 237, 0.05); --connect-border: rgba(124, 58, 237, 0.15);
    --font-body: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  }
  [data-theme="dark"] {
    --bg: #0f0e13; --bg2: #1a1820; --bg3: #24222b;
    --border: #2e2b38; --border-strong: #3e3a4b;
    --text: #e8e4f0; --text2: #9590a6;
    --accent: #a78bfa; --accent2: #c4b5fd; --accent-text: #a78bfa; --accent-glow: rgba(167, 139, 250, 0.15);
    --green: #34d399; --green-glow: transparent;
    --gold: #fbbf24; --gold-glow: rgba(251, 191, 36, 0.4);
    --red: #f87171; --yellow: #fbbf24; --orange: #fb923c;
    --glass: #1a1820; --glass-border: #2e2b38;
    --connect-bg: rgba(167, 139, 250, 0.04); --connect-border: rgba(167, 139, 250, 0.12);
  }
  [data-theme="dark"] a:hover { color: #c4b5fd; }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--font-body); background: var(--bg); color: var(--text); line-height: 1.6; min-height: 100vh; }
  a { color: var(--accent-text); text-decoration: underline; }
  a:hover { color: #5b21b6; }
  .container { max-width: 1400px; margin: 0 auto; padding: 0 24px 32px; }

  /* Header */
  .header { padding: 36px 0 28px; border-bottom: 1px solid var(--border); text-align: center; }
  .header h1, .header .site-name { font-family: var(--font-mono); font-size: 32px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; }
  .header h1 a, .header .site-name a { color: inherit; text-decoration: none; }
  .header .subtitle { font-size: 14px; color: var(--text2); font-weight: 400; margin-bottom: 12px; }
  .header-nav { display: flex; align-items: center; justify-content: center; gap: 0; margin-top: 16px; font-size: 13px; font-family: var(--font-mono); }
  .header-nav a { color: var(--text2); text-decoration: none; transition: color 150ms ease; }
  .header-nav a:hover { color: var(--accent); }
  .nav-sep { color: var(--border-strong); margin: 0 16px; user-select: none; }
  #themeToggle { background: none; border: none; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; color: var(--text2); transition: color 150ms ease; padding: 0; line-height: 1; font-family: var(--font-mono); }
  #themeToggle:hover { color: var(--accent); }

  /* Protocol content */
  .project-desc { color: var(--text2); font-size: 13px; line-height: 1.6; margin-bottom: 16px; }
  .color-bar { height: 4px; width: 48px; border-radius: 2px; margin-bottom: 16px; }
  .protocol-hero { padding: 28px 0 0; }
  .protocol-hero h2 { font-size: 24px; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.3px; }

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
  .connect-section { background: var(--connect-bg); border: 1px solid var(--connect-border); border-radius: 12px; padding: 28px 24px; margin: 32px 0; font-size: 13px; text-align: center; }
  .btn { padding: 7px 14px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius); cursor: pointer; font-size: 12px; font-weight: 600; white-space: nowrap; text-decoration: none; display: inline-block; font-family: inherit; }
  .btn:hover { background: #5b21b6; color: #fff; text-decoration: none; }
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
  .faq-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text2); font-weight: 700; margin-bottom: 16px; text-align: center; }
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
  .wallet-btn { padding: 8px 18px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius); cursor: pointer; font-size: 13px; font-weight: 600; font-family: var(--font-body); }
  .wallet-btn:hover { background: #5b21b6; }
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

  @media (max-width: 768px) {
    .charts { grid-template-columns: 1fr; }
    .cards { grid-template-columns: repeat(2, 1fr); }
    .check-form { flex-direction: column; }
    .chart-wrap { height: 250px; }
    .connect-section { padding: 20px 16px; }
  }
</style>
</head>
<body data-protocol-key="${key}">
<div class="container">

  <!-- Header — same as main page -->
  <div class="header">
    <div class="header-left">
      <div class="site-name"><a href="/">Forgotten &#926;TH</a></div>
      <p class="subtitle">Recover ETH stuck in old smart contracts</p>
      <nav class="header-nav">
        <a href="/">Home</a>
        <span class="nav-sep">&middot;</span>
        <a href="#faq">FAQ</a>
        <span class="nav-sep">&middot;</span>
        <button id="themeToggle" title="Toggle dark/light mode" aria-label="Toggle dark/light mode"></button>
        <span class="nav-sep">&middot;</span>
        <a href="https://github.com/q84c6tsm95-create/forgotten-eth" target="_blank" title="View on GitHub" aria-label="GitHub"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg></a>
      </nav>
    </div>
  </div>

  <!-- Address check (first — primary action) -->
  <div class="connect-section">
    <div style="display:flex;align-items:center;justify-content:center;gap:20px;flex-wrap:wrap">
      <div class="wallet-area">
        <span class="wallet-addr" id="walletAddr"></span>
        <button class="wallet-btn" id="walletBtn" style="padding:8px 18px;font-size:14px">Connect Wallet</button>
      </div>
      <span style="color:var(--text2);font-size:13px">or</span>
      <div style="position:relative;width:100%;max-width:420px">
        <textarea id="checkAddr" placeholder="0x... or vitalik.eth (one per line for multiple)" rows="1" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font-mono);font-size:13px;outline:none;background:var(--bg);color:var(--text);resize:vertical;min-height:36px;line-height:1.4;field-sizing:content"></textarea>
      </div>
      <button class="btn" id="checkBtn" onclick="checkAddress()" style="padding:8px 18px;font-size:14px">Check</button>
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
      <div class="faq-a">Paste any address or connect your wallet. We check 110 defunct contracts for unclaimed balances. If found, click Withdraw — the transaction goes directly from the original contract to your wallet. We never have custody of your funds.</div>
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
      <div class="faq-a">110 contracts across defunct DEXes (EtherDelta, IDEX v1, Token.Store), dividend tokens (PoWH3D, Fomo3D), NFT auctions (MoonCatRescue, DADA), bounty platforms, ICO escrows, ENS old registrar deeds, and wrapped ETH variants.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q" data-faq-toggle>Don't trust, verify <span class="faq-arrow">&#x25BC;</span></div>
      <div class="faq-a">You don't need this site to claim. Every withdrawal can be done directly on Etherscan: go to the contract, click "Write Contract", connect your wallet, call the withdraw function. We simply facilitate the crafting of withdrawal transactions on your behalf — each contract's address and function is shown in the claim details. Our code is <a href="https://github.com/q84c6tsm95-create/forgotten-eth" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">open source</a> for anyone to audit.</div>
    </div>
    </div>
  </div>

</div>

<footer class="site-footer">
  <p class="footer-credit">made with <span style="color:#e11d48;font-size:16px;vertical-align:middle">&#10084;</span> by aaaaaaaaaaway</p>
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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const slug = req.query.slug;
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return res.status(400).json({ error: 'Invalid slug' });

  // Slug-to-key aliases for cleaner URLs
  const SLUG_ALIASES = { 'ens': 'ens_old' };
  let key = slug.replace(/-/g, '_');
  if (SLUG_ALIASES[key]) key = SLUG_ALIASES[key];
  const info = loadProtocolInfo();
  const protocol = info[key];
  if (!protocol) return res.status(404).send('Protocol not found');

  const meta = loadMeta(key);
  if (!meta) return res.status(404).send('Protocol data not found');

  const html = renderPage(slug, key, protocol, meta);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(200).send(html);
}
