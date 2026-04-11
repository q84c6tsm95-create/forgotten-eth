// Clear hash on load so refresh always starts at top
if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);

// EIP-6963: discover all installed wallet providers (deduped by rdns)
window._eip6963Providers = [];
window._eip6963Seen = new Set();
window.addEventListener('eip6963:announceProvider', function(e) {
  if (e.detail && e.detail.provider && e.detail.info) {
    var rdns = e.detail.info.rdns || e.detail.info.name;
    if (!window._eip6963Seen.has(rdns)) {
      window._eip6963Seen.add(rdns);
      window._eip6963Providers.push(e.detail);
    }
  }
});
if (window.dispatchEvent) {
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

// ─── Counting animation for hero numbers ───
function animateCount(elId, target, childSelector) {
  var el = document.getElementById(elId);
  if (!el) return;
  var node = childSelector ? el.querySelector(childSelector) : el;
  if (!node) { el.textContent = target.toLocaleString('en'); return; }
  var duration = 1200;
  var start = null;
  var startVal = 0;
  function step(ts) {
    if (!start) start = ts;
    var progress = Math.min((ts - start) / duration, 1);
    // Ease out cubic
    var ease = 1 - Math.pow(1 - progress, 3);
    var current = Math.round(startVal + (target - startVal) * ease);
    node.textContent = current.toLocaleString('en');
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─── Inline error helper (replaces alert()) ───
function showInlineError(elementId, message, duration) {
  var el = document.getElementById(elementId);
  if (!el) { console.warn('showInlineError: element not found:', elementId); return; }
  el.textContent = message;
  el.style.display = 'block';
  if (duration !== 0) {
    setTimeout(function() { el.style.display = 'none'; el.textContent = ''; }, duration || 6000);
  }
}

// ─── Spinner helper (single source of truth) ───
function spinnerHTML(msg) {
  return '<div style="text-align:center;padding:20px;color:var(--text2)"><div class="spinner" style="display:inline-block;margin-bottom:8px"></div><div' + (msg && msg.indexOf('Checking') >= 0 ? ' id="scanProgress"' : '') + '>' + msg + '</div></div>';
}
var _botCTA = '<div style="text-align:center;margin-top:24px;padding:18px 20px;background:var(--bg2);border:1px solid var(--accent);border-radius:var(--radius);font-size:15px;color:var(--text);display:inline-flex;align-items:center;gap:12px;justify-content:center;font-weight:500"><svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent)" style="flex-shrink:0"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg><span>Get alerts when new contracts are added — <a href="https://t.me/forgotteneth_bot" target="_blank" rel="noopener noreferrer" style="color:var(--accent);font-weight:700;text-decoration:none">@forgotteneth_bot</a></span></div>';
// Minimum spinner display time so Madotsuki is visible
var _scanStartTime = 0;
function scanStart() { _scanStartTime = Date.now(); }
async function scanMinDelay() { var elapsed = Date.now() - _scanStartTime; if (elapsed < 2000) await new Promise(function(r) { setTimeout(r, 2000 - elapsed); }); }
async function scanProgressDelay() { var elapsed = Date.now() - _scanStartTime; if (elapsed < 1500) await new Promise(function(r) { setTimeout(r, 1500 - elapsed); }); }

// Keystore file wallet — decrypts UTC/JSON keystore files (MyEtherWallet style)
var _keystoreWallet = null;

function _showWalletPicker(providers) {
  return new Promise(function(resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    var modal = document.createElement('div');
    modal.className = 'modal-box';

    modal.innerHTML = '<h3 class="modal-title">Connect Wallet</h3><p class="modal-subtitle">Choose how to connect</p>';

    // Section: Browser wallets
    if (providers.length > 0) {
      var label = document.createElement('div');
      label.className = 'modal-label';
      label.textContent = 'Installed Wallets';
      modal.appendChild(label);

      providers.forEach(function(p) {
        modal.appendChild(_makeWalletBtn(
          p.info.icon,
          p.info.name,
          'Detected',
          function() { document.body.removeChild(overlay); resolve({ type: 'provider', provider: p.provider }); }
        ));
      });
    }

    // If no providers detected, show MetaMask install link
    if (providers.length === 0) {
      var label2 = document.createElement('div');
      label2.className = 'modal-label';
      label2.textContent = 'No wallet detected. Install one to continue.';
      modal.appendChild(label2);
      modal.appendChild(_makeWalletBtn(
        '/metamask.svg',
        'MetaMask',
        'Install',
        function() { window.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer'); }
      ));
      modal.appendChild(_makeWalletBtn(
        '/rabby.svg',
        'Rabby Wallet',
        'Install',
        function() { window.open('https://rabby.io/', '_blank', 'noopener,noreferrer'); }
      ));
    }

    // Section: Keystore file
    var sep = document.createElement('div');
    sep.className = 'modal-label mt';
    sep.textContent = 'Keystore / JSON File';
    modal.appendChild(sep);

    modal.appendChild(_makeWalletBtn(
      '/mew.png',
      'Keystore File (UTC/JSON)',
      'MyEtherWallet, Geth, Mist',
      function() { document.body.removeChild(overlay); resolve({ type: 'keystore' }); }
    ));

    // Cancel
    var cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.className = 'modal-cancel';
    cancel.addEventListener('click', function() { document.body.removeChild(overlay); resolve(null); });
    modal.appendChild(cancel);

    overlay.appendChild(modal);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) { document.body.removeChild(overlay); resolve(null); } });
    document.body.appendChild(overlay);
  });
}

function _makeWalletBtn(icon, name, subtitle, onclick) {
  var btn = document.createElement('button');
  btn.className = 'wallet-option';
  var img = document.createElement('img');
  img.src = icon;
  img.onerror = function() { this.style.display = 'none'; };
  btn.appendChild(img);
  var text = document.createElement('div');
  var _e = function(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
  text.innerHTML = '<div class="wo-name">' + _e(name) + '</div>' +
    (subtitle ? '<div class="wo-sub">' + _e(subtitle) + '</div>' : '');
  btn.appendChild(text);
  btn.addEventListener('click', onclick);
  return btn;
}

async function _handleKeystoreConnect() {
  return new Promise(function(resolve, reject) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    var modal = document.createElement('div');
    modal.className = 'modal-box wide';
    modal.innerHTML = '<h3 style="font-size:16px;font-weight:700;margin-bottom:4px;text-align:center">Open Keystore File</h3>' +
      '<p style="font-size:12px;color:var(--text2);text-align:center;margin-bottom:16px">Select your UTC/JSON keystore file and enter the password to decrypt it locally.</p>' +
      '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:11px;color:var(--text2);line-height:1.6">' +
      '<div style="margin-bottom:4px;font-weight:700;color:var(--green)">Your keys stay safe:</div>' +
      '<div>&#8226; Decryption happens entirely in your browser</div>' +
      '<div>&#8226; No file or password is uploaded to any server</div>' +
      '<div>&#8226; No data is logged or stored</div>' +
      '<div>&#8226; <a href="https://github.com/q84c6tsm95-create/forgotten-eth/blob/main/public/app.js#L123-L190" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:var(--accent-text)">Verify the source code</a></div>' +
      '</div>' +
      '<div style="margin-bottom:12px"><label style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;font-weight:700;display:block;margin-bottom:4px">Keystore File</label>' +
      '<input type="file" id="keystoreFile" accept=".json,.utc,application/json" style="width:100%;padding:8px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:inherit;font-size:12px"></div>' +
      '<div style="margin-bottom:16px"><label style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;font-weight:700;display:block;margin-bottom:4px">Password</label>' +
      '<input type="password" id="keystorePass" placeholder="Enter keystore password" style="width:100%;padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:monospace;font-size:13px;outline:none"></div>' +
      '<div id="keystoreStatus" style="font-size:12px;color:var(--text2);text-align:center;margin-bottom:12px"></div>' +
      '<div style="display:flex;gap:8px;justify-content:center">' +
      '<button id="keystoreUnlock" class="btn" style="padding:10px 24px;font-size:13px">Unlock</button>' +
      '<button id="keystoreCancel" class="btn ghost" style="padding:10px 24px;font-size:13px">Cancel</button></div>';
    overlay.appendChild(modal);

    overlay.addEventListener('click', function(e) { if (e.target === overlay) { document.body.removeChild(overlay); resolve(null); } });
    document.body.appendChild(overlay);

    document.getElementById('keystoreCancel').addEventListener('click', function() {
      document.body.removeChild(overlay);
      resolve(null);
    });

    document.getElementById('keystoreUnlock').addEventListener('click', async function() {
      var fileInput = document.getElementById('keystoreFile');
      var passInput = document.getElementById('keystorePass');
      var statusEl = document.getElementById('keystoreStatus');

      if (!fileInput.files || !fileInput.files[0]) { statusEl.textContent = 'Please select a file.'; statusEl.style.color = 'var(--red)'; return; }
      if (fileInput.files[0].size > 1024 * 1024) { statusEl.textContent = 'File too large (max 1MB).'; statusEl.style.color = 'var(--red)'; return; }
      if (!passInput.value) { statusEl.textContent = 'Please enter the password.'; statusEl.style.color = 'var(--red)'; return; }

      statusEl.textContent = 'Decrypting... (this may take a few seconds)';
      statusEl.style.color = 'var(--text2)';
      this.disabled = true;
      this.textContent = 'Decrypting...';

      try {
        var text = await fileInput.files[0].text();
        var wallet = await ethers.Wallet.fromEncryptedJson(text, passInput.value);
        _keystoreWallet = wallet;
        document.body.removeChild(overlay);
        resolve(wallet);
      } catch (e) {
        this.disabled = false;
        this.textContent = 'Unlock';
        statusEl.textContent = (e.message && (e.message.includes('invalid') || e.message.includes('password'))) ? 'Wrong password. Try again.' : 'Could not decrypt file. Check file format and password.';
        statusEl.style.color = 'var(--red)';
      }
    });

    // Enter key support
    document.getElementById('keystorePass').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('keystoreUnlock').click();
    });
  });
}

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
const PUBLIC_RPCS = [
  'https://ethereum.publicnode.com',
  'https://eth.llamarpc.com',
  'https://1rpc.io/eth',
];
let currentRpcIndex = 0;
function getPublicRPC() { return PUBLIC_RPCS[currentRpcIndex]; }
function rotateRPC() { currentRpcIndex = (currentRpcIndex + 1) % PUBLIC_RPCS.length; return getPublicRPC(); }
function getPublicProvider() { return new ethers.JsonRpcProvider(getPublicRPC()); }
const PUBLIC_RPC = PUBLIC_RPCS[0]; // backward compat

// Analytics helper — fire-and-forget, never blocks UI
function logEvent(type, data) {
  try {
    fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, ...data }) }).catch(() => {});
  } catch(e) {}
}

// Report uncaught JS errors (invisible without this)
window.onerror = function(msg, src, line, col) {
  if (!src || src.includes('vercel') || src.includes('insights') || src.includes('inject') || src.includes('extension') || src === '') return;
  if (String(msg).includes('Script error')) return;
  logEvent('frontend_error', { extra: { error: String(msg).slice(0, 200), source: (src || '').split('/').pop(), line: line, col: col } });
};
window.onunhandledrejection = function(e) {
  var msg = String(e.reason?.message || e.reason || '');
  if (msg.includes('StorageArea') || msg.includes('vercel') || msg.includes('sseError') || msg.includes('tronlink') || msg.includes('MetaMask') || msg.includes('Origin not allowed') || msg.includes('JSON-RPC error') || msg.includes('network changed') || msg.includes('rainbowkit') || msg.includes('Talisman') || msg.includes('__firefox__') || msg.includes('user rejected') || msg.includes('disconnected from all chains')) return;
  logEvent('frontend_error', { extra: { error: msg.slice(0, 200), type: 'promise' } });
};

var _checkCache = {};
async function fetchCheck(address) {
  const cacheKey = address.toLowerCase();
  const cached = _checkCache[cacheKey];
  if (cached && Date.now() - cached.ts < 60000) {
    return { ok: true, status: 200, data: cached.data };
  }
  const resp = await fetch(`/api/check?address=${encodeURIComponent(address)}`);
  if (resp.ok) {
    const data = await resp.json();
    _checkCache[cacheKey] = { data, ts: Date.now() };
    return { ok: true, status: 200, data };
  }
  return { ok: false, status: resp.status, data: null };
}

// ─── Test/Simulation Mode ───
// When ON: claim buttons simulate via Tenderly instead of sending real txs.
// Everything else (wallet connect, balance check, UI) works normally.
// Activate ONLY via localStorage developer flag on localhost.
var TEST_MODE = false;
try { TEST_MODE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.')) && localStorage.getItem('FORGOTTEN_ETH_DEV') === '1'; } catch(e) {}
if (TEST_MODE) console.log('%c[TEST MODE] Claim buttons simulate via Tenderly', 'color:#d946ef;font-weight:bold;font-size:14px');
var _testImpersonateAddr = null;

// Simulate a transaction via Tenderly (local-only API). Returns { success, error?, ethReceived?, balanceVerified? }
// expectedEth: if provided, verifies ETH arrives at recipient (5% tolerance for fees)
// recipient: address that should receive ETH (defaults to from)
async function testSimulateTx(fromAddr, toAddr, calldata, expectedEth, recipient) {
  try {
    const body = { from: fromAddr, to: toAddr, data: calldata };
    if (expectedEth !== undefined) body.expectedEth = expectedEth;
    if (recipient) body.recipient = recipient;
    const resp = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await resp.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Format simulation result with balance verification details
function _fmtSimResult(result, label) {
  if (!result.success) return '<span style="color:#ef4444">Simulation reverted</span>: ' + esc((result.error || '').slice(0, 150));
  var parts = ['<span style="color:var(--green)">Simulation passed</span> — ' + label];
  if (result.ethReceived > 0) {
    parts.push('<br><span style="font-size:11px;color:var(--text)">ETH received: ' + fmtEth(result.ethReceived) + ' ETH</span>');
  }
  if (result.balanceVerified === true) {
    parts.push('<span style="font-size:11px;color:var(--green)"> · balance verified</span>');
  } else if (result.balanceVerified === false) {
    parts.push('<span style="font-size:11px;color:#ef4444"> · balance mismatch! Expected ~' + fmtEth(result.expectedEth) + ' ETH, got ' + fmtEth(result.ethReceived) + '</span>');
  }
  if (result.assetChanges && result.assetChanges.length > 0) {
    var transfers = result.assetChanges.filter(function(ac) { return ac.symbol === 'ETH' || !ac.symbol; });
    if (transfers.length > 0) {
      parts.push('<br><span style="font-size:10px;color:var(--text2)">Transfers: ' + transfers.map(function(t) { return (t.from || '?').slice(0,8) + '→' + (t.to || '?').slice(0,8) + ' ' + fmtEth(t.amount || 0) + ' ' + (t.symbol || 'ETH'); }).join(', ') + '</span>');
    }
  }
  return parts.join('');
}

// Show test mode toggle button on local/LAN
(function() {
  var isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.');
  if (!isLocal) return;
  var btn = document.getElementById('testModeBtn');
  var sep = document.getElementById('testModeSep');
  if (!btn) return;
  btn.style.display = '';
  if (sep) sep.style.display = '';
  btn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:12px;color:var(--text2);font-family:var(--font-mono);padding:0;transition:color 0.15s;';
  btn.textContent = TEST_MODE ? 'Test: ON' : 'Test: OFF';
  if (TEST_MODE) btn.style.color = 'var(--accent)';
  btn.addEventListener('click', function() {
    if (TEST_MODE) {
      localStorage.removeItem('FORGOTTEN_ETH_DEV');
    } else {
      localStorage.setItem('FORGOTTEN_ETH_DEV', '1');
    }
    window.location.reload();
  });
})();

// ETH price from CoinGecko (cached 5 min)
let _ethPrice = null;
let _ethPriceExpiry = 0;
fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
  .then(r => r.json()).then(d => { _ethPrice = d.ethereum.usd; _ethPriceExpiry = Date.now() + 300000; }).catch(() => {});
async function getEthPrice() {
  if (_ethPrice && Date.now() < _ethPriceExpiry) return _ethPrice;
  try {
    const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const data = await resp.json();
    _ethPrice = data.ethereum.usd;
    _ethPriceExpiry = Date.now() + 300000;
  } catch (e) { _ethPrice = _ethPrice || 0; }
  return _ethPrice;
}
function fmtUsd(v) { return '$' + parseFloat(v).toLocaleString('en', {minimumFractionDigits: 0, maximumFractionDigits: 0}); }

// Donation flow
const DONATION_ADDRESS = '0xAE7d7C366F7Ebc2b58E17D0Fb3Aa9C870ea77891';

async function sendDonation(amountWei) {
  if (!walletSigner) { throw new Error('Please connect your wallet first.'); }

  if (!ethers.isAddress(DONATION_ADDRESS)) { throw new Error('Donation address not configured'); }
  if (!await checkNetwork()) { throw new Error('Please switch to Ethereum Mainnet'); }

  var tx = await walletSigner.sendTransaction({ to: DONATION_ADDRESS, value: amountWei });
  window.va?.track?.('donation_sent', { amount_eth: ethers.formatEther(amountWei), tx_hash: tx.hash });
  logEvent('claim_confirmed', { address: walletAddress, contract: 'donation', amount_eth: parseFloat(ethers.formatEther(amountWei)), tx_hash: tx.hash });
}

let _lastClaimEth = 0;

function renderDonationCard(claimedEth) {
  _lastClaimEth = claimedEth;
  if (claimedEth < 0.1) return '';

  var defaultPct = 2;
  var defaultAmt = (claimedEth * defaultPct / 100).toFixed(2);
  var btnLabel = 'Donate ' + defaultAmt + ' ETH';
  if (_ethPrice) btnLabel += ' (' + fmtUsd(parseFloat(defaultAmt) * _ethPrice) + ')';

  function pill(pct, isActive) {
    return '<button class="donation-pct-btn' + (isActive ? ' active' : '') + '" data-action="donation-pct" data-pct="' + pct + '">' + pct + '%</button>';
  }

  var usdHint = _ethPrice ? ' <span class="donation-custom-usd" id="donationUsd">(' + fmtUsd(parseFloat(defaultAmt) * _ethPrice) + ')</span>' : '';

  return '<div id="donationCardWrap" style="display:none"><div class="donation-card" id="donationCard" data-claim-eth="' + claimedEth + '">' +
    '<div class="donation-copy">If you found this useful, consider a donation.</div>' +
    '<div class="donation-pct-row">' + pill(1, false) + pill(2, true) + pill(4, false) + pill(6, false) + '</div>' +
    '<div class="donation-custom"><input type="number" id="donationAmt" class="donation-custom-input" value="' + defaultAmt + '" step="0.001" min="0" data-claim-eth="' + claimedEth + '"><span class="donation-custom-label">ETH</span>' + usdHint + '</div>' +
    '<div><button data-action="donate-confirm" class="donation-confirm-btn">' + btnLabel + '</button></div>' +
    '<div><button data-action="donation-skip" class="donation-skip">skip</button></div>' +
    '<div class="donation-error"></div>' +
  '</div></div>';
}

// Show donation card after a delay (called after claim success renders)
function showDonationCardDelayed() {
  var wrap = document.getElementById('donationCardWrap');
  if (wrap) setTimeout(function() { wrap.style.display = ''; }, 1650);
}

// ── Full-screen donation modal ──
var _donationModalShown = false;
var _donationModalSuppressed = false;
var _lastClaimTxHash = null; // Track last claim tx for donation modal link

function showDonationModal(totalEth) {
  console.log('[Donation] showDonationModal called:', totalEth, 'ETH | shown:', _donationModalShown, '| suppressed:', _donationModalSuppressed);
  if (_donationModalShown) { logEvent('found', { extra: { donation_modal: 'skipped_already_shown', eth: totalEth } }); return; }
  if (_donationModalSuppressed) { logEvent('found', { extra: { donation_modal: 'skipped_suppressed', eth: totalEth } }); return; }
  if (totalEth < 0.1) { console.log('[Donation] Below threshold:', totalEth); return; }
  _donationModalShown = true;
  console.log('[Donation] Showing modal for', totalEth, 'ETH');
  logEvent('found', { extra: { donation_modal: 'shown', eth: totalEth } });

  // Try to find the last claim tx hash from the most recently rendered Etherscan link
  if (!_lastClaimTxHash) {
    var txLinks = document.querySelectorAll('.claim-recovered-tx a[href*="etherscan.io/tx/"]');
    if (txLinks.length > 0) {
      var href = txLinks[txLinks.length - 1].href;
      var match = href.match(/\/tx\/(0x[0-9a-fA-F]+)/);
      if (match) _lastClaimTxHash = match[1];
    }
  }

  // Smart rounding: >= 0.01 → 2 decimals, >= 0.001 → 3, else 4
  function fmtDonation(v) {
    if (v >= 0.01) return v.toFixed(2);
    if (v >= 0.001) return v.toFixed(3);
    return v.toFixed(4);
  }

  var defaultPct = 2;
  var defaultAmt = fmtDonation(totalEth * defaultPct / 100);
  var usdDonate = _ethPrice ? ' (' + fmtUsd(parseFloat(defaultAmt) * _ethPrice) + ')' : '';

  var pillBase = 'border-radius:6px;padding:8px 20px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;';
  var pillOff = pillBase + 'border:1px solid var(--border);background:transparent;color:var(--text2);';
  var pillOn = pillBase + 'border:1px solid var(--accent);background:var(--accent);color:#fff;';

  function mkPill(pct, isActive) {
    var b = document.createElement('button');
    b.dataset.pct = pct;
    b.textContent = pct + '%';
    b.style.cssText = isActive ? pillOn : pillOff;
    return b;
  }

  // Pixel dissolve reveal (RPG Maker style, same as dream/wake transition)
  var canvas = document.createElement('canvas');
  var cw = window.innerWidth, ch = window.innerHeight;
  canvas.width = cw; canvas.height = ch;
  canvas.style.cssText = 'position:fixed;inset:0;z-index:99998;pointer-events:none;image-rendering:pixelated;';
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  ctx.fillStyle = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.5)';
  var blockSize = 48;
  var cols = Math.ceil(cw / blockSize), rows = Math.ceil(ch / blockSize);
  var blocks = [];
  for (var by = 0; by < rows; by++) for (var bx = 0; bx < cols; bx++) blocks.push([bx, by]);
  for (var bi = blocks.length - 1; bi > 0; bi--) { var bj = Math.floor(Math.random() * (bi + 1)); var bt = blocks[bi]; blocks[bi] = blocks[bj]; blocks[bj] = bt; }
  var perFrame = Math.ceil(blocks.length / 68);
  var drawn = 0;
  var modalRevealed = false;

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'donationModal';
  overlay.style.cssText = 'opacity:0;z-index:99999;';

  var box = document.createElement('div');
  box.className = 'modal-box wide';
  box.style.cssText = 'max-width:480px;padding:28px 32px 24px;text-align:center;border:1px solid var(--border);border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.15);background:var(--bg);';

  // ── Top: recovered amount (golden/accent, flashy) + tx link ──
  var topRow = document.createElement('div');
  topRow.style.cssText = 'margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border);';
  var recoveredAmount = document.createElement('div');
  recoveredAmount.style.cssText = 'font-size:32px;font-weight:800;letter-spacing:-1px;line-height:1.2;background:linear-gradient(90deg, #b45309 0%, #d97706 20%, #fbbf24 50%, #d97706 80%, #b45309 100%);background-size:200% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 2s ease-in-out infinite;';
  var ethVal = fmtEth(totalEth.toString());
  recoveredAmount.textContent = ethVal + ' ETH';
  var recoveredSub = document.createElement('div');
  recoveredSub.style.cssText = 'font-size:12px;color:var(--text2);font-weight:500;margin-top:4px;letter-spacing:0.3px;';
  if (_lastClaimTxHash) {
    var subText = document.createTextNode('not forgotten anymore \u00B7 ');
    var txLink = document.createElement('a');
    txLink.href = etherscanTx(_lastClaimTxHash);
    txLink.target = '_blank';
    txLink.rel = 'noopener noreferrer';
    txLink.style.cssText = 'color:#3b82f6;text-decoration:none;letter-spacing:0;text-transform:none;transition:color 0.15s;';
    txLink.textContent = 'view tx \u2197';
    txLink.addEventListener('mouseenter', function() { txLink.style.color = '#60a5fa'; });
    txLink.addEventListener('mouseleave', function() { txLink.style.color = '#3b82f6'; });
    recoveredSub.appendChild(subText);
    recoveredSub.appendChild(txLink);
  } else {
    recoveredSub.textContent = 'not forgotten anymore';
  }
  topRow.appendChild(recoveredAmount);
  topRow.appendChild(recoveredSub);

  // ── Middle: donation prompt + ENS + controls (compact) ──
  var midRow = document.createElement('div');
  midRow.style.cssText = 'margin-bottom:16px;';
  var addrRow = document.createElement('div');
  addrRow.style.cssText = 'font-size:13px;color:var(--text2);margin-bottom:14px;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;';
  addrRow.title = 'Click to copy address';
  var supportText = document.createTextNode('Support ');
  var ensName = document.createElement('span');
  ensName.textContent = 'forgotteneth.eth';
  ensName.style.cssText = 'color:var(--accent-text);font-weight:600;font-family:var(--font-mono);transition:color 0.15s;';
  var copyIcon = document.createElement('span');
  copyIcon.style.cssText = 'opacity:0.5;display:inline-flex;transition:opacity 0.15s;';
  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  var rect = document.createElementNS(svgNS, 'rect');
  rect.setAttribute('x', '9'); rect.setAttribute('y', '9');
  rect.setAttribute('width', '13'); rect.setAttribute('height', '13');
  rect.setAttribute('rx', '2');
  var path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', 'M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1');
  svg.appendChild(rect);
  svg.appendChild(path);
  copyIcon.appendChild(svg);
  addrRow.appendChild(supportText);
  addrRow.appendChild(ensName);
  addrRow.appendChild(copyIcon);
  addrRow.addEventListener('mouseenter', function() { copyIcon.style.opacity = '1'; });
  addrRow.addEventListener('mouseleave', function() { copyIcon.style.opacity = '0.5'; });
  addrRow.addEventListener('click', function() {
    function onCopied() {
      ensName.textContent = 'copied!';
      ensName.style.color = 'var(--green)';
      copyIcon.style.opacity = '0';
      setTimeout(function() {
        ensName.textContent = 'forgotteneth.eth';
        ensName.style.color = 'var(--accent-text)';
        copyIcon.style.opacity = '0.5';
      }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(DONATION_ADDRESS).then(onCopied).catch(function() {
        // Fallback for non-HTTPS contexts
        var ta = document.createElement('textarea');
        ta.value = DONATION_ADDRESS;
        ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); onCopied(); } catch(e) {}
        document.body.removeChild(ta);
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = DONATION_ADDRESS;
      ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); onCopied(); } catch(e) {}
      document.body.removeChild(ta);
    }
  });

  var pctRow = document.createElement('div');
  pctRow.className = 'donation-pct-row';
  pctRow.style.cssText = 'display:inline-flex;gap:8px;border:none;overflow:visible;';
  pctRow.appendChild(mkPill(1, false));
  pctRow.appendChild(mkPill(2, true));
  pctRow.appendChild(mkPill(4, false));

  var customRow = document.createElement('div');
  customRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
  var amtInput = document.createElement('input');
  amtInput.type = 'number';
  amtInput.id = 'modalDonationAmt';
  amtInput.style.cssText = 'width:90px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-family:var(--font-mono);font-size:13px;font-weight:600;color:var(--text);text-align:right;outline:none;-moz-appearance:textfield;';
  amtInput.value = defaultAmt;
  amtInput.step = '0.001';
  amtInput.min = '0';
  amtInput.dataset.claimEth = totalEth;
  var ethLabel = document.createElement('span');
  ethLabel.style.cssText = 'font-size:13px;color:var(--text2);font-weight:600;';
  ethLabel.textContent = 'ETH';
  customRow.appendChild(amtInput);
  customRow.appendChild(ethLabel);
  if (_ethPrice) {
    var usdSpan = document.createElement('span');
    usdSpan.id = 'modalDonationUsd';
    usdSpan.style.cssText = 'font-size:11px;color:var(--text2);opacity:0.6;';
    usdSpan.textContent = usdDonate;
    customRow.appendChild(usdSpan);
  }

  var confirmWrap = document.createElement('div');
  var confirmBtn = document.createElement('button');
  confirmBtn.id = 'modalDonateBtn';
  confirmBtn.style.cssText = 'display:inline-block;padding:10px 28px;font-family:inherit;font-size:13px;font-weight:600;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;transition:all 0.15s;';
  confirmBtn.textContent = 'Donate ' + defaultAmt + ' ETH';
  confirmBtn.addEventListener('mouseenter', function() { confirmBtn.style.transform = 'translateY(-1px)'; confirmBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; });
  confirmBtn.addEventListener('mouseleave', function() { confirmBtn.style.transform = ''; confirmBtn.style.boxShadow = ''; });
  confirmWrap.appendChild(confirmBtn);

  var skipWrap = document.createElement('div');
  var skipBtn = document.createElement('button');
  skipBtn.id = 'modalSkipBtn';
  skipBtn.style.cssText = 'font-size:13px;color:var(--text2);cursor:pointer;border:none;background:none;padding:8px 16px;font-family:inherit;transition:color 0.15s;';
  skipBtn.textContent = 'skip';
  skipBtn.addEventListener('mouseenter', function() { skipBtn.style.color = 'var(--text)'; });
  skipBtn.addEventListener('mouseleave', function() { skipBtn.style.color = 'var(--text2)'; });
  skipWrap.appendChild(skipBtn);

  // ── Controls: pills + input on one row ──
  var controlsRow = document.createElement('div');
  controlsRow.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;';
  controlsRow.appendChild(pctRow);
  controlsRow.appendChild(customRow);
  // Remove bottom margins from children (handled by controlsRow)
  pctRow.style.marginBottom = '0';
  customRow.style.marginBottom = '0';

  midRow.appendChild(addrRow);
  midRow.appendChild(controlsRow);

  // ── Bottom: button + skip inline ──
  var bottomRow = document.createElement('div');
  bottomRow.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;';
  confirmWrap.style.marginBottom = '0';
  skipWrap.style.marginTop = '0';
  bottomRow.appendChild(confirmWrap);
  bottomRow.appendChild(skipWrap);

  var errEl = document.createElement('div');
  errEl.style.cssText = 'font-size:12px;color:var(--red);margin-top:6px;';

  var closeX = document.createElement('button');
  closeX.style.cssText = 'position:absolute;top:12px;right:14px;background:none;border:none;font-size:18px;color:var(--text2);cursor:pointer;padding:4px 8px;line-height:1;transition:color 0.15s;';
  closeX.textContent = '\u00D7';
  closeX.addEventListener('mouseenter', function() { closeX.style.color = 'var(--text)'; });
  closeX.addEventListener('mouseleave', function() { closeX.style.color = 'var(--text2)'; });
  closeX.addEventListener('click', function() {
    var suppress = dontShowCheck.checked;
    dismissModal(!suppress, 'close_x');
    if (suppress) _donationModalSuppressed = true;
  });
  box.style.position = 'relative';
  box.appendChild(closeX);
  box.appendChild(topRow);
  box.appendChild(midRow);
  box.appendChild(bottomRow);
  var dontShowWrap = document.createElement('div');
  dontShowWrap.style.cssText = 'margin-top:12px;display:flex;align-items:center;justify-content:center;gap:6px;';
  var dontShowCheck = document.createElement('input');
  dontShowCheck.type = 'checkbox';
  dontShowCheck.id = 'dontShowDonation';
  dontShowCheck.style.cssText = 'margin:0;accent-color:var(--accent);';
  var dontShowLabel = document.createElement('label');
  dontShowLabel.htmlFor = 'dontShowDonation';
  dontShowLabel.style.cssText = 'font-size:11px;color:var(--text2);cursor:pointer;user-select:none;';
  dontShowLabel.textContent = "don't show again this session";
  dontShowWrap.appendChild(dontShowCheck);
  dontShowWrap.appendChild(dontShowLabel);

  box.appendChild(errEl);
  box.appendChild(dontShowWrap);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // Click outside box to dismiss (only after modal is visible)
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay && modalRevealed) {
      var suppress = dontShowCheck.checked;
      dismissModal(!suppress, 'click_outside');
      if (suppress) _donationModalSuppressed = true;
    }
  });

  // Animate pixel dissolve in, then reveal modal
  function pixelStep() {
    var end = Math.min(drawn + perFrame, blocks.length);
    for (var i = drawn; i < end; i++) {
      ctx.fillRect(blocks[i][0] * blockSize, blocks[i][1] * blockSize, blockSize, blockSize);
    }
    drawn = end;
    if (!modalRevealed && drawn >= blocks.length * 0.5) {
      modalRevealed = true;
      overlay.style.opacity = '1';
    }
    if (drawn < blocks.length) {
      requestAnimationFrame(pixelStep);
    } else {
      // Dissolve canvas away
      setTimeout(function() {
        var cleared = 0;
        function clearStep() {
          var end2 = Math.min(cleared + perFrame, blocks.length);
          for (var i = cleared; i < end2; i++) {
            ctx.clearRect(blocks[i][0] * blockSize, blocks[i][1] * blockSize, blockSize, blockSize);
          }
          cleared = end2;
          if (cleared < blocks.length) requestAnimationFrame(clearStep);
          else canvas.remove();
        }
        clearStep();
      }, 100);
    }
  }
  requestAnimationFrame(pixelStep);

  // Wire up click handlers directly (not via delegation — modal is outside claimBanner)
  // Attach click directly to each pill button (no delegation, no closest() issues)
  var allPills = pctRow.querySelectorAll('button');
  allPills.forEach(function(pill) {
    pill.addEventListener('click', function() {
      var pct = parseFloat(pill.dataset.pct);
      var claimEth = parseFloat(amtInput.dataset.claimEth) || 0;
      var newAmt = fmtDonation(claimEth * pct / 100);
      amtInput.value = newAmt;
      confirmBtn.textContent = 'Donate ' + newAmt + ' ETH';
      allPills.forEach(function(b) { b.style.cssText = pillOff; });
      pill.style.cssText = pillOn;
    });
  });

  amtInput.addEventListener('input', function() {
    var val = parseFloat(amtInput.value) || 0;
    var usdEl = document.getElementById('modalDonationUsd');
    if (usdEl && _ethPrice) usdEl.textContent = val > 0 ? '(' + fmtUsd(val * _ethPrice) + ')' : '';
    confirmBtn.textContent = 'Donate ' + fmtDonation(val) + ' ETH';
    pctRow.querySelectorAll('.donation-pct-btn').forEach(function(p) { p.classList.remove('active'); });
  });

  confirmBtn.addEventListener('click', function() {
    var amt = parseFloat(amtInput.value);
    if (!amt || amt <= 0) return;
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.6';
    confirmBtn.style.background = 'var(--gold)';
    confirmBtn.textContent = 'Sending...';
    var amountWei = ethers.parseEther(amt.toFixed(18));
    sendDonation(amountWei).then(function() {
      while (box.firstChild) box.removeChild(box.firstChild);
      var msg = document.createElement('div');
      msg.style.cssText = 'padding:20px 0;text-align:center;';
      var successText = document.createElement('div');
      successText.style.cssText = 'font-size:14px;font-weight:600;color:var(--green);';
      successText.textContent = 'Thank you for your donation.';
      msg.appendChild(successText);
      box.appendChild(msg);
      setTimeout(function() { dismissModal(false, 'donation_success'); }, 2500);
    }).catch(function(e) {
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.background = 'var(--accent)';
      confirmBtn.textContent = 'Donate ' + fmtDonation(amt) + ' ETH';
    });
  });

  function dismissModal(resetFlag, reason) {
    logEvent('found', { extra: { donation_modal: 'dismissed', reason: reason || 'unknown', reset: resetFlag } });
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.25s ease';
    setTimeout(function() {
      overlay.remove();
      _lastClaimTxHash = null;
      if (resetFlag) _donationModalShown = false;
    }, 250);
  }

  skipBtn.addEventListener('click', function() {
    var suppress = dontShowCheck.checked;
    dismissModal(!suppress, 'skip');
    if (suppress) _donationModalSuppressed = true;
  });
}

// Timer for idle detection during batch claims
var _donationIdleTimer = null;

function resetDonationIdleTimer(totalEth) {
  if (_donationIdleTimer) clearTimeout(_donationIdleTimer);
  if (totalEth >= 0.1) {
    _donationIdleTimer = setTimeout(function() {
      showDonationModal(totalEth);
    }, 30000);
  }
}

// Share
function shareResult(text) {
  var url = 'https://forgotteneth.com';
  var msg = text || 'I just discovered forgotten ETH using Forgotten ETH - a free tool that scans defunct contracts for unclaimed balances.';
  var shareData = { title: 'Forgotten ETH', text: msg, url: url };
  if (navigator.share) {
    navigator.share(shareData).catch(function() {});
  } else {
    var tweetUrl = 'https://x.com/intent/tweet?text=' + encodeURIComponent(msg + ' ' + url);
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
  }
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function isAddr(s) { return /^0x[0-9a-fA-F]{40}$/.test(s); }
function isENSName(s) { return /^[a-zA-Z0-9-]+\.eth$/i.test(s); }
function fmtUsdSmall(ethAmount) {
  if (!_ethPrice || !ethAmount) return '';
  return ' <span style="color:var(--text2);font-size:12px">(' + fmtUsd(parseFloat(ethAmount) * _ethPrice) + ')</span>';
}

// ─── Watchlist (localStorage-based) ───
const WATCHLIST_KEY = 'forgotten_eth_watchlist';
function getWatchlist() {
  try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]'); } catch(e) { return []; }
}
function addToWatchlist(addr) {
  const list = getWatchlist();
  const lower = addr.toLowerCase();
  if (!list.find(a => a.toLowerCase() === lower)) {
    list.push(addr);
    try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list)); } catch(e) {}
  }
  renderWatchlistBar();
}
function removeFromWatchlist(addr) {
  const list = getWatchlist().filter(a => a.toLowerCase() !== addr.toLowerCase());
  try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list)); } catch(e) {}
  renderWatchlistBar();
}
function renderWatchlistBar() {
  const bar = document.getElementById('watchlistBar');
  const list = getWatchlist();
  if (list.length === 0) { bar.classList.remove('visible'); bar.innerHTML = ''; return; }
  bar.classList.add('visible');
  bar.innerHTML = 'Watching ' + list.length + ' address' + (list.length > 1 ? 'es' : '') +
    ' <a href="#" data-action="show-watchlist" style="color:var(--accent-text)">view</a>' +
    ' <a href="#" data-action="clear-watchlist" style="color:var(--text2);font-size:11px">clear</a>';
}
// Re-check watched addresses on load
async function recheckWatchlist() {
  const list = getWatchlist();
  if (list.length === 0) return;
  for (const addr of list) {
    try {
      const resp = await fetchCheck(addr);
      if (resp.ok && resp.data) {
        const balances = resp.data.balances || {};
        const hasAny = Object.values(balances).some(b => BigInt(b.balance_wei) > 0n);
        if (hasAny) {
          let total = 0;
          for (const b of Object.values(balances)) total += parseFloat(b.balance_eth || ethers.formatEther(BigInt(b.balance_wei)));
          console.log('[Watchlist] ' + addr + ' has ' + total.toFixed(4) + ' ETH claimable');
        }
      }
    } catch(e) {}
  }
}

// Live onchain balance check cache
const liveBalanceCache = new Map(); // addr -> { key, balance: bigint, checked: timestamp }

async function checkLiveBalance(address, contractAddr) {
  const cacheKey = contractAddr + ':' + address;
  const cached = liveBalanceCache.get(cacheKey);
  if (cached && Date.now() - cached.checked < 300000) return cached.balance;
  try {
    const cfg = Object.values(EXCHANGES).find(e => e.contract.toLowerCase() === contractAddr.toLowerCase());
    if (!cfg) return null;
    // balanceContract overrides where the balance call is made (vault vs crowdsale).
    const balanceAddr = cfg.balanceContract || contractAddr;
    // Try each public RPC until one works
    let balance = null;
    for (let attempt = 0; attempt < PUBLIC_RPCS.length; attempt++) {
      try {
        const provider = getPublicProvider();
        const contract = new ethers.Contract(balanceAddr, [cfg.balanceAbi], provider);
        const result = await contract[cfg.balanceCall](...cfg.balanceArgs(address));
        balance = cfg.balanceTransform ? cfg.balanceTransform(result) : result;
        break;
      } catch (rpcErr) {
        rotateRPC();
        if (attempt === PUBLIC_RPCS.length - 1) throw rpcErr;
      }
    }
    liveBalanceCache.set(cacheKey, { balance, checked: Date.now() });
    return balance;
  } catch(e) {
    console.error('Live balance check failed:', e);
    return null;
  }
}

// ─── ENS Deed Lookup ───
const ENS_REGISTRAR = '0x6090A6e47849629b7245Dfa1Ca21D94cd15878Ef';
// Precomputed: keccak256('HashRegistered(bytes32,address,uint256,uint256)')
const ENS_HASH_REGISTERED_TOPIC = '0x0f0c27adfd84b60b6f456b0e87cdccb1e5fb9603991588d87fa99f5b6b61e670';
const ENS_DEED_ABI = ['function owner() view returns (address)', 'function value() view returns (uint256)'];
const ENS_REGISTRAR_ABI = [
  'function entries(bytes32 _hash) view returns (uint8, address, uint256, uint256, uint256)',
  'function releaseDeed(bytes32 _hash)',
];
// Old registrar deployed ~block 3648000, migration ended ~block 9380000
const ENS_FROM_BLOCK = 3648000;
const ENS_TO_BLOCK = 9380000;

async function lookupENSDeeds(ownerAddress, walletProv) {
  // Use public RPC for historical log queries (wallet RPCs often restrict range)
  // Try multiple RPCs if one fails
  let provider = getPublicProvider();
  const paddedOwner = ethers.zeroPadValue(ownerAddress, 32);
  const deeds = [];
  try {
    // Query in chunks to avoid RPC limits (some providers cap at 2000 blocks)
    const chunkSize = 500000;
    const allLogs = [];
    for (let from = ENS_FROM_BLOCK; from <= ENS_TO_BLOCK; from += chunkSize) {
      const to = Math.min(from + chunkSize - 1, ENS_TO_BLOCK);
      try {
        const logs = await provider.getLogs({
          address: ENS_REGISTRAR,
          topics: [ENS_HASH_REGISTERED_TOPIC, null, paddedOwner],
          fromBlock: from,
          toBlock: to,
        });
        allLogs.push(...logs);
      } catch (e) {
        // RPC failed — rotate and retry with smaller chunks
        provider = new ethers.JsonRpcProvider(rotateRPC());
        const smallChunk = 100000;
        for (let sf = from; sf <= to; sf += smallChunk) {
          const st = Math.min(sf + smallChunk - 1, to);
          try {
            const logs = await provider.getLogs({
              address: ENS_REGISTRAR,
              topics: [ENS_HASH_REGISTERED_TOPIC, null, paddedOwner],
              fromBlock: sf,
              toBlock: st,
            });
            allLogs.push(...logs);
          } catch (e2) {
            console.warn('ENS log query failed for range', sf, '-', st, e2);
          }
        }
      }
    }

    if (allLogs.length === 0) return deeds;

    // Extract unique labelHashes
    const labelHashes = [...new Set(allLogs.map(log => log.topics[1]))];

    // Check each deed via entries() to see if it still has value
    const registrar = new ethers.Contract(ENS_REGISTRAR, ENS_REGISTRAR_ABI, provider);
    for (const labelHash of labelHashes) {
      try {
        const entry = await registrar.entries(labelHash);
        const deedAddr = entry[1];
        // entry[0] = state (0=Open, 1=Auction, 2=Owned, 3=Forbidden, 4=Reveal, 5=NotYetAvailable)
        // Deed address must not be zero
        if (deedAddr === ethers.ZeroAddress) continue;

        // Check deed has ETH and owner matches
        const deed = new ethers.Contract(deedAddr, ENS_DEED_ABI, provider);
        const [deedOwner, deedValue] = await Promise.all([deed.owner(), deed.value()]);
        if (deedOwner.toLowerCase() === ownerAddress.toLowerCase() && deedValue > 0n) {
          deeds.push({ labelHash, deedAddress: deedAddr, value: deedValue });
        }
      } catch (e) {
        // Deed may have self-destructed (already released)
      }
    }
  } catch (e) {
    console.error('ENS deed lookup failed:', e);
  }
  return deeds;
}

const EXCHANGES = {
  thedao: {
    name: 'The DAO',
    desc: 'The DAO launched in April 2016 as the largest crowdfund in history, raising 11.5 million ETH. In June 2016, a reentrancy exploit drained 3.6M ETH, leading to the Ethereum hard fork. After the fork restored the funds, a WithdrawDAO wrapper was deployed allowing token holders to burn DAO tokens 1:1 for ETH. Over 81,000 ETH remains unclaimed.',
    category: 'ico',
    color: '#c0392b',
    contract: '0xbb9bc244d798123fde783fcc1c72d3bb8c189413',
    deployed: 'April 2016',
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    withdrawAbi: null,
    withdrawCall: null,
    daoWithdraw: {
      daoToken: '0xbb9bc244d798123fde783fcc1c72d3bb8c189413',
      withdrawContract: '0xbf4ed7b27f1d666546e30d74d50d173d20bca754',
    },
    // Parity multisigs holding DAO tokens — owners can execute approve+withdraw via multisig
    parityMultisigs: [
      '0x1fc661b3d994b9bb66cf3f9a1e8ccd58b6fb7177','0x63ec63d6cd7ab8032f304e6a2d353730c4b553a7',
      '0x49904901aad59a0cc0009f65819357c61dd24b50','0x1cada44456fe7acbd564ca077b239943d99ff8e5',
      '0xe5cdf860c225d2a9ea0ec8b658908a73c1c257b4','0x833b4852c41e1f5452baf55f3b56a6d2e9486458',
      '0xed111b1685e186f4c178720655ad470a6b4f7c51','0x64c1ab8b92d15752a881749261d4f86a74e10c4d',
      '0xb8b4bd276cc215c3ddf41e21322362edba6acae5','0x236d06b4832a5ee8436e1ffe7a9a0855322c8034',
      '0x30e076675fc43e6469960f44f3239f155cfc1a72','0x4611e3d2b8349edd804fffd05dcdf9ccd1eea2b4',
      '0x864c05913596393f9bb45488b1d4082aa2143cb4','0x62ca869bafea0c77234e48018d9c67f7c0cd197a',
      '0xf9d88811694af1d97788d6935cc54bd7e81f8055','0x06078d50542cd0004b67d1e6802c5bb33da736da',
      '0xf129f66949582881dca3678d7f4a263d9e79ee10','0x6ec64dd4226fe99c3ffd5d4a1f9aa064478a1bbd',
      '0xf0e54e94f2aca3c72c7f3f413551d90c8fb5c645','0x44365d3364902670b9a750faff5354d6b8fc1661',
      '0xc8f69db8fdaa87ff8df88bc899e7d04c7f21059e','0xfb83b48a5777102f919d79495f4d6529d4e6f61e',
      '0x50637171edd493a6874402f0fc11a5d7c794b702','0x8cfe69097c72ef19f25993e7c2d6fbf1e12de2d6',
      '0x3ae3baa2741c2b847547747bddd037bc7cf7c2c7','0x239c72c06c8a4beb525428a10ac00bda5a90217f',
      '0x2ec527e29dc65d4676fc700d867ae98f42e8e618','0xbe424828844ef9d8d81067a6a81b75dffdfe3900',
      '0x148fbd304aade01585a550415c992359be300b7a','0x08ae2870a5d338bcb534b5de8464d2fa57da00aa',
      '0xc3f7d4509fe05c520cb3a7dea5f3d3de961498e1','0x57e0b69f4f70134ee0ae96e6aaf465444cc0df61',
      '0x28adfde72e266cf5a144a4221590e06010ffc84b','0xeaa4d67f39192c0ac32946b7344b8dc69fd998c0',
      '0x8d262f884ebd9102a08e6c6b05e1986170cbe58d','0xd572e626189458dbd9455871b06d97d80e9e86ae',
      '0x61fdfde3a435d9c740144b8bca179e93c5198ed5','0x8b8e16135ba1685ba362f246439e97185e9ef8cc',
      '0x0e514dd1047d427b619bafb08704e031eccce521','0xe640244f00ab2349171eca6a9367f0b5a64416cc',
      '0x0b8ae27b2c92b1cd950208d7d8522287333462c4','0xea324da745e41bbe72645960d6ee904275ad78c4',
      '0xf7e7563d43de52317546e6bcd3a79715df9897c6','0x570012c777434fd4bd2d625e49551ceb2e84478b',
      '0xed1d888747e9261bd0390bf5b758a544aca72ac6','0x372ecf6a0043a3a98407e09b4a5ebebdf833f464',
      '0x3be342c14b6af4fc2dff240886a4def17a9140fb','0x2762e586561c7ac0764459b926e627dc94f353ed',
      '0xf32c6e8981be83396c4191b67bb4f4e851850f5e','0xa8efc69437fbe6f13f35d5e512b64816f7058633',
      '0xfb6315f71f04d9b27948674b25ec1794db43ebc5','0x8732cb59f5bf4d82c6f756b1756284df386c1e79',
      '0x8d3fb842624c3ca5273966c00876be8a19e8afb8','0xc4c795ca5005a4a109386b943cde45fe1e588d40',
      '0xe09bc42f9cd425dee55e71f581cedbe806df04b9','0x10ffeec57023afc81904bdc415372de9ee86fd5a',
      '0x04abc82be0261ae91e82644a7447d2602a8f57a2','0xc357da27d1b0a92d32b9894439a41da86c87ebeb',
      '0xf0bff27e9e404c425ff0a6ade03119c633f8c68c','0x9c9c21c4828fbd5e0df504d997fb3f01ddab8ea7',
      '0x3bcca7f578def371715d4253e322afeb216c4101','0x78ddee92b2457d0ca167ce00a42a5053eb91d7d2',
      '0xec0b3ec47c12588acf9d52429a9d9404b401ebb8','0xf19ee5f19425e4211ce8c00b04f22fd9d3cf612a',
      '0x9eea3a55e8bf649472fb0b0ddea242ae87cf1460','0xa8c62fab24434af8e42a0f28cad2911efc9e8aed',
      '0x85d395522680ff0ba0bda5ad079d317554b203ea',
    ],
  },
  idex: {

    name: 'IDEX v1',
    desc: 'IDEX launched in October 2017 as the first hybrid DEX combining off-chain order matching with onchain settlement. Originally branded as Aurora, it grew to process over 4 million orders per day during the ICO boom. IDEX v1 was superseded by v2 in fall 2020.',
    color: '#6366f1',
    contract: '0x2a0c0DBEcC7E4D658f48E01e3fA353F44050c208',
    deployed: 'September 2017',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    // Withdraw config
    withdrawAbi: 'function withdraw(address token, uint256 amount) returns (bool)',
    withdrawArgs: (amount) => [ZERO_ADDR, amount],
    withdrawCall: 'withdraw',
  },
  etherdelta: {
    name: 'EtherDelta v2',
    desc: 'EtherDelta launched July 12, 2016 as the first widely-used DEX for ERC-20 tokens. It became the go-to venue for ICO token trading in 2017, peaking at ~$10M daily volume. On December 20, 2017, attackers hijacked its DNS to steal $1.4M from users. In November 2018, the SEC charged its creator with operating an unregistered exchange, the first such action against a DEX.',
    color: '#f97316',
    contract: '0x8d12A197cB00D4747a1fe03395095ce2A5CC6819',
    deployed: 'February 2017',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  tokenstore: {
    name: 'Token.Store',
    desc: 'Launched July 30, 2017 as a fully onchain DEX with both onchain order matching and settlement. Processed over 500,000 transactions across 100,000+ accounts and later expanded to EOS. The anonymous team shut it down on June 22, 2020, publishing a farewell citing the rise of AMMs like Uniswap as having made order-book DEXs obsolete.',
    color: '#22c55e',
    contract: '0x1ce7ae555139c5ef5a57cc8d814a867ee6ee33d8',
    deployed: 'August 2017',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  etherdelta_m1: {
    name: 'EtherDelta v1',
    desc: 'An earlier iteration of the EtherDelta exchange (December 2016). Multiple contract versions were deployed, each requiring users to manually withdraw and redeposit. Superseded by the well-known v2 contract at 0x8d12A197.',
    color: '#f59e0b',
    contract: '0x373c55c277b866a69dc047cad488154ab9759466',
    deployed: 'December 2016',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  singularx: {
    name: 'SingularX',
    desc: 'SingularX (by SingularDTV) launched November 2017 as a DEX for their blockchain entertainment economy. Based on EtherDelta\'s architecture, it saw over $3M in 24h volume during the CENNZ listing. SingularDTV rebranded to Breaker in 2019 but failed to deliver on its decentralized Netflix vision.',
    color: '#0ea5e9',
    contract: '0x9a2d163ab40f88c625fd475e807bbc3556566f80',
    deployed: 'March 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  enclaves: {
    name: 'Unknown DEX',
    desc: 'An unverified EtherDelta-style DEX contract from September 2017. The protocol behind this contract has not been identified. The source code is not published on Etherscan but follows the standard deposit/withdraw pattern.',
    color: '#14b8a6',
    contract: '0x4d55f76ce2dbbae7b48661bef9bd144ce0c9091b',
    deployed: 'September 2017',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  decentrex: {
    name: 'Decentrex',
    desc: 'An EtherDelta-fork DEX that was notably served directly from GitHub Pages (circa 2017). Minimal presence online, one of many EtherDelta forks from the 2017-2018 era that attracted small trading communities.',
    color: '#64748b',
    contract: '0xbf29685856fae1e228878dfb35b280c0adcc3b05',
    deployed: 'July 2017',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  joyso: {
    name: 'Joyso',
    desc: 'Launched in Taiwan, May 2018 after a March 2018 ICO, combining off-chain matching with onchain settlement. Partnered with CoolBitX to offer the first cold-storage DEX trading experience.',
    color: '#10b981',
    contract: '0x04f062809b244e37e7fdc21d9409469c989c2342',
    deployed: 'September 2018',
    balanceAbi: 'function getBalance(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'getBalance',
    withdrawAbi: 'function withdraw(address token, uint256 amount)',
    withdrawArgs: (amount) => [ZERO_ADDR, amount],
    withdrawCall: 'withdraw',
    // Two-step withdrawal: lockMe() -> 30 day wait -> withdraw()
    twoStep: {
      lockAbi: 'function lockMe()',
      lockCall: 'lockMe',
      lockCheckAbi: 'function userLock(address) view returns (uint256)',
      lockCheckCall: 'userLock',
      lockDays: 30,
    },
  },
  ethen: {
    name: 'ETHEN',
    desc: 'A decentralized exchange for ERC-20 tokens, founded in 2018 and headquartered in Saint Petersburg, Russia. Used a custom contract design with a direct balances mapping rather than the standard EtherDelta token-tracking pattern.',
    color: '#a855f7',
    contract: '0xf4c27b8b002389864ac214cb13bfeef4cc5c4e8d',
    deployed: 'October 2018',
    balanceAbi: 'function balances(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balances',
    withdrawAbi: 'function withdrawEther(uint256 _amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdrawEther',
  },
  bitcratic: {
    name: 'Bitcratic',
    desc: 'An EtherDelta-style DEX with off-chain orderbook and onchain settlement (2018). One of the more active EtherDelta forks during the post-ICO trading boom.',
    color: '#f43f5e',
    contract: '0x3c020e014069df790d4f4e63fd297ba4e1c8e51f',
    deployed: 'June 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  etherc: {
    name: 'EtherC',
    desc: 'Claimed to be the first DEX with gas-free trading via its ETHERCToken (EET) reimbursement system (2018). An unusual approach where gas costs were subsidized through the platform\'s own token.',
    color: '#06b6d4',
    contract: '0xd8d48e52f39ab2d169c8b562c53589e6c71ac4d3',
    deployed: 'April 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  enclavesdex: {
    name: 'EnclavesDex',
    desc: 'A DEX and early liquidity aggregator on Ethereum (June 2018) that routed trades through both its own order book and EtherDelta. An early precursor to the aggregator model later popularized by 1inch.',
    color: '#84cc16',
    contract: '0xbf45f4280cfbe7c2d2515a7d984b8c71c15e82b7',
    deployed: 'June 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  ens_old: {
    name: 'ENS Old Registrar',
    desc: 'The original .eth registrar launched May 4, 2017 (Star Wars Day) after an earlier March launch was aborted due to a bug. Used Vickrey sealed-bid auctions where winning bids were locked in deed contracts. Replaced by the permanent registrar on May 4, 2019; names not migrated by May 2020 returned to the pool, but deed deposits can still be reclaimed via releaseDeed().',
    color: '#3b82f6',
    contract: '0x6090A6e47849629b7245Dfa1Ca21D94cd15878Ef',
    deployed: 'May 2017',
    // ENS balance is pre-computed from Deed owner() scan
    // On-site claiming uses releaseDeed(bytes32 labelHash) looked up via HashRegistered events
    balanceAbi: null,
    balanceArgs: null,
    balanceCall: null,
    withdrawAbi: 'function releaseDeed(bytes32 _hash)',
    withdrawArgs: null,
    withdrawCall: 'releaseDeed',
    category: 'ens',
    noWalletCheck: true,
    ensDeeds: true,
  },
  trend: {
    name: 'Trend (TND)',
    desc: 'Trend (TND) ran a 2018 ICO via the OpenZeppelin RefundableCrowdsale + CryptoHuntIco template. Soft cap missed, the contract finalized into refund mode, and ~28 ETH still sits in the sibling RefundVault. Single-tx claim: claimRefund() on the crowdsale returns your original deposit.',
    color: '#0d9488',
    contract: '0x5113309c84f7292b5f780748df5869cb9d0e3ad5',
    balanceContract: '0x7192911827361f7326ec0ec945b6b3c53b141f32',
    deployed: 'March 2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  global_ico: {
    name: 'Global ICO Token (GLIF)',
    desc: 'Global ICO Token (GLIF) reused the OpenZeppelin RefundableCrowdsale + CryptoHuntIco template for its 2018 sale. Soft cap missed (raised ~896 ETH, refunded most), ~16 ETH still sits unclaimed in the sibling RefundVault. Standard claimRefund() returns your deposit.',
    color: '#0d9488',
    contract: '0xd005c3dccd6e7056883dc612770021bc09837098',
    balanceContract: '0x91bf99ca34268d407f3cc8d6525ce83c6ea7bcf5',
    deployed: 'March 2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  crypto_hunt: {
    name: 'CryptoHunt (CH)',
    desc: 'CryptoHunt is a blockchain treasure-hunting game whose 2018 ICO didn\'t reach its soft cap. The contract is the canonical CryptoHuntIco source — OpenZeppelin RefundableCrowdsale pattern, public claimRefund() routing to the sibling RefundVault. ~10 ETH still claimable.',
    color: '#0d9488',
    contract: '0xb8f1437c742dc042af73d5bd18c8fc985ec8e3b4',
    balanceContract: '0xebc7e601f7daf56b602334d6a3b081bb4d7d86e4',
    deployed: 'March 2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  alttradex: {
    name: 'Alttradex (ATXT)',
    desc: 'Alttradex Token (ATXT) ran an October 2017 ICO using the OpenZeppelin RefundableCrowdsale + CryptoHuntIco template. Soft cap missed; finalize() routed the vault into refund mode. ~5 ETH still in the sibling RefundVault. Single-tx claimRefund() returns your deposit.',
    color: '#0d9488',
    contract: '0x12c33d513d4534e6cb5dc06c56683be52a936d24',
    balanceContract: '0xe84e9f28a721010b8a2934810ce22975b15de46f',
    deployed: 'October 2017',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  etcetera_ico: {
    name: 'Etcetera (ERA)',
    desc: 'Etcetera (ERA) was a 2018 ICO that used the OpenZeppelin RefundableCrowdsale + CryptoHuntIco template. The sale didn\'t reach its goal; the contract is in refund mode. ~5 ETH still in the sibling RefundVault waiting for stragglers.',
    color: '#0d9488',
    contract: '0xc49e03bdd6809fd168565b26d27d5cf72f9e9525',
    balanceContract: '0x17be2c0aca46dd60cfc58dbb13f0b1c6c1921db8',
    deployed: 'January 2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  enkronos: {
    name: 'Enkronos Token (ENK)',
    desc: 'EnkronosToken (ENK) — 2018 ICO via the OpenZeppelin RefundableCrowdsale + CryptoHuntIco template. Soft cap missed. ~1 ETH still in the sibling RefundVault. Standard claimRefund() returns your original deposit.',
    color: '#0d9488',
    contract: '0xda3fa12b3d41cd9948db6437f27c0c9978c55cbb',
    balanceContract: '0xfe911bd81e9e7295dcd997973036f723d3e02300',
    deployed: 'January 2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  deskbell: {
    name: 'DeskBell (DBT)',
    desc: 'DeskBell Token (DBT) ran a 2018 ICO via the OpenZeppelin RefundableCrowdsale (DeskBellPresale) template. Soft cap missed; ~4 ETH still sits in the sibling RefundVault. Standard single-tx claimRefund() returns your deposit.',
    color: '#0d9488',
    contract: '0x6e776e93291620dac8f3dde4a0b98c42a5359293',
    balanceContract: '0x5a08600cbb2a6dd073a62cddb07861efe59d40f5',
    deployed: 'March 2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  quintessence: {
    name: 'Quintessence (QST)',
    desc: 'Quintessence Token (QST) — 2018 ICO using the OpenZeppelin RefundableCrowdsale (DeskBellPresale-bytecode) template. ~1.5 ETH still in the sibling RefundVault. Standard claimRefund() returns your deposit.',
    color: '#0d9488',
    contract: '0xc86554bee96fdb3c85f85b576ed52d5e1eacc3a6',
    balanceContract: '0xc178d4fe4451d863cd01fd3e240d17194fd178bc',
    deployed: 'April 2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  deck_coin: {
    name: 'Deck Coin (DEK)',
    desc: 'Deck Coin (DEK) — 2017 ICO using the OpenZeppelin RefundableCrowdsale template. Soft cap missed. ~1.2 ETH still in the sibling RefundVault. Standard claimRefund() returns your deposit.',
    color: '#0d9488',
    contract: '0xcb7f070fda083e8e5f40559376c360f0709e985c',
    balanceContract: '0x05b3abd9031a31a45121bda59c7bb52fc7db2590',
    deployed: 'October 2017',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  tokpie: {
    name: 'Tokpie (TKP)',
    desc: 'Tokpie (TKP) — exchange-token ICO from 2018 using the OpenZeppelin RefundableCrowdsale template. The crowdsale didn\'t reach its soft cap; ~1.2 ETH still sits in the sibling RefundVault. Standard claimRefund() returns your original deposit.',
    color: '#0d9488',
    contract: '0x5e6a22ef928d09e9159737393ca155e9eb021d54',
    balanceContract: '0x7d7417ed0748018f540aa0f68df31d8f44a342f7',
    deployed: 'April 2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  globalspy: {
    name: 'GlobalSpy (SPY)',
    desc: 'GlobalSpy (SPY) — 2018 ICO using the OpenZeppelin RefundableCrowdsale template. ~1 ETH still in the sibling RefundVault. Standard claimRefund() returns your original deposit.',
    color: '#0d9488',
    contract: '0x05711090b4d375431e841ea79e52666f623d3353',
    balanceContract: '0xaae985547c1512ffccee43ce5f55d73d5df6edca',
    deployed: 'March 2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  bigtoken: {
    name: 'BigToken (BTK)',
    desc: 'BigToken (BTK) ran a 2018 ICO via the BigTokenCrowdSale (OpenZeppelin RefundableCrowdsale variant). Soft cap missed (raised ~927 ETH, refunded most). ~6 ETH still in the sibling RefundVault. Standard claimRefund() returns your deposit.',
    color: '#0d9488',
    contract: '0x2f4330e833c76860ea54f15b0195ff80a2c519c4',
    balanceContract: '0xbad9b65cfb0c2e89bc9543b86849780baa52c605',
    deployed: 'February 2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  winiota: {
    name: 'WINiota (WIT)',
    desc: 'WINiota Token (WIT) — June 2018 ICO whose crowdsale bytecode is identical to the FNT (Friend Network) RefundableCrowdsale. Soft cap missed; ~5 ETH still in the sibling RefundVault. Standard claimRefund() returns your deposit.',
    color: '#0d9488',
    contract: '0x3448295659daad4c834e5ce1c18c4e4ef73c7f06',
    balanceContract: '0x028857f9e565d7e3e1d84b5f5736b53651c2778f',
    deployed: 'June 2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  grapevine: {
    name: 'Grapevine (GVINE)',
    desc: 'Grapevine (GVINE) Crowdsale — 2018 ICO using the OpenZeppelin RefundableCrowdsale template. Soft cap missed; ~1 ETH still in the sibling RefundVault. Standard claimRefund() returns your deposit.',
    color: '#0d9488',
    contract: '0xea864a114c648eff4f92e55b870fe1e71fd60083',
    balanceContract: '0x57d1fbc0404ec7b431914cdea7a040953eaf925d',
    deployed: 'July 2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  irb: {
    name: 'IRB Tokens (IRB)',
    desc: 'IRB Tokens ran a 2018 pre-crowdsale via the OpenZeppelin RefundableCrowdsale template. Soft cap missed, the contract finalized into refund mode, and ~5 ETH still sits in the sibling RefundVault for the long tail of contributors. Standard single-tx claim: claimRefund() on the crowdsale returns your deposit through the vault.',
    color: '#0d9488',
    contract: '0x269b4c23ddab676e2869ae72cd6ae4f24bdfea45',
    balanceContract: '0xcbe98a2b1f756bebe53d41eb3b94e566a0777ede',
    deployed: '2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  cam: {
    name: 'CamToken (CAM)',
    desc: 'CamToken ran a 2018 ICO via the OpenZeppelin RefundableCrowdsale template. Soft cap missed and the contract finalized into refund mode; ~3 ETH still sits in the sibling RefundVault. Single-tx claim: call claimRefund() on the crowdsale and the vault returns your original deposit.',
    color: '#0d9488',
    contract: '0xa785ecdc8f166d0644b853f29732ae128c5d775b',
    balanceContract: '0x59450e7a13bb0ff6d6d58f60e3e6b3e07b7a32e1',
    deployed: '2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  linda_pre: {
    name: 'LINDA Token (Presale)',
    desc: 'LINDA (LNDA) ran a two-stage 2018 token sale: a presale and a main sale, both using the OpenZeppelin RefundableCrowdsale template against the same LINDA token. The presale missed its soft cap and ~3 ETH still sits in this presale RefundVault. Standard claimRefund() returns your deposit.',
    color: '#0d9488',
    contract: '0x8519f68a987048b879bed6afab25a0414828c236',
    balanceContract: '0xd782ae82c167de179dec25278d855375d8174b60',
    deployed: '2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  linda_main: {
    name: 'LINDA Token (Main Sale)',
    desc: 'The main sale stage of LINDA (LNDA), deployed alongside a separate presale contract. The main sale also missed its soft cap and finalized into refund mode; ~2.7 ETH still sits in the sibling RefundVault. Standard claimRefund() returns your deposit.',
    color: '#0d9488',
    contract: '0xfcbc3a54c5663295d075b086441ee51c32ad152c',
    balanceContract: '0x551ccb65f02a5ddda909f181b1eb67c9226c6a2e',
    deployed: '2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  monoreto: {
    name: 'Monoreto (MNR)',
    desc: 'Monoreto ran its 2018 ICO via the OpenZeppelin RefundableCrowdsale template. Soft cap was missed and the contract finalized into refund mode; ~2.5 ETH still sits in the sibling RefundVault. Standard single-tx claim: claimRefund() on the crowdsale returns your original ETH through the vault.',
    color: '#0d9488',
    contract: '0x65320b9aeac77e45369e4892da896b7a987a97f3',
    balanceContract: '0xf671ab8f66212917d122e7cf52094440d6aedc82',
    deployed: '2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  ico_refund_79c5: {
    name: 'Unverified ICO Refund (79c5)',
    desc: 'An unverified 2018 ICO crowdsale built on the OpenZeppelin RefundableCrowdsale template. Source is not published, but bytecode-level selectors match the canonical pattern, and Tenderly simulation confirms claimRefund() works for current depositors. ~1.5 ETH still sits in the sibling RefundVault.',
    color: '#0d9488',
    contract: '0x79c59c24465fc3cc92e6419d4b59fdd285d874cf',
    balanceContract: '0xe853148ef66505508b46b30511eeb4c7a4eaa370',
    deployed: '2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  treecoin: {
    name: 'TREECHAIN NETWORK (TREECOIN)',
    desc: 'TREECHAIN NETWORK ran a 2018 ICO via the OpenZeppelin RefundableCrowdsale template. Soft cap missed and the contract finalized into refund mode; 1 ETH remains in the sibling RefundVault for a single straggler. Standard claimRefund() returns the deposit.',
    color: '#0d9488',
    contract: '0xf36358e9c7f6bf26d9cff44f95bf9521fc3feed4',
    balanceContract: '0x1394d3612343d05d57e482e0cf4c8e9b0df626b0',
    deployed: '2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  lendsbay: {
    name: 'Lendsbay Token (LBT)',
    desc: 'Lendsbay (LBT) ran a 2018 ICO via the OpenZeppelin RefundableCrowdsale template. Soft cap missed; ~0.85 ETH still in the sibling RefundVault. Standard claimRefund() returns your deposit.',
    color: '#0d9488',
    contract: '0x3adf5ee8777f471407e04a7453133477a2dc0c2c',
    balanceContract: '0x4539d820c582c8a196891cd03ed0967dc3823656',
    deployed: '2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  furt: {
    name: 'FURT COIN (FRT)',
    desc: 'FURT COIN ran a 2018 ICO via the OpenZeppelin RefundableCrowdsale template. Soft cap missed; ~0.7 ETH still in the sibling RefundVault for two contributors. Standard claimRefund() returns your deposit.',
    color: '#0d9488',
    contract: '0xf563549daf64f684858e863e2731f19633d1acb1',
    balanceContract: '0xc2a1bfc612addee098c723f5dedb298d44f49ebb',
    deployed: '2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  kryptopy: {
    name: 'Kryptopy Token (KPY)',
    desc: 'Kryptopy (KPY) ran a 2018 ICO via the OpenZeppelin RefundableCrowdsale template. Soft cap missed; ~0.6 ETH still in the sibling RefundVault. Standard claimRefund() returns your deposit.',
    color: '#0d9488',
    contract: '0x09b8aaa7a883e60c23c6a0635940000c6e2e7560',
    balanceContract: '0x1bd8c0ed1cd007b7c7fbe092569905b6cc854baf',
    deployed: '2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  digitize: {
    name: 'DigitizeCoin Presale (DTZ)',
    desc: 'DigitizeCoin (DTZ) ran a 2018 presale built on the OpenZeppelin RefundableCrowdsale template. The contract uses a 3-arg TokenPurchase event variant (PallyCoin family) but the refund flow is canonical. Soft cap missed and the contract finalized into refund mode; ~1.1 ETH still sits in the sibling RefundVault. Standard claimRefund() returns your deposit.',
    color: '#0d9488',
    contract: '0x9527551ca444f6e5d9a0b281116586427366862a',
    balanceContract: '0x0547d2aa5a072f7e8281ff7c422b43c9168ea2f3',
    deployed: '2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  pallycoin: {
    name: 'PallyCoin (PAL)',
    desc: 'Merunas Grincalaitis\'s December 2017 PallyCoin ICO used a custom RefundableCrowdsale where claimRefund() requires the depositor to STILL HOLD their full PAL allocation (the call also burns the original PAL via token.refundTokens). Soft cap missed; ~43 ETH remains in the RefundVault. ~40.6 ETH is claimable by 35 stragglers who never sold their PAL; ~2.7 ETH is locked for users who sold some tokens (Neufund-style token gating).',
    color: '#0d9488',
    contract: '0xb4f10530e531c32490c68062662eb5684057afb4',
    balanceContract: '0x75922986ffc00648d35a73d4476fa38579551d18',
    deployed: 'December 2017',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  pallycoin_v2: {
    name: 'PallyCoin Fork (PAL2)',
    desc: 'A 2018 PallyCoin fork by Manoj Patidar reusing the same RefundableCrowdsale + token-gated refund pattern, against a separate PAL2 token (0xca16d101). Soft cap missed; ~3.77 ETH still in the RefundVault, all claimable by 5 stragglers who still hold their full PAL2 allocation. Standard claimRefund() returns your deposit; you must hold PAL2 ≥ tokensBought.',
    color: '#0d9488',
    contract: '0x77b275827eb3cf1792852b128a6dbc7a699bbd91',
    balanceContract: '0xad256f5183b2479a63fe06974485104ddad1b8ce',
    deployed: '2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  foreground: {
    name: 'ForegroundTokenSale (DEAL)',
    desc: 'Foreground\'s November 2017 DEAL token sale used a custom finite-state crowdsale (Prepared → Configured → Started → Ended → Finalized → Refunding) and held ETH directly in the crowdsale contract — no separate vault. The sale ended in the Refunding state and ~12.15 ETH still sits in the contract. Single-tx claim: claimRefund() reads purchases[msg.sender].weiBalance and transfers it back. No token gating.',
    color: '#0d9488',
    contract: '0x943e99d9efd4b44d808f6c83373a9a2c1e15e0f8',
    deployed: 'November 2017',
    balanceAbi: 'function purchases(address) view returns (uint256, uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'purchases',
    balanceTransform: (result) => result[1],
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  vuepay: {
    name: 'VuePayTokenSale (VUP)',
    desc: 'VuePay\'s October 2017 VUP token sale used a custom crowdsale that holds ETH directly in the contract. Soft cap missed and the owner enabled refunds (allowRefund flag). ~1.21 ETH remains for 4 contributors. Single-tx claim: claimRefund() reads ETHContributed[msg.sender] and transfers it back.',
    color: '#0d9488',
    contract: '0xcba6f10d1147b2c5a3d8d8cbd93c373b31c6c2c8',
    deployed: 'October 2017',
    balanceAbi: 'function ETHContributed(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'ETHContributed',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  chickenchef: {
    name: 'ChickenChef',
    desc: 'Abandoned SushiSwap-MasterChef-style yield farm from the 2020 DeFi summer. Pool 0 accepts direct WETH stakes. The farm went silent in late 2024 and ~48 WETH still sits in the contract for 7 stakers. Single-tx claim: emergencyWithdraw(0) returns your full WETH stake. Skips reward minting (which often breaks first in abandoned chains).',
    color: '#a855f7',
    contract: '0x87ae4928f6582376a0489e9f70750334bbc2eb35',
    deployed: 'September 2020',
    returnsWeth: true,
    balanceAbi: 'function userInfo(uint256, address) view returns (uint256, uint256)',
    balanceArgs: (user) => [0, user],
    balanceCall: 'userInfo',
    balanceTransform: (result) => result[0],
    withdrawAbi: 'function emergencyWithdraw(uint256)',
    withdrawArgs: () => [0],
    withdrawCall: 'emergencyWithdraw',
    returnsWeth: true,
    category: 'masterchef',
  },
  gov_treasurer: {
    name: 'GovTreasurer',
    desc: 'Abandoned MasterChef-style yield farm. Pool 2 is the WETH staking pool, holding ~19 WETH for 21 stakers. Dormant since late 2023. Single-tx claim: emergencyWithdraw(2) returns your full WETH stake.',
    color: '#a855f7',
    contract: '0x4dac3e07316d2a31baabb252d89663dee8f76f09',
    deployed: 'January 2020',
    balanceAbi: 'function userInfo(uint256, address) view returns (uint256, uint256)',
    balanceArgs: (user) => [2, user],
    balanceCall: 'userInfo',
    balanceTransform: (result) => result[0],
    withdrawAbi: 'function emergencyWithdraw(uint256)',
    withdrawArgs: () => [2],
    withdrawCall: 'emergencyWithdraw',
    returnsWeth: true,
    category: 'masterchef',
  },
  mysteryman: {
    name: 'MysteryMan',
    desc: 'Abandoned MasterChef-style farm. Pool 0 accepts direct WETH stakes; ~4 WETH sits in the contract for 2 stakers. Single-tx claim: emergencyWithdraw(0) returns your full WETH stake.',
    color: '#a855f7',
    contract: '0x07261a6e37adbfab11e6474bca54634c7782b195',
    deployed: 'September 2020',
    balanceAbi: 'function userInfo(uint256, address) view returns (uint256, uint256)',
    balanceArgs: (user) => [0, user],
    balanceCall: 'userInfo',
    balanceTransform: (result) => result[0],
    withdrawAbi: 'function emergencyWithdraw(uint256)',
    withdrawArgs: () => [0],
    withdrawCall: 'emergencyWithdraw',
    returnsWeth: true,
    category: 'masterchef',
  },
  masterstar: {
    name: 'MasterStar',
    desc: 'Abandoned MasterChef-style farm. Pool 0 accepts direct WETH stakes; one staker holds the full claimable 3 WETH. (The contract also holds an additional 0.1 WETH that was sent directly to the contract address and is not user-claimable.) Single-tx claim: emergencyWithdraw(0) returns your full WETH stake.',
    color: '#a855f7',
    contract: '0xb60c12d2a4069d339f49943fc45df6785b436096',
    deployed: 'September 2020',
    balanceAbi: 'function userInfo(uint256, address) view returns (uint256, uint256)',
    balanceArgs: (user) => [0, user],
    balanceCall: 'userInfo',
    balanceTransform: (result) => result[0],
    withdrawAbi: 'function emergencyWithdraw(uint256)',
    withdrawArgs: () => [0],
    withdrawCall: 'emergencyWithdraw',
    returnsWeth: true,
    category: 'masterchef',
  },
  bdpmaster: {
    name: 'BDPMaster',
    desc: 'Abandoned MasterChef-style farm. Pool 1 accepts direct WETH stakes; ~1.74 WETH sits in the contract for 8 stakers. The standard withdraw() flow is BROKEN — the contract tries to mint BDPToken rewards, but BDPToken\'s minter role was revoked, so withdraw() reverts. Use emergencyWithdraw(1) instead — it skips reward minting and returns your stake cleanly.',
    color: '#a855f7',
    contract: '0x0de845955e2bf089012f682fe9bc81dd5f11b372',
    deployed: 'September 2020',
    balanceAbi: 'function userInfo(uint256, address) view returns (uint256, uint256)',
    balanceArgs: (user) => [1, user],
    balanceCall: 'userInfo',
    balanceTransform: (result) => result[0],
    withdrawAbi: 'function emergencyWithdraw(uint256)',
    withdrawArgs: () => [1],
    withdrawCall: 'emergencyWithdraw',
    returnsWeth: true,
    category: 'masterchef',
  },
  vlb: {
    name: 'VLB Token',
    desc: 'Velix.AI ran its December 2017 ICO via the OpenZeppelin RefundableCrowdsale pattern. The sale missed its 5,000 ETH soft cap (raised ~4,900 ETH), the contract finalized into refund mode, and most depositors clawed back over the following months. ~81 ETH still sits in the sibling RefundVault waiting for the long tail of stragglers. Single-tx claim: claimRefund() on the crowdsale delegates to the vault and returns your original deposit.',
    color: '#0d9488',
    contract: '0xd7e011ad27b6128934e2afd1763120ede1274ae4',
    balanceContract: '0x93519cc1a51ac56cf2daa8aaafcd4073f49a19d8',
    deployed: 'December 2017',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  vlb_lino: {
    name: 'VLB / Lino',
    desc: 'A Wings-incubated 2018 ICO that reused the same VLB-style RefundableCrowdsale code. The USD-denominated soft cap was missed, the contract finalized into refund mode, and ~17 ETH remained in the sibling RefundVault unclaimed. Same single-tx pattern: claimRefund() on the crowdsale returns your deposit through the vault.',
    color: '#0d9488',
    contract: '0xdea2bc436d38d4f8ee6f9e63b63b72a399c24e2c',
    balanceContract: '0x2cbc6812cff0b1113bf2808ffce6d83b97afd345',
    deployed: 'March 2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  fnt: {
    name: 'Friend Network Token',
    desc: 'FriendNetwork ran a 2018 ICO with a 25,000 ETH minimum cap. Only ~3,700 ETH was raised, finalize() routed the contract into refund mode, and ~16 ETH still sits in the sibling RefundVault for buyers who never came back to claim. Standard OZ pattern: claimRefund() on the crowdsale and the vault sends your original ETH back.',
    color: '#0d9488',
    contract: '0x7c33f3d417ef65a5299998bf7bbd35921963336c',
    balanceContract: '0x62bbb9fffd33d70a39fed4e7874163e8b97ea41b',
    deployed: 'June 2018',
    balanceAbi: 'function deposited(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'deposited',
    withdrawAbi: 'function claimRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimRefund',
    category: 'ico',
  },
  confideal: {
    name: 'Confideal',
    desc: 'Confideal was a smart contract platform letting non-technical users create and manage escrow deals on Ethereum without coding. Conducted an ICO in November 2017 for the CDL token, with a Bittrex listing deal. Included an arbitration module for dispute resolution. Failed to gain adoption and went inactive by 2019.',
    color: '#e11d48',
    contract: '0x22a97c80d7e0a9ae616737e3b8b531248f4ef91d',
    deployed: 'November 2017',
    balanceAbi: 'function contributions(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'contributions',
    withdrawAbi: 'function withdrawRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'withdrawRefund',
    category: 'ico',
  },
  dada: {
    name: 'DADA Collectible',
    desc: 'A collaborative digital art platform. Deployed its "Creeps & Weirdos" NFT collection on October 5, 2017, after CryptoPunks but before CryptoKitties. Featured 108 unique pieces by 30 artists and was the first NFT project to implement artist royalties coded directly into the smart contract, using a modified CryptoPunks contract.',
    category: 'nft',
    color: '#ec4899',
    contract: '0x068696a3cf3c4676b65f1c9975dd094260109d02',
    deployed: 'October 2017',
    balanceAbi: 'function pendingWithdrawals(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'pendingWithdrawals',
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
  },
  mooncatrescue: {
    name: 'MoonCatRescue',
    desc: 'Deployed August 9, 2017, one of the earliest NFTs on Ethereum, before the term "NFT" or ERC-721 existed. Features 25,440 generative pixel art cats with a proof-of-work minting mechanism. Only 3,365 cats were rescued in 2017; on March 12, 2021 crypto-archaeologists rediscovered it and all remaining 19,000+ cats were rescued within hours. Note: ~100 ETH from the genesis cat is permanently stuck at address(0) due to a contract bug. Users with pending adoption requests must cancel them to reclaim escrowed ETH.',
    category: 'nft',
    color: '#8b5cf6',
    contract: '0x60cd862c9c687a9de49aecdc3a99b74a4fc54ab6',
    deployed: 'August 2017',
    balanceAbi: 'function pendingWithdrawals(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'pendingWithdrawals',
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
    // Adoption request escrow: cancelAdoptionRequest(bytes5 catId) sends ETH directly
    cancelAbi: 'function cancelAdoptionRequest(bytes5 catId)',
  },
  fomo3d_long: {
    name: 'Fomo3D Long',
    desc: 'Players buy keys that reset a countdown timer; the last buyer wins the jackpot. Round 1 ended August 2018 paying 10,469 ETH (~$2.8M), won via a block-stuffing attack that prevented competing transactions. At peak, the contract held over $43M. Note: the isHuman modifier means smart contract wallets cannot withdraw, only EOAs.',
    category: 'gambling',
    color: '#ef4444',
    contract: '0xA62142888ABa8370742bE823c1782D17A0389Da1',
    deployed: 'July 2018',
    balanceAbi: 'function getPlayerInfoByAddress(address) view returns (uint256, bytes32, uint256, uint256, uint256, uint256, uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'getPlayerInfoByAddress',
    balanceTransform: (result) => result[3] + result[4] + result[5],
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
  },
  fomo3d_quick: {
    name: 'Fomo3D Quick',
    desc: 'A faster-round variant of Fomo3D (2018) with shorter countdown durations. Same key-purchase mechanic and dividend system as Fomo3D Long. Note: isHuman modifier, so smart contract wallets cannot withdraw.',
    category: 'gambling',
    color: '#f97316',
    contract: '0x4e8ecf79ade5e2c49b9e30d795517a81e0bf00b8',
    deployed: 'July 2018',
    balanceAbi: 'function getPlayerInfoByAddress(address) view returns (uint256, bytes32, uint256, uint256, uint256, uint256, uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'getPlayerInfoByAddress',
    balanceTransform: (result) => result[3] + result[4] + result[5],
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
  },
  fomo3d_short: {
    name: 'Fomo3D Short',
    desc: 'Another variant of Fomo3D (2018). Same core mechanics: key purchases, countdown timer, dividend distribution. Note: isHuman modifier, so smart contract wallets cannot withdraw.',
    category: 'gambling',
    color: '#fb923c',
    contract: '0x52083b1a21a5abc422b1b0bce5c43ca86ef74cd1',
    deployed: 'July 2018',
    balanceAbi: 'function getPlayerInfoByAddress(address) view returns (uint256, bytes32, uint256, uint256, uint256, uint256, uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'getPlayerInfoByAddress',
    balanceTransform: (result) => result[3] + result[4] + result[5],
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
  },
  etherdelta_m0: {
    name: 'EtherDelta v0',
    desc: 'The earliest EtherDelta contract, deployed around August 2016 using Solidity v0.3.6, one of the very first DEX contracts on Ethereum, deployed just months after the DAO hack. The team iterated through multiple versions (Oct 2016, Feb 2017) before the well-known v2; each upgrade required manual migration.',
    color: '#d97706',
    contract: '0x4aea7cf559f67cedcad07e12ae6bc00f07e8cf65',
    deployed: 'August 2016',
    balanceAbi: 'function balanceOf(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  neufund: {
    name: 'Neufund EtherToken',
    desc: 'Founded in 2016 in Berlin, Neufund conducted the world\'s first public offering of tokenized equity on Ethereum in November 2018. Deployed over EUR 20M in capital for 11,000 investors from 123 countries; flagship case Greyp Bikes completed the full cycle from tokenization to Porsche acquisition. Shut down January 17, 2022 after years of regulatory uncertainty with BaFin.',
    category: 'ico',
    color: '#0d9488',
    contract: '0xb59a226a2b8a2f2b0512baa35cc348b6b213b671',
    deployed: 'November 2017',
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  neufund_locked: {
    name: 'Neufund',
    desc: 'The ICBM (Initial Capital Building Mechanism) escrow contract where Neufund investors locked ETH in exchange for Neumark (NEU) tokens. All 540-day lock periods expired in 2019. To recover ETH: approveAndCall on NEU (unlocks + returns ETH-T in one tx), then withdraw ETH-T to raw ETH.',
    category: 'ico',
    color: '#0d9488',
    contract: '0xb1E4675f0dBE360bA90447A7e58c62C762Ad62D4',
    deployed: 'November 2017',
    balanceAbi: 'function balanceOf(address) view returns (uint256, uint256, uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    balanceTransform: (result) => result[0],
    withdrawAbi: null,
    withdrawCall: null,
    neufundLocked: {
      neuToken: '0xa823e6722006afe99e91c30ff5295052fe6b8e32',
      etherToken: '0xb59a226a2b8a2f2b0512baa35cc348b6b213b671',
      lockedAccount: '0xb1E4675f0dBE360bA90447A7e58c62C762Ad62D4',
    },
  },
  digixdao: {
    name: 'DigixDAO',
    desc: 'DigixDAO launched in March 2016 as one of Ethereum\'s first DAOs, raising 466,648 ETH in a crowdsale that filled its hard cap in just 12 hours. The DAO funded development of Digix\'s gold-backed DGX token, but after years of limited adoption, token holders voted 97% in favor of dissolution via Project Ragnarok in January 2020. The Acid refund contract was deployed in March 2020, allowing any DGD holder to permanently burn their tokens for a pro-rata share of the treasury at roughly 0.193 ETH per DGD.',
    category: 'ico',
    color: '#d4a017',
    contract: '0xe0b7927c4af23765cb51314a0e0521a9645f0e2a',
    deployed: 'March 2016',
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    balanceTransform: (result) => {
      // DGD raw balance (9 decimals) × weiPerNanoDGD = wei value
      return result * 193054178n;
    },
    withdrawAbi: null,
    withdrawCall: null,
    digixBurn: {
      dgdToken: '0xe0b7927c4af23765cb51314a0e0521a9645f0e2a',
      acidContract: '0x23Ea10CC1e6EBdB499D24E45369A35f43627062f',
      rateEthPerDgd: 0.193054,
    },
  },
  tessera_dead: {
    name: 'Tessera: Party of Living Dead',
    desc: 'Fractional Art (later Tessera) fractionalized NFTs into ERC-20 tokens. When a buyout auction completed, fraction holders could burn tokens for proportional ETH via cash(). Tessera shut down in May 2023; the frontend is dead but contracts remain functional.',
    category: 'nft',
    color: '#991b1b',
    contract: '0x0c7060bf06a78aaaab3fac76941318a52a3f4613',
    deployed: '2021',
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    // balanceTransform computed dynamically in the check flow (needs vault ETH + totalSupply)
    tesseraVault: true,
    balanceTransform: (result) => result * 53440000000000000000n / 33976000000000000000000n,
    withdrawAbi: 'function cash()',
    withdrawArgs: () => [],
    withdrawCall: 'cash',
  },
  tessera_sweep: {
    name: 'Tessera: Dingaling BAYC Sweep',
    desc: 'Fractional Art (later Tessera) fractionalized NFTs into ERC-20 tokens. When a buyout auction completed, fraction holders could burn tokens for proportional ETH via cash(). Tessera shut down in May 2023; the frontend is dead but contracts remain functional.',
    category: 'nft',
    color: '#991b1b',
    contract: '0xfe2a5b942083d92135c7fe364bb75218e547cc62',
    deployed: '2021',
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    tesseraVault: true,
    balanceTransform: (result) => result * 20580000000000000000n / 1487317000000000000000000n,
    withdrawAbi: 'function cash()',
    withdrawArgs: () => [],
    withdrawCall: 'cash',
  },
  tessera_zcat: {
    name: 'Tessera: ZombieCats',
    desc: 'Fractional Art (later Tessera) fractionalized NFTs into ERC-20 tokens. When a buyout auction completed, fraction holders could burn tokens for proportional ETH via cash(). Tessera shut down in May 2023; the frontend is dead but contracts remain functional.',
    category: 'nft',
    color: '#991b1b',
    contract: '0xdb846f1cd31acc9a6db72a1c58dc1760485505f4',
    deployed: '2021',
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    tesseraVault: true,
    balanceTransform: (result) => result * 15630000000000000000n / 1460378000000000000000000n,
    withdrawAbi: 'function cash()',
    withdrawArgs: () => [],
    withdrawCall: 'cash',
  },
  kyber_feehandler: {
    name: 'Kyber FeeHandler',
    desc: 'Kyber Network v1 (Katalyst) distributed ETH trading fees to KNC stakers who voted in governance epochs. Kyber has since migrated to KyberSwap with a different architecture. The old staking UI is dead, but the FeeHandler contract still holds unclaimed epoch rewards with no expiration.',
    category: 'dex',
    color: '#31cb9e',
    contract: '0xd3d2b5643e506c6d9b7099e9116d7aaa941114fe',
    deployed: 'July 2020',
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    // Balance check uses pre-computed data (epoch iteration too complex for live RPC)
    noWalletCheck: true,
    withdrawAbi: null,
    withdrawCall: null,
    kyberFeeHandler: {
      feeHandler: '0xd3d2b5643e506c6d9b7099e9116d7aaa941114fe',
      maxEpoch: 21,
    },
  },
  nucypher_worklock: {
    name: 'NuCypher WorkLock',
    desc: 'NuCypher launched a WorkLock distribution in September 2020, where participants deposited ETH to receive NU tokens. ETH was refundable after completing staking work. NuCypher merged with Keep Network to form Threshold Network in 2022, and the staking requirement was removed, so all participants now qualify for a full refund regardless of work completed.',
    category: 'ico',
    color: '#1e40af',
    contract: '0xe9778e69a961e64d3cdbb34cf6778281d34667c2',
    deployed: 'September 2020',
    balanceAbi: 'function workInfo(address) view returns (uint256 depositedETH, uint256 completedWork, bool claimed, uint128 index)',
    balanceArgs: (user) => [user],
    balanceCall: 'workInfo',
    balanceTransform: (result) => result[0],
    withdrawAbi: null,
    withdrawCall: null,
    nucypherWorklock: {
      contract: '0xe9778e69a961e64d3cdbb34cf6778281d34667c2',
    },
  },
  bancor_eth: {
    name: 'Bancor Old ETH Token',
    desc: 'Bancor launched June 2017 with a then-record $153M ICO and deployed the first-ever automated market maker contracts on Ethereum, inventing bonding curves and liquidity pool tokens before "DeFi" was coined. On July 9, 2018, attackers stole 25,000 ETH (~$12.5M) via a compromised upgrade wallet. This is the legacy ETH wrapper from Bancor\'s early architecture.',
    category: 'ico',
    color: '#1d4ed8',
    contract: '0xD76b5c2A23ef78368d8E34288B5b65D616B746aE',
    deployed: 'June 2017',
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  switchdex: {
    name: 'SwitchDex',
    desc: 'An EtherDelta-fork DEX by Switch.ag (2019), notable for being active from 2019-2024 with 8,000+ trades, unusually long-lived for an order-book DEX in the AMM era.',
    color: '#7c3aed',
    contract: '0xc3c12a9e63e466a3ba99e07f3ef1f38b8b81ae1b',
    deployed: 'March 2019',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  coinchangex: {
    name: 'Coinchangex',
    desc: 'An EtherDelta-fork DEX (2018) that shut down around March 2020. Processed a moderate volume of trades during the ICO token trading era.',
    color: '#dc2626',
    contract: '0x2f23228b905ceb4734eb42d9b42805296667c93b',
    deployed: 'May 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  swisscryptoexchange: {
    name: 'SwissCryptoExchange',
    desc: 'A whitelisted EtherDelta-fork DEX (2018). Unusual in that deposits required whitelist approval, but the withdraw function is permissionless. Anyone with a balance can withdraw.',
    color: '#b91c1c',
    contract: '0xbeeb655808e3bdb83b6998f09dfe1e0f2c66a9be',
    deployed: 'August 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  lscx: {
    name: 'LSCX',
    desc: 'The DEX component of Lescovex, a Spanish platform for issuing and trading Ethereum financial contracts (October 2018). Part of a broader ecosystem that included tokenized securities and smart contract templates.',
    color: '#059669',
    contract: '0x3da70c70b9574ff185b31d70878a8e3094603c4c',
    deployed: 'November 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  bitcratic_v1: {
    name: 'Bitcratic v1',
    desc: 'The original Bitcratic contract before the team migrated to a newer version. Users who didn\'t move their funds to the updated contract still have balances here.',
    color: '#ca8a04',
    contract: '0x232ba9f3b3643ab28d28ed7ee18600708d60e5fe',
    deployed: 'January 2019',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  marketplace: {
    name: 'MarketPlace',
    desc: 'An EtherDelta-fork DEX from the 2017-2018 era. One of dozens of exchanges that cloned EtherDelta\'s open-source smart contract to launch competing trading platforms.',
    color: '#16a34a',
    contract: '0x2f13fa06c0efd2a5c4cf2175a0467084672e648b',
    deployed: 'June 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  bitox: {
    name: 'Bitox',
    desc: 'An EtherDelta-fork DEX that also offered airdrop aggregation services (2018). Combined token trading with a directory of active ERC-20 airdrops.',
    color: '#0891b2',
    contract: '0xb5adb233f28c86cef693451b67e1f2d41da97d21',
    deployed: 'April 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  ed_fork_6_9eth: {
    name: 'ED Fork (0xc513)',
    desc: 'An unverified EtherDelta v2 fork. Source code not published on Etherscan but bytecode matches the standard pattern.',
    color: '#a855f7',
    contract: '0xc5138d4bd0ec5c51b6b6bdfcb8528ad9c333af97',
    deployed: 'September 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  ethernext: {
    name: 'Ethernext',
    desc: 'An EtherDelta-fork DEX from the 2017-2018 era. One of dozens of exchanges that cloned EtherDelta\'s open-source smart contract to launch competing trading platforms.',
    color: '#2563eb',
    contract: '0x499197314f9903a1ba9bed7ee54cd9eee5900e49',
    deployed: 'May 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  seeddex_v2: {
    name: 'SeedDex v2',
    desc: 'An EtherDelta-fork DEX from the 2017-2018 era. One of dozens of exchanges that cloned EtherDelta\'s open-source smart contract to launch competing trading platforms.',
    color: '#65a30d',
    contract: '0xd4cc0cda97ec567235b7019c655ec75cd361f712',
    deployed: 'September 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  seeddex_v3: {
    name: 'SeedDex v3',
    desc: 'An EtherDelta-fork DEX from the 2017-2018 era. One of dozens of exchanges that cloned EtherDelta\'s open-source smart contract to launch competing trading platforms.',
    color: '#4d7c0f',
    contract: '0xcf25ebd54120cf2e4137fab0a91a7f7403a5debf',
    deployed: 'May 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  polarisdex: {
    name: 'PolarisDEX',
    desc: 'An EtherDelta-fork DEX from the 2017-2018 era. One of dozens of exchanges that cloned EtherDelta\'s open-source smart contract to launch competing trading platforms.',
    color: '#0284c7',
    contract: '0x25066b77ae6174d372a9fe2b1d7886a2be150e9b',
    deployed: 'January 2019',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  ethmall: {
    name: 'Ethmall',
    desc: 'An EtherDelta-fork DEX from the 2017-2018 era. One of dozens of exchanges that cloned EtherDelta\'s open-source smart contract to launch competing trading platforms.',
    color: '#9333ea',
    contract: '0x2b44d68555899dbc1ab0892e7330476183dbc932',
    deployed: 'July 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  extoke: {
    name: 'ExToke',
    desc: 'A fee-free DEX for ERC-20 tokens (2018) that planned to add an ICO launchpad feature. Conducted its own token sale but failed to gain traction.',
    color: '#0e7490',
    contract: '0x97c9e0eccc27efef7330e89a8c9414623ba2ee0f',
    deployed: 'June 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  algodex: {
    name: 'AlgoDEX',
    desc: 'An EtherDelta-fork DEX from the 2017-2018 era. One of dozens of exchanges that cloned EtherDelta\'s open-source smart contract to launch competing trading platforms.',
    color: '#7e22ce',
    contract: '0x4bc78f6619991b029b867b6d88d39c196332aba3',
    deployed: 'December 2019',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  ndex: {
    name: 'nDEx',
    desc: 'An EtherDelta-fork DEX from the 2017-2018 era. One of dozens of exchanges that cloned EtherDelta\'s open-source smart contract to launch competing trading platforms.',
    color: '#6d28d9',
    contract: '0x51a2b1a38ec83b56009d5e28e6222dbb56c23c22',
    deployed: 'September 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  edex: {
    name: 'EDex',
    desc: 'An EtherDelta-fork DEX from the 2017-2018 era. One of dozens of exchanges that cloned EtherDelta\'s open-source smart contract to launch competing trading platforms.',
    color: '#d97706',
    contract: '0x4fbcfa90ac5a1f7f70b7ecc6dc1589bbe6904b02',
    deployed: 'September 2019',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  tradexone: {
    name: 'TradexOne',
    desc: 'An EtherDelta-fork DEX from the 2017-2018 era. One of dozens of exchanges that cloned EtherDelta\'s open-source smart contract to launch competing trading platforms.',
    color: '#0d9488',
    contract: '0xf61a285edf078536a410a5fbc28013f9660e54a8',
    deployed: 'October 2018',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  afrodex: {
    name: 'Afrodex',
    desc: 'An EtherDelta-fork DEX from the 2017-2018 era. One of dozens of exchanges that cloned EtherDelta\'s open-source smart contract to launch competing trading platforms.',
    color: '#ea580c',
    contract: '0xe8fff15bb5e14095bfdfa8bb85d83cc900c23c56',
    deployed: 'December 2019',
    balanceAbi: 'function tokens(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'tokens',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  readyplayerone: {
    name: 'ReadyPlayerONE',
    desc: 'Deployed July 2018, a Fomo3D fork named after the Ernest Cline novel and Spielberg film. Same key-purchase countdown mechanic where the last buyer before the timer expires wins the pot. Note: isHuman modifier, so smart contract wallets cannot withdraw.',
    category: 'gambling',
    color: '#ef4444',
    contract: '0x6db943251e4126f913e9733821031791e75df713',
    deployed: 'July 2018',
    balanceAbi: 'function getPlayerInfoByAddress(address) view returns (uint256, bytes32, uint256, uint256, uint256, uint256, uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'getPlayerInfoByAddress',
    balanceTransform: (result) => result[3] + result[4] + result[5],
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
  },
  lastwinner: {
    name: 'Last Winner',
    desc: 'A Fomo3D-style gambling game deployed in 2018, also known as "Last Winner", one of the largest Fomo3D clones by total ETH volume. Players purchase keys that extend a countdown timer; when the timer runs out, the last buyer wins the pot. Unclaimed dividends and affiliate earnings remain withdrawable. Note: isHuman modifier, so smart contract wallets cannot withdraw.',
    category: 'gambling',
    color: '#ef4444',
    contract: '0xDd9fd6b6F8f7ea932997992bbE67EabB3e316f3C',
    deployed: 'August 2018',
    balanceAbi: 'function getPlayerInfoByAddress(address) view returns (uint256, bytes32, uint256, uint256, uint256, uint256, uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'getPlayerInfoByAddress',
    balanceTransform: (result) => result[3] + result[4] + result[5],
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
  },
  fomo3d_lightning: {
    name: 'FoMo3D Lightning',
    desc: 'One of the earliest Fomo3D clones, deployed July 2018 within weeks of the original. A speed-round variant of the countdown-timer game where rounds resolved faster than standard Fomo3D. Note: isHuman modifier, so smart contract wallets cannot withdraw.',
    category: 'gambling',
    color: '#f97316',
    contract: '0x24da016c06941ec2c92be28e0a2b2e679f0d1dc7',
    deployed: 'July 2018',
    balanceAbi: 'function getPlayerInfoByAddress(address) view returns (uint256, bytes32, uint256, uint256, uint256, uint256, uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'getPlayerInfoByAddress',
    balanceTransform: (result) => result[3] + result[4] + result[5],
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
  },
  etherdelta_v3: {
    name: 'Etheropt Old',
    desc: 'The first decentralized options exchange on Ethereum (early 2016), from the creator of EtherDelta. Offered vanilla call and put options on ETH/USD using Poloniex and Coindesk data verified by Reality Keys. Entirely autonomous with no owner and no fees. Shut down in late 2016.',
    color: '#78716c',
    contract: '0xc6b330df38d6ef288c953f1f2835723531073ce2',
    deployed: 'July 2016',
    balanceAbi: 'function balanceOf(address, address) view returns (uint256)',
    balanceArgs: (user) => [ZERO_ADDR, user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  gandhiji: {
    name: 'GandhiJi',
    desc: 'was a P3D clone (2018) themed around Indian independence. Direct fork of PoWH3D with identical 10% buy/sell fee mechanics. 8,800+ holders. Fully autonomous, no owner.',
    category: 'gambling',
    color: '#f59e0b',
    contract: '0x167cB3F2446F829eb327344b66E271D1a7eFeC9A',
    deployed: 'April 2018',
    balanceAbi: 'function dividendsOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividendsOf',
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
    exitAbi: 'function exit()',
    exitArgs: () => [],
    exitCall: 'exit',
  },
  zethr: {
    name: 'Zethr',
    desc: 'was a P3D-style casino token (2018) where holders "be the house." Users pick dividend rates (2-33%). Includes slots and other casino games. This is the token contract holding user dividends.',
    category: 'gambling',
    color: '#7c3aed',
    contract: '0xd48b633045af65ff636f3c6edd744748351e020d',
    deployed: 'June 2018',
    balanceAbi: 'function dividendsOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividendsOf',
    withdrawAbi: 'function withdraw(address _recipient)',
    withdrawArgs: (amount, user) => [user || ZERO_ADDR],
    withdrawCall: 'withdraw',
    exitAbi: 'function exit(address _recipient)',
    exitArgs: (amount, user) => [user || ZERO_ADDR],
    exitCall: 'exit',
    withdrawNeedsUser: true,
  },
  zethr_main: {
    name: 'Zethr Casino',
    desc: 'was the main Zethr casino bankroll contract (2018). Holds house funds and player dividends from casino games.',
    category: 'gambling',
    color: '#6d28d9',
    contract: '0xb9ab8eed48852de901c13543042204c6c569b811',
    deployed: 'June 2018',
    balanceAbi: 'function dividendsOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividendsOf',
    withdrawAbi: 'function withdraw(address _recipient)',
    withdrawArgs: (amount, user) => [user || ZERO_ADDR],
    withdrawCall: 'withdraw',
    exitAbi: 'function exit(address _recipient)',
    exitArgs: (amount, user) => [user || ZERO_ADDR],
    exitCall: 'exit',
    withdrawNeedsUser: true,
  },
  ethpyramid: {
    name: 'EthPyramid',
    desc: 'was the original Ethereum dividend/pyramid token (early 2018), predating PoWH3D. Later rebranded to EthPhoenix.',
    category: 'gambling',
    color: '#b45309',
    contract: '0x2fa0ac498d01632f959d3c18e38f4390b005e200',
    deployed: 'February 2018',
    balanceAbi: 'function dividends(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividends',
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
  },
  fomogame: {
    name: 'FoMoGame',
    desc: 'was a Fomo3D clone (2018). Same countdown/key-buying mechanics with player vaults.',
    category: 'gambling',
    color: '#ea580c',
    contract: '0x86D179c28cCeb120Cd3f64930Cf1820a88B77D60',
    deployed: 'July 2018',
    balanceAbi: 'function getPlayerInfoByAddress(address) view returns (uint256, bytes32, uint256, uint256, uint256, uint256, uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'getPlayerInfoByAddress',
    balanceTransform: (result) => result[3] + result[4] + result[5],
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
  },
  powh3d: {
    name: 'PoWH3D',
    desc: 'A self-aware Ponzi-style token game (February 2018) rewritten after the original PoWH was drained of 200+ ETH via an integer overflow bug. Every buy and sell of P3D tokens incurs a 10% fee distributed to all existing holders. At peak held 16,000 ETH (~$6.4M). Spawned thousands of forks including Fomo3D.',
    category: 'gambling',
    color: '#dc2626',
    contract: '0xB3775fB83F7D12A36E0475aBdD1FCA35c091efBe',
    deployed: 'February 2018',
    balanceAbi: 'function dividendsOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividendsOf',
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
    // exit() sells all P3D tokens (10% fee) + withdraws dividends in one call
    exitAbi: 'function exit()',
    exitArgs: () => [],
    exitCall: 'exit',
  },
  powm: {
    name: 'POWM',
    desc: 'Proof of Weak Math, deployed April 2018 during the first wave of P3D clones. Named as a jab at PoWL, an earlier clone with a coding error that broke its dividend math. Featured a 20% fee and briefly held over 4,000 ETH.',
    category: 'gambling',
    color: '#b91c1c',
    contract: '0xa146240bf2c04005a743032dc0d241ec0bb2ba2b',
    deployed: 'April 2018',
    balanceAbi: 'function dividendsOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividendsOf',
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
    exitAbi: 'function exit()',
    exitArgs: () => [],
    exitCall: 'exit',
  },
  pooh: {
    name: 'POOH',
    desc: 'Deployed April 2018, POOH branded itself as "the most honest P3D clone" and an "honest proof of cloning." Same 10% buy/sell fee mechanics as PoWH3D, hosted at number2.io.',
    category: 'gambling',
    color: '#92400e',
    contract: '0x4c29d75cc423e8adaa3839892feb66977e295829',
    deployed: 'April 2018',
    balanceAbi: 'function dividendsOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividendsOf',
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
    exitAbi: 'function exit()',
    exitArgs: () => [],
    exitCall: 'exit',
  },
  powtf: {
    name: 'PoWTF',
    desc: 'Short for "Proof of World Trade Francs," deployed April 2018. Named after a fictional stablecoin jokingly proposed by Vitalik Buterin. Featured higher fees than standard P3D: 20% on buys and 25% on sells.',
    category: 'gambling',
    color: '#9f1239',
    contract: '0x702392282255f8c0993dbbbb148d80d2ef6795b1',
    deployed: 'April 2018',
    balanceAbi: 'function dividendsOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividendsOf',
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
    exitAbi: 'function exit()',
    exitArgs: () => [],
    exitCall: 'exit',
  },
  powh_clone1: {
    name: 'Hourglass Clone A',
    desc: 'An unnamed PoWH3D fork deployed April 2018, using the same Hourglass dividend token contract with no meaningful modifications. One of dozens of near-identical clones launched during the P3D craze.',
    category: 'gambling',
    color: '#881337',
    contract: '0xe1c9a03cf690256ff7738cbd508c88cf5238a535',
    deployed: 'April 2018',
    balanceAbi: 'function dividendsOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividendsOf',
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
    exitAbi: 'function exit()',
    exitArgs: () => [],
    exitCall: 'exit',
  },
  powh_clone2: {
    name: 'Hourglass Clone B',
    desc: 'Another unbranded Hourglass contract deployed April 2018. A direct copy of the PoWH3D source code with identical 10% buy/sell fees distributed to token holders.',
    category: 'gambling',
    color: '#7f1d1d',
    contract: '0x34ba9c7402e1df11709c7983008b5a49d59e963f',
    deployed: 'April 2018',
    balanceAbi: 'function dividendsOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividendsOf',
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
    exitAbi: 'function exit()',
    exitArgs: () => [],
    exitCall: 'exit',
  },
  lockedin: {
    name: 'LOCKEDiN',
    desc: 'Deployed April 2018, LOCKEDiN was a PoWH3D fork that emphasized the "lock in your ETH for dividends" angle. Standard Hourglass mechanics where every transaction fee is split among all existing token holders.',
    category: 'gambling',
    color: '#6b21a8',
    contract: '0xdb4837c9d84315abcde80a865f15178f86db3966',
    deployed: 'April 2018',
    balanceAbi: 'function dividendsOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividendsOf',
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
    exitAbi: 'function exit()',
    exitArgs: () => [],
    exitCall: 'exit',
  },
  stronghold: {
    name: 'StrongHold',
    desc: 'A PoWH3D clone from April 2018 that branded itself as a safer, more resilient version of the P3D dividend model. Used the same autonomous contract mechanics with no owner and no self-destruct.',
    category: 'gambling',
    color: '#5b21b6',
    contract: '0x7e7e645e9121dddaf87d0434feb9f113d1dbbb41',
    deployed: 'April 2018',
    balanceAbi: 'function dividendsOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividendsOf',
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
    exitAbi: 'function exit()',
    exitArgs: () => [],
    exitCall: 'exit',
  },
  powh_clone3: {
    name: 'Hourglass Clone C',
    desc: 'Deployed April 2018 at the peak of the PoWH3D clone wave. An unmodified copy of the Hourglass dividend contract where holding tokens earns a share of all future buy and sell fees.',
    category: 'gambling',
    color: '#4c1d95',
    contract: '0x7b6c511a94d35b9cf9979b727335c9798edb5c64',
    deployed: 'April 2018',
    balanceAbi: 'function dividendsOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividendsOf',
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
    exitAbi: 'function exit()',
    exitArgs: () => [],
    exitCall: 'exit',
  },
  powh_clone4: {
    name: 'Hourglass Clone D',
    desc: 'Yet another April 2018 Hourglass fork, part of the rapid proliferation of P3D clones that flooded Ethereum in spring 2018. Identical dividend token mechanics with 10% fees on every transaction.',
    category: 'gambling',
    color: '#831843',
    contract: '0xf5aa54d121dfe0d5eeb37c83aed42238f4f2c5c6',
    deployed: 'April 2018',
    balanceAbi: 'function dividendsOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividendsOf',
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
    exitAbi: 'function exit()',
    exitArgs: () => [],
    exitCall: 'exit',
  },
  p4d: {
    name: 'P4D',
    desc: 'A PoWH3D clone from 2018. Standard Hourglass dividend mechanics where ETH deposits mint tokens and trading fees generate passive income for holders.',
    category: 'gambling',
    color: '#dc2626',
    contract: '0x96a4ed03206667017777f010dea4445823acb0fc',
    deployed: '2018',
    balanceAbi: 'function dividendsOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividendsOf',
    withdrawAbi: 'function withdraw(bool)',
    withdrawArgs: () => [true],
    withdrawCall: 'withdraw',
    exitAbi: 'function exit()',
    exitArgs: () => [],
    exitCall: 'exit',
  },
  unkoin: {
    name: 'UnKoin',
    desc: 'A PoWH3D clone from April 2018 with a play on "unknown coin." Standard Hourglass dividend mechanics where ETH deposits mint tokens and all trading activity generates passive income for holders.',
    category: 'gambling',
    color: '#701a75',
    contract: '0x5bedf488d29407bc08e77cd9ee292c2041a61c8c',
    deployed: 'April 2018',
    balanceAbi: 'function dividendsOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividendsOf',
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
    exitAbi: 'function exit()',
    exitArgs: () => [],
    exitCall: 'exit',
  },
  acedapp: {
    name: 'AceDapp',
    desc: 'Deployed October 2019, a late-era PoWH3D clone that launched well after most P3D forks had already lost their user bases. Standard Hourglass dividend mechanics with 10% buy/sell fees.',
    category: 'gambling',
    color: '#9f1239',
    contract: '0xe65f525ec48c7e95654b9824ecc358454ea9185e',
    deployed: 'October 2019',
    balanceAbi: 'function dividendsOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'dividendsOf',
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
    withdrawCall: 'withdraw',
    exitAbi: 'function exit()',
    exitArgs: () => [],
    exitCall: 'exit',
  },
  cryptominertoken: { name: 'CryptoMinerToken', desc: 'was a dividend-yielding PoWH3D clone (September 2018) hosted at minertoken.cloud, with customized fee tiers: 10% deposit, 4% withdrawal, 1% transfer, and 33% referral rewards.', category: 'gambling', color: '#a16207', contract: '0x0a97094c19295e320d5121d72139a150021a2702', deployed: 'September 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  bluechip: { name: 'BlueChip', desc: 'was a PoWH3D clone (September 2019) implementing the standard 10% fee-sharing dividend mechanism where trading activity generates ETH rewards for token holders.', category: 'gambling', color: '#4338ca', contract: '0xabefec93451a2cd5d864ff7b0b1604dfc60e9688', deployed: 'September 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  rev1: { name: 'REV1', desc: 'Deployed May 2018, REV1 was an early PoWH3D fork from the second month of the P3D clone wars. Straightforward dividend token where 10% of every buy and sell is redistributed to holders.', category: 'gambling', color: '#0e7490', contract: '0x05215fce25902366480696f38c3093e31dbce69a', deployed: 'May 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  potj: { name: 'POTJ', desc: 'Proof of Trevon James, launched April 2018, was a PoWH3D fork with higher fees (20% buys, 25% sells) themed around a crypto YouTube personality involved in the BitConnect case.', category: 'gambling', color: '#b45309', contract: '0xc28e860c9132d55a184f9af53fc85e90aa3a0153', deployed: 'April 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  lynia: { name: 'LYNIA', desc: 'A gaming and gambling platform deployed August 2018 that combined PoWH3D-style dividend tokens with provably fair on-chain games. Has an isHuman modifier, so smart contract wallets cannot withdraw.', category: 'gambling', color: '#86198f', contract: '0xecfae6f958f7ab15bdf171eeefa568e41eabf641', deployed: 'August 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  blackgold: { name: 'BlackGoldEthereum', desc: 'was a dividend-based PoWH3D clone (July 2020) designed to provide passive income to token holders through a buy/sell/reinvestment mechanism. The project website blackgoldethereum.club is no longer accessible.', category: 'gambling', color: '#374151', contract: '0xf72b0b36723f60402cccad7f4358acf2ad474c17', deployed: 'July 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  proofofcraiggrant: { name: 'ProofOfCraigGrant', desc: 'Deployed April 2018, a meme-themed PoWH3D fork named after Craig Grant, one of BitConnect\'s most prominent YouTube promoters. Part of a series of personality-themed P3D clones alongside Proof of Trevon James.', category: 'gambling', color: '#78350f', contract: '0xea61319f55b6543962fe1d7bd990ef74849fc54f', deployed: 'April 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  sportcrypt: { name: 'SportCrypt', desc: 'was a peer-to-peer decentralized sports betting exchange (January 2018) with zero fees and no KYC requirements. Later rebranded to Degens and received a MakerDAO community grant to accept DAI alongside ETH.', category: 'gambling', color: '#166534', contract: '0x37304b0ab297f13f5520c523102797121182fb5b', deployed: 'January 2018', balanceAbi: 'function getBalance(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'getBalance', withdrawAbi: 'function withdraw(uint256 amount)', withdrawArgs: (amount) => [amount], withdrawCall: 'withdraw' },
  dailydivs: { name: 'DailyDivs', desc: 'was a PoWH3D clone (October 2018) offering daily dividend distributions to token holders through a 10% buy/sell fee. Has an isHuman modifier, so smart contract wallets cannot withdraw.', category: 'gambling', color: '#92400e', contract: '0xd2bfceeab8ffa24cdf94faa2683df63df4bcbdc8', deployed: 'October 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  proofofcommunity: { name: 'ProofOfCommunity', desc: 'A May 2018 PoWH3D fork that rebranded the dividend token concept around community ownership. Same underlying Hourglass mechanics where all transaction fees are split among existing holders.', category: 'gambling', color: '#1e3a5f', contract: '0x1739e311ddbf1efdfbc39b74526fd8b600755ada', deployed: 'May 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  bitconnect_powh: { name: 'BitConnect Token', desc: 'Deployed June 2019, a PoWH3D clone that borrowed the BitConnect name a year and a half after the original lending platform collapsed. Standard dividend token mechanics; unrelated to the actual BitConnect project.', category: 'gambling', color: '#581c87', contract: '0xfcd3a0f5f416e407647a7518b90354946d316059', deployed: 'June 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  eightherbank: { name: 'Eightherbank', desc: 'A November 2019 PoWH3D fork with a banking theme. Uses the Hourglass dividend model with an isHuman modifier, so smart contract wallets cannot withdraw.', category: 'gambling', color: '#581c87', contract: '0xc6e5e9c6f4f3d1667df6086e91637cc7c64a13eb', deployed: 'November 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  nexgen: { name: 'Nexgen', desc: 'Deployed June 2019, a PoWH3D clone that positioned itself as a next-generation dividend token. Identical Hourglass mechanics to P3D with 10% fees on buys and sells.', category: 'gambling', color: '#581c87', contract: '0xffd31e68bf7af89df862435a138615bd60abf574', deployed: 'June 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  diamonddividend: { name: 'DiamondDividend', desc: 'A November 2019 PoWH3D fork using diamond-themed branding for the standard Hourglass dividend model. Holders earn ETH from all future transaction fees proportional to their token balance.', category: 'gambling', color: '#581c87', contract: '0x84cc06eddb26575a7f0afd7ec2e3e98d31321397', deployed: 'November 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  e25: { name: 'E25 Booster', desc: 'Deployed February 2019, a PoWH3D clone with a modified fee structure hinted at by its "25" branding. Has an isHuman modifier, so smart contract wallets cannot withdraw.', category: 'gambling', color: '#581c87', contract: '0xc3ad35d351b33783f27777e2ee1a4b6f96e4ee34', deployed: 'February 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  bitconnect2: { name: 'BitConnect v2', desc: 'The second in a series of BitConnect-themed PoWH3D clones, deployed June 2019. Reused the infamous brand name purely for attention; standard P3D dividend token under the hood.', category: 'gambling', color: '#581c87', contract: '0x568a693e1094b1e51e8053b2fc642da7161603f5', deployed: 'June 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  ethplatinum: { name: 'ETHPlatinum', desc: 'Deployed November 2021, one of the last PoWH3D clones ever created on Ethereum mainnet. By this point gas fees made the P3D dividend model largely impractical for small deposits.', category: 'gambling', color: '#581c87', contract: '0x510f9a9642ac14ded91629a1aad552be4b24b5f0', deployed: 'November 2021', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  divsnetwork: { name: 'DivsNetwork', desc: 'A July 2020 PoWH3D fork that framed itself as a dividend distribution network. Fully autonomous contract with no owner, running the same Hourglass token model as every other P3D clone.', category: 'gambling', color: '#581c87', contract: '0x26e6c899b5a5dc1d4874d828fda515a7eb7baf00', deployed: 'July 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  ethercenter: { name: 'EtherCenter', desc: 'Deployed July 2019, EtherCenter was a PoWH3D fork that added no meaningful features over the original. Standard 10% fee on every transaction, distributed pro rata to all token holders.', category: 'gambling', color: '#581c87', contract: '0x0e7c28fb8ed4f5f63aabd022deaeeba40ecc335c', deployed: 'July 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  redchip: { name: 'RedChip', desc: 'An October 2019 PoWH3D clone that borrowed stock market terminology. "Red chip" refers to mainland China companies listed in Hong Kong. Standard Hourglass dividend mechanics beneath the branding.', category: 'gambling', color: '#581c87', contract: '0xcd2de0bd5347f617f832442ebcc1c23a4d618847', deployed: 'October 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  cxxmain: { name: 'CxxMain', desc: 'Deployed November 2019 with a cryptic name that may reference C++ programming. A PoWH3D fork with unmodified Hourglass contract code and the same fee-redistribution mechanics.', category: 'gambling', color: '#581c87', contract: '0xa4dce3845cb88a6fca0291d4eca9e5a96e75e2b4', deployed: 'November 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  familyonly: { name: 'FamilyOnlyToken', desc: 'An August 2020 PoWH3D fork with an invitation-only theme suggested by its name. Same Hourglass dividend model where ETH deposits mint tokens and every trade generates passive income for all holders.', category: 'gambling', color: '#581c87', contract: '0xbedde30d3532165843f07b1b0e3e90fddbb75918', deployed: 'August 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  spw: { name: 'SPW', desc: 'Deployed June 2020, SPW was a minimal PoWH3D clone with no discernible branding or website. Pure Hourglass dividend contract mechanics.', category: 'gambling', color: '#581c87', contract: '0x586f3d9e3524eb02448691b158fdcf5ffc2c57b0', deployed: 'June 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  ethdiamond: { name: 'ETHDIAMOND', desc: 'A July 2020 PoWH3D clone using diamond-hands imagery. Identical dividend token contract to P3D. Buy and sell fees are pooled and shared among all token holders automatically.', category: 'gambling', color: '#581c87', contract: '0xca1cc76be1f5e5ee492859d8463653cb231991bc', deployed: 'July 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  ethershares: { name: 'Ethershares', desc: 'Deployed December 2018, Ethershares framed P3D-style token ownership as "shares" in an ETH revenue pool. Standard Hourglass mechanics with no technical differences from the original.', category: 'gambling', color: '#581c87', contract: '0x2c984ec9bb20b33deb84fbeedf20effda481fdc4', deployed: 'December 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  twelvehour: { name: 'TwelveHourToken', desc: 'An October 2018 PoWH3D fork, possibly named to suggest rapid dividend accumulation. Uses the same Hourglass contract where transaction fees are continuously redistributed to token holders.', category: 'gambling', color: '#581c87', contract: '0x8f6015289a64c48ccf258c21a999809fc553c3c4', deployed: 'October 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  neutrino81: { name: 'Neutrino81', desc: 'Deployed March 2019 with a physics-inspired name. A PoWH3D fork using the same autonomous dividend token contract with no owner, no admin keys, just the Hourglass buy/sell fee loop.', category: 'gambling', color: '#581c87', contract: '0x897d6c6772b85bf25b46c6f6da454133478ea6ab', deployed: 'March 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  hourglassx: { name: 'HourglassX', desc: 'A December 2018 PoWH3D fork that wore the "Hourglass" name openly. The original P3D contract was called Hourglass internally. Standard dividend mechanics with 10% transaction fees.', category: 'gambling', color: '#581c87', contract: '0x058a144951e062fc14f310057d2fd9ef0cf5095b', deployed: 'December 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  fairexchange: { name: 'FairExchange', desc: 'Deployed October 2018, FairExchange pitched the PoWH3D dividend model as a "fair" alternative to centralized exchanges. Under the surface, identical Hourglass contract code.', category: 'gambling', color: '#581c87', contract: '0xde2b11b71ad892ac3e47ce99d107788d65fe764e', deployed: 'October 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  pomda: { name: 'POMDA', desc: 'A June 2018 PoWH3D fork whose name likely riffs on "Proof of Mass Dividend Accumulation" or similar. Vanilla Hourglass contract: ETH in, tokens out, dividends from all activity.', category: 'gambling', color: '#581c87', contract: '0x0be5e8f107279cc2d9c3a537ed4ea669b45e443d', deployed: 'June 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  decentether: { name: 'DecentEther', desc: 'Deployed August 2020 during DeFi Summer, though it had nothing to do with DeFi, just another PoWH3D clone running the old Hourglass dividend model on a chain now dominated by Uniswap and Compound.', category: 'gambling', color: '#581c87', contract: '0x7d2d58d7add0b2d6e06fa85590b60da7741c18c9', deployed: 'August 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  bitconnect3: { name: 'BitConnect v3', desc: 'The third BitConnect-branded PoWH3D fork, deployed October 2019. By this point the BitConnect name was the subject of SEC enforcement actions, but clone deployers kept reusing it.', category: 'gambling', color: '#581c87', contract: '0x38e219ee67a5e1536c5a89fec2da0d69c254cac4', deployed: 'October 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  furious: { name: 'Furious', desc: 'A July 2020 PoWH3D clone with an aggressive name but stock-standard mechanics. Same autonomous Hourglass contract where buy/sell fees are distributed to all token holders in perpetuity.', category: 'gambling', color: '#581c87', contract: '0xb0c4382d4355cdfe94a132fadf92a509b1e25939', deployed: 'July 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  etherdiamond: { name: 'EtherDiamond', desc: 'Deployed July 2020, a sibling to ETHDIAMOND with nearly identical branding. Both are straight PoWH3D forks where token holders earn a cut of every future transaction.', category: 'gambling', color: '#581c87', contract: '0x4af078e47490c0e761a3de260952d9eb4a6ad693', deployed: 'July 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  powh_clone5: { name: 'Hourglass Clone E', desc: 'An October 2019 unnamed Hourglass fork, one of several unbranded P3D copies deployed with no website or community, just the raw contract on Ethereum.', category: 'gambling', color: '#581c87', contract: '0x12528042299e0fca4d44ae4f42359319b8901fa2', deployed: 'October 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  cryptosurge: { name: 'CryptoSurge', desc: 'Deployed October 2019 with a name evoking price surges. A PoWH3D fork using the proven Hourglass mechanics where buying tokens costs a 10% fee that goes straight to existing holders.', category: 'gambling', color: '#581c87', contract: '0x11e165dd03c63771004f929d58b75e4aaf2d1a23', deployed: 'October 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  hourglass_clone6: { name: 'Hourglass Clone F', desc: 'A November 2018 unbranded Hourglass contract. Deployed during the crypto winter bear market when ETH had fallen over 90% from its peak, yet P3D clones were still appearing.', category: 'gambling', color: '#581c87', contract: '0x77b541f90ecfa09f854209eefeca24c295050e2e', deployed: 'November 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  upower: { name: 'UPower', desc: 'Deployed July 2018, UPower was a PoWH3D fork from the summer of the P3D craze. Standard dividend token. Deposit ETH, receive tokens, earn from every future transaction on the contract.', category: 'gambling', color: '#581c87', contract: '0x5044ac8da9601edf970dcc91a10c5f41c5c548c0', deployed: 'July 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  hourglass_clone7: { name: 'Hourglass Clone G', desc: 'A May 2018 unbranded Hourglass fork, one of the earliest nameless P3D copies. Deployed during the peak month of clone activity when dozens of identical contracts appeared on Ethereum.', category: 'gambling', color: '#581c87', contract: '0xaa4ec8484e89bed69570825688789589d38eea5e', deployed: 'May 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  redchip2: { name: 'RedChip v2', desc: 'The second iteration of RedChip, deployed October 2019 alongside its predecessor. Another PoWH3D fork with the same dividend token mechanics repackaged under a stock-market-inspired name.', category: 'gambling', color: '#581c87', contract: '0xae384c6e68f5d697d65ed43fd53ef5ea3288f536', deployed: 'October 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  omnidex: { name: 'OmniDex', desc: 'Deployed August 2018, OmniDex distinguished itself with 18% dividends, masternodes, and 0% transfer fees, tweaking the standard P3D formula. Despite the "DEX" name, it was a dividend token, not an exchange.', category: 'gambling', color: '#581c87', contract: '0x433e631ac0c03e49ca034dbf5543964c80c6b391', deployed: 'August 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  spw2: { name: 'SPW v2', desc: 'The second SPW contract, deployed September 2020. A relaunch of the original SPW using the same PoWH3D Hourglass mechanics with no apparent changes.', category: 'gambling', color: '#581c87', contract: '0xd446a13f9b9f8bcbc3ded73764d08735561b1638', deployed: 'September 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  bounties: { name: 'Bounties Network', desc: 'was a decentralized bounty platform (December 2017) built by ConsenSys for open-source work and freelance tasks on Ethereum. Bounty issuers who never killed or fulfilled their bounties still have ETH locked in the StandardBounties v1 contract.', category: 'other', color: '#0369a1', contract: '0x2af47a65da8cd66729b4209c22017d6a5c2d2400', deployed: 'December 2017', balanceAbi: 'function getBounty(uint256) view returns (address, uint256, uint256, bool, uint256, uint256)', balanceArgs: (user) => [0], balanceCall: 'getBounty', balanceTransform: () => 0n, withdrawAbi: 'function killBounty(uint256 _bountyId)', withdrawCall: 'killBounty', noWalletCheck: true, bountiesMulti: true },
  ageofdinos: {
    name: 'Age of Dinos',
    desc: 'was an NFT Dutch auction (2024). Bidders who overpaid above the clearing price have unclaimed ETH refunds available via claimAndRefund().',
    category: 'nft',
    color: '#65a30d',
    contract: '0x19C10FFF96B80208F454034C046CCC4445CD20BA',
    deployed: 'January 2024',
    balanceAbi: 'function claimInfo(address) view returns (bool hasClaimed, uint256 refundAmount, uint256 nftCount)',
    balanceArgs: (user) => [user],
    balanceCall: 'claimInfo',
    balanceTransform: (result) => result[0] ? 0n : result[1],
    withdrawAbi: 'function claimAndRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimAndRefund',
  },
  personabid: {
    name: 'PersonaBid',
    desc: 'was an NFT raffle auction (2024). Bidders who were not selected or overbid have unclaimed ETH refunds available via claimAndRefund().',
    category: 'nft',
    color: '#059669',
    contract: '0xDE5D4949F445650325C7C8739610C3A979C7A6DB',
    deployed: 'March 2024',
    balanceAbi: 'function claimInfo(address) view returns (bool hasClaimed, uint256 refundAmount, uint256 nftCount)',
    balanceArgs: (user) => [user],
    balanceCall: 'claimInfo',
    balanceTransform: (result) => result[0] ? 0n : result[1],
    withdrawAbi: 'function claimAndRefund()',
    withdrawArgs: () => [],
    withdrawCall: 'claimAndRefund',
  },
  maker_weth: {
    name: 'Maker W-ETH',
    desc: 'The original Wrapped Ether contract predating the canonical WETH9. Solved the fundamental problem that native ETH couldn\'t be used in ERC-20 smart contracts, enabling early DEXs like OasisDEX and Radar Relay. Deprecated when the community converged on WETH9 in late 2017.',
    category: 'ico',
    color: '#1a9641',
    contract: '0x2956356cd2a2bf3202f771f50d3d14a367b48070',
    deployed: 'April 2017',
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  old_weth: {
    name: 'Old WETH',
    desc: 'An early Wrapped Ether contract deployed in June 2016, one of the first attempts at wrapping native ETH into an ERC-20 token. Users deposited ETH and received WETH tokens 1:1. Predates both Maker W-ETH and the canonical WETH9. Over 3,200 ETH remains wrapped.',
    category: 'ico',
    color: '#627eea',
    contract: '0xECF8F87f810EcF450940c9f60066b4a7a501d6A7',
    deployed: 'June 2016',
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  aave_v1: {
    name: 'Aave v1',
    desc: 'Aave v1 launched in January 2020 as the first version of the Aave lending protocol. Users deposited ETH and received aETH interest-bearing tokens that automatically accrued yield. The protocol migrated to v2 in December 2020 and v3 in March 2022, but the original UI dropped v1 support. Users can still redeem aETH tokens for ETH by calling redeem() on the aETH contract.',
    category: 'defi',
    color: '#B6509E',
    contract: '0x3a3A65aAb0dd2A17E3F1947bA16138cd37d08c04',
    deployed: 'January 2020',
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function redeem(uint256 _amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'redeem',
    aaveV1Repay: {
      lendingPool: '0x398eC7346DcD622eDc5ae82352F02bE94C62d119',
      lendingPoolCore: '0x3dfd23A6c5E8BbcFc9581d2E864a68feb6a076d3',
      ethSentinel: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      tokens: {
        DAI:  { addr: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
        USDC: { addr: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        USDT: { addr: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
        SUSD: { addr: '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51', decimals: 18 },
        TUSD: { addr: '0x0000000000085d4780B73119b644AE5ecd22b376', decimals: 18 },
        BUSD: { addr: '0x4Fabb145d64652a948d72533023f6E7A623C7C53', decimals: 18 },
        WBTC: { addr: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
        LINK: { addr: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18 },
        MKR:  { addr: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', decimals: 18 },
        KNC:  { addr: '0xdd974D5C2e2928deA5F71b9825b8b646686BD200', decimals: 18 },
        LEND: { addr: '0x80fB784B7eD66730e8b1DBd9820aFD29931aab03', decimals: 18 },
        BAT:  { addr: '0x0D8775F648430679A709E98d2b0Cb6250d2887EF', decimals: 18 },
        ZRX:  { addr: '0xE41d2489571d322189246DaFA5ebDe1F4699F498', decimals: 18 },
        SNX:  { addr: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', decimals: 18 },
        MANA: { addr: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942', decimals: 18 },
        REP:  { addr: '0x1985365e9f78359a9B6AD760e32412f4a445E862', decimals: 18 },
        ETH:  { addr: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
      },
    },
  },
  augur_v1: {
    name: 'Augur v1',
    desc: 'Augur launched in July 2018 as Ethereum\'s first decentralized prediction market protocol. Users could create markets on real-world events, trade outcome shares, and earn fees as market creators. The protocol migrated to v2 in August 2020, but 771 ETH remains locked in the original Cash contract backing unfilled orders, unclaimed market creator fees, and unredeemed winning shares.',
    category: 'prediction',
    color: '#553C9A',
    contract: '0xd5524179cB7AE012f5B642C1D6D700Bbaa76B96b',
    deployed: 'July 2018',
    balanceAbi: null,
    balanceArgs: null,
    balanceCall: null,
    withdrawAbi: null,
    withdrawCall: null,
    noWalletCheck: true,
    augurMulti: true,
    augurContracts: {
      cancelOrder: '0x3448209268e97652bb67ea12777d4dfba81e3aaf',
      claimTradingProceeds: '0x4334477348222a986fc88a05410aa6b07507872a',
    },
  },
  ethfinex: {
    name: 'Ethfinex Trustless',
    desc: 'Ethfinex Trustless launched in September 2018 as a non-custodial DEX backed by Bitfinex. Users deposited ETH into WrapperLockEth contracts, receiving ETHW tokens for off-chain order matching via the 0x protocol. The platform rebranded to DeversiFi in 2019, then migrated to StarkEx L2 in 2020, and rebranded again to rhino.fi in 2022. The original wrapper contracts are abandoned but fully functional \u2014 all time locks expired years ago, so depositors can withdraw directly without any third-party signature.',
    category: 'dex',
    color: '#f59e0b',
    contract: '0xaA7427D8f17D87a28F5e1ba3aDBB270bAdbe1011',
    deployed: '2018',
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function withdraw(uint256 _value, uint8 v, bytes32 r, bytes32 s, uint256 signatureValidUntilBlock)',
    withdrawArgs: (amount) => [amount, 0, '0x' + '00'.repeat(32), '0x' + '00'.repeat(32), 99999999],
    withdrawCall: 'withdraw',
  },
  ethfinex_v2: {
    name: 'Ethfinex Trustless v2',
    desc: 'Ethfinex Trustless launched in September 2018 as a non-custodial DEX backed by Bitfinex. Users deposited ETH into WrapperLockEth contracts, receiving ETHW tokens for off-chain order matching via the 0x protocol. The platform rebranded to DeversiFi in 2019, then migrated to StarkEx L2 in 2020, and rebranded again to rhino.fi in 2022. The original wrapper contracts are abandoned but fully functional \u2014 all time locks expired years ago, so depositors can withdraw directly without any third-party signature.',
    category: 'dex',
    color: '#d97706',
    contract: '0x50cb61afa3f023d17276dcfb35abf85c710d1cff',
    deployed: '2019',
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function withdraw(uint256 _value, uint8 v, bytes32 r, bytes32 s, uint256 signatureValidUntilBlock)',
    withdrawArgs: (amount) => [amount, 0, '0x' + '00'.repeat(32), '0x' + '00'.repeat(32), 99999999],
    withdrawCall: 'withdraw',
  },
  avastars: {
    name: 'Avastars',
    desc: 'Avastars was an NFT project (2020) that allowed users to mint generative avatar NFTs. Users deposited ETH into the minting contract as a prepayment balance, which was drawn down as they minted. The project is defunct since September 2021, but the minting contract still holds unspent deposit balances.',
    category: 'nft',
    color: '#8b5cf6',
    contract: '0xe31763aad9294f073ddf18b36503ed037ae5e737',
    deployed: '2020',
    noWalletCheck: true,
    withdrawAbi: 'function withdrawDepositorBalance()',
    withdrawArgs: () => [],
    withdrawCall: 'withdrawDepositorBalance',
  },
  // alpha_homora_v1: DO NOT ADD. Insolvent — 10.8 ETH in contract but withdraw() computes amount against 47 ETH (includes unpaid loans). safeTransferETH reverts.
  unknown_dex_5995: {
    name: 'Unknown DEX (0x5995)',
    desc: 'An anonymous EtherDelta-style order-book DEX deployed in July 2019. Featured deposit/withdraw for ETH and ERC-20 tokens, off-chain order matching, and onchain settlement. The contract is unverified with no known website or team. Activity ceased in March 2020. Standard withdraw function remains fully operational.',
    category: 'dex',
    color: '#64748b',
    contract: '0x5995ca61d845e045cd1327a32707a66f7daccf6d',
    deployed: '2019',
    balanceAbi: 'function balanceOf(address token, address user) view returns (uint256)',
    balanceArgs: (user) => ['0x0000000000000000000000000000000000000000', user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function withdraw(uint256 amount)',
    withdrawArgs: (amount) => [amount],
    withdrawCall: 'withdraw',
  },
  switcheo_v2: {
    name: 'Switcheo BrokerV2',
    desc: 'Switcheo Network launched in 2019 as a cross-chain DEX supporting Ethereum, NEO, and EOS. The BrokerV2 contract held user ETH deposits for order matching. Switcheo pivoted to Carbon Network (Cosmos L2) and abandoned the Ethereum contract. The owner zeroed the withdrawal delay in April 2023, enabling instant self-service withdrawals via a 2-step announce + withdraw flow.',
    category: 'dex',
    color: '#00c9a7',
    contract: '0x7ee7ca6e75de79e618e88bdf80d0b1db136b22d0',
    deployed: '2019',
    balanceAbi: 'function balances(address user, address token) view returns (uint256)',
    balanceArgs: (user) => [user, '0x0000000000000000000000000000000000000000'],
    balanceCall: 'balances',
    switcheoWithdraw: true,
    withdrawAbi: 'function slowWithdraw(address withdrawer, address token, uint256 amount)',
    withdrawArgs: (amount, user) => [user, '0x0000000000000000000000000000000000000000', amount],
    withdrawCall: 'slowWithdraw',
    announceAbi: 'function announceWithdraw(address token, uint256 amount)',
    announceArgs: (amount) => ['0x0000000000000000000000000000000000000000', amount],
    announceCall: 'announceWithdraw',
  },
  keeperdao: {
    name: 'KeeperDAO / Rook',
    desc: 'launched October 2020 as an on-chain liquidity underwriter backed by 3AC, Polychain and Pantera. Depositors earned yield from flash-loan fees and MEV arbitrage, receiving kTokens (kETH, kwETH) as LP shares. The project rebranded to Rook in late 2021 and wound down in 2022; the treasury was liquidated in April 2023 after a governance "rage quit". The LiquidityPoolV2 contract is still live and un-paused — current kETH holders receive ~1.08 ETH per kETH and kwETH holders ~1.05 WETH per kwETH, reflecting the final MEV yield accrued before shutdown.',
    category: 'defi',
    color: '#6366f1',
    contract: '0x35fFd6E268610E764fF6944d07760D0EFe5E40E5',
    deployed: 'October 2020',
    // Withdrawal flow: per-kToken 2-step (approve + withdraw). Users may hold kETH
    // and/or kwETH; each is rendered as a separate item in the claim modal.
    // The LP pool signature is withdraw(address _to, address _kToken, uint256 _kTokenAmount).
    // Balance file uses `keeperdao_items` array for per-item breakdown (see balance_source).
    keeperdaoMulti: true,
    noWalletCheck: true,
    balanceAbi: 'function underlyingBalance(address _token, address _owner) view returns (uint256)',
    balanceArgs: (user) => ['0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', user],
    balanceCall: 'underlyingBalance',
    balanceTransform: (result) => 0n,  // real balance comes from API keeperdao_items
    withdrawAbi: 'function withdraw(address _to, address _kToken, uint256 _kTokenAmount)',
    withdrawCall: 'withdraw',
  },
  genesis_weth_pool: {
    name: 'Pop Finance',
    desc: 'Pop Finance launched in late 2020 as a WETH yield farm with a genesis staking pool. Users deposited WETH to earn POP token rewards. The project went defunct within months — the frontend is offline and the POP token worthless. All deposited WETH remains fully withdrawable with no time locks or token requirements.',
    category: 'defi',
    color: '#f59e0b',
    contract: '0x6b1803a257298292517668a5832bc5a27cb012fb',
    deployed: 'March 2021',
    returnsWeth: true,
    noWalletCheck: true,
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function exit()',
    withdrawArgs: () => [],
    withdrawCall: 'exit',
  },
  dxmgnpool: {
    name: 'Gnosis DutchX',
    desc: 'The DxMgnPool was a WETH pooling contract for the Gnosis DutchX decentralized auction mechanism, deployed in May 2019. Users deposited WETH which was pooled into DutchX auctions to earn MGN (magnolia) tokens. The DutchX protocol was deprecated and superseded by CoW Protocol. All auction proceeds have been returned to the pool and are withdrawable by original depositors.',
    category: 'defi',
    color: '#009cb4',
    contract: '0xf1d29a124622c06f7026f35553543c833102183b',
    deployed: 'May 2019',
    returnsWeth: true,
    noWalletCheck: true,
    withdrawAbi: 'function withdrawDeposit() returns (uint256)',
    withdrawArgs: () => [],
    withdrawCall: 'withdrawDeposit',
  },
  hegic_eth_pool: {
    name: 'Hegic V1 Pool',
    desc: 'Hegic ETH Pool v1.1 was the liquidity pool backing ETH call and put options on the Hegic protocol. Liquidity providers deposited native ETH and received writeETH tokens representing their pool share. The protocol migrated to newer versions and v1.1 is deprecated. All option locks have been released — writeETH holders can withdraw their proportional share of the pool.',
    category: 'defi',
    color: '#2563eb',
    contract: '0x878F15ffC8b894A1BA7647c7176E4C01f74e140b',
    deployed: 'October 2020',
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    balanceTransform: (result) => {
      // writeETH → ETH: multiply by totalBalance/totalSupply
      // API already stores ETH-equivalent, but fresh RPC returns writeETH tokens.
      // The transform is applied in the balance pipeline — not here (noWalletCheck).
      return result;
    },
    noWalletCheck: true,
    withdrawAbi: 'function withdraw(uint256 amount, uint256 maxBurn) returns (uint256)',
    withdrawArgs: (amount) => [amount, amount * 2000n],
    withdrawCall: 'withdraw',
  },
  hegic_call: {
    name: 'Hegic V1 Call',
    desc: 'Hegic V1 launched in 2021 as a peer-to-pool options protocol. Liquidity providers deposited WETH into the call options pool and received ERC-721 tranche NFTs representing their share. The protocol migrated to V2/V3 and the V1 pool is deprecated. All lockup periods have expired — tranche owners can withdraw their proportional share of the remaining pool liquidity.',
    category: 'defi',
    color: '#2563eb',
    contract: '0xb9ed94c6d594b2517c4296e24a8c517ff133fb6d',
    deployed: 'August 2021',
    returnsWeth: true,
    noWalletCheck: true,
    hegicMulti: true,
    withdrawAbi: 'function withdrawWithoutHedge(uint256 trancheID) returns (uint256)',
    withdrawCall: 'withdrawWithoutHedge',
  },
  shrimp: {
    name: 'Shrimp Finance',
    desc: 'Shrimp Finance launched in September 2020 during DeFi Summer as a Synthetix StakingRewards fork. Users staked WETH to earn SHRIMP governance tokens. The project went defunct within weeks — the frontend is offline, the SHRIMP token worthless, and the team vanished. All staked WETH remains fully withdrawable via exit() with no time locks or token requirements.',
    category: 'defi',
    color: '#f97316',
    contract: '0x7127ee43fafba873ce985683ab79df2ce2912198',
    deployed: 'September 2020',
    returnsWeth: true,
    noWalletCheck: true,
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function exit()',
    withdrawArgs: () => [],
    withdrawCall: 'exit',
  },
  bee: {
    name: 'Bee2 Finance',
    desc: 'Bee2 Finance launched in September 2020 during DeFi Summer as a Synthetix StakingRewards fork. Users staked WETH to earn BEE governance tokens. The project went defunct within weeks — the frontend is offline and the BEE token worthless. All staked WETH remains fully withdrawable via exit() with no time locks or token requirements.',
    category: 'defi',
    color: '#eab308',
    contract: '0x3e63e6f0d6e90e120eb31e005aa149b476a89492',
    deployed: 'September 2020',
    returnsWeth: true,
    noWalletCheck: true,
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function exit()',
    withdrawArgs: () => [],
    withdrawCall: 'exit',
  },
  kitten: {
    name: 'Kitten Finance',
    desc: 'Kitten Finance launched in September 2020 during DeFi Summer as a Synthetix StakingRewards fork. Users staked WETH to earn KIF governance tokens. The project went defunct within weeks — the frontend is offline and the KIF token worthless. All staked WETH remains fully withdrawable via exit() with no time locks or token requirements.',
    category: 'defi',
    color: '#ec4899',
    contract: '0xb1236770ed9015e331c021347e005b00c8b8a01b',
    deployed: 'September 2020',
    returnsWeth: true,
    noWalletCheck: true,
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function exit()',
    withdrawArgs: () => [],
    withdrawCall: 'exit',
  },
  yam_weth: {
    name: 'Yam Finance v1',
    desc: 'Yam Finance v1 launched in August 2020 as one of the first DeFi Summer yield farms. Users staked WETH to earn YAM tokens. The v1 contract had a rebase bug and the project migrated to v2/v3, abandoning this pool. All staked WETH remains fully withdrawable via exit().',
    category: 'defi',
    color: '#e11d48',
    contract: '0x587a07ce5c265a38dd6d42def1566ba73eeb06f5',
    deployed: 'August 2020',
    returnsWeth: true,
    noWalletCheck: true,
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function exit()',
    withdrawArgs: () => [],
    withdrawCall: 'exit',
  },
  spaghetti: {
    name: 'Spaghetti Money',
    desc: 'Spaghetti Money launched in August 2020 during DeFi Summer as a yield farm fork. Users staked WETH to earn PASTA tokens. The project went defunct within days. All staked WETH remains fully withdrawable via exit().',
    category: 'defi',
    color: '#f59e0b',
    contract: '0x4547a86ca6a84b9d60dc57af908472074de7af5f',
    deployed: 'August 2020',
    returnsWeth: true,
    noWalletCheck: true,
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function exit()',
    withdrawArgs: () => [],
    withdrawCall: 'exit',
  },
  dokidoki: {
    name: 'Doki Doki Finance',
    desc: 'Doki Doki Finance launched in 2020 as a DeFi yield farm. Users staked WETH to earn DOKI tokens. The project is defunct. All staked WETH remains withdrawable via withdraw().',
    category: 'defi',
    color: '#8b5cf6',
    contract: '0xde846827ce3022ecd5efd6ed316a2def9ab299b8',
    deployed: 'September 2020',
    returnsWeth: true,
    noWalletCheck: true,
    balanceAbi: 'function balanceOf(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'balanceOf',
    withdrawAbi: 'function withdraw(uint256)',
    withdrawArgs: (bal) => [bal],
    withdrawCall: 'withdraw',
  },
  cofi: {
    name: 'CoFiX Staking',
    desc: 'CoFiX (Computable Finance) launched in October 2020. Users staked CoFi tokens and earned WETH rewards. The project is defunct. Unclaimed WETH rewards are claimable via getReward().',
    category: 'defi',
    color: '#06b6d4',
    contract: '0x0061c52768378b84306b2665f098c3e0b2c03308',
    deployed: 'October 2020',
    returnsWeth: true,
    noWalletCheck: true,
    balanceAbi: 'function earned(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'earned',
    withdrawAbi: 'function getReward()',
    withdrawArgs: () => [],
    withdrawCall: 'getReward',
  },
  pickle_staking: {
    name: 'Pickle Staking v1',
    desc: 'Pickle Finance v1 staking let users stake tokens to earn WETH rewards. Pickle migrated to v2 and Arbitrum, abandoning this pool. Unclaimed WETH is claimable via getReward().',
    category: 'defi',
    color: '#22c55e',
    contract: '0xa17a8883da1abd57c690df9ebf58fc194edab66f',
    deployed: 'September 2020',
    returnsWeth: true,
    noWalletCheck: true,
    balanceAbi: 'function earned(address) view returns (uint256)',
    balanceArgs: (user) => [user],
    balanceCall: 'earned',
    withdrawAbi: 'function getReward()',
    withdrawArgs: () => [],
    withdrawCall: 'getReward',
  },
  mesa: {
    name: 'Mesa / Gnosis Protocol v1',
    desc: 'Mesa was the precursor to CowSwap (Gnosis Protocol v1), a batch-auction DEX deployed in 2020. Users deposited tokens to trade and had to explicitly withdraw to retrieve them. The contract has been dormant since early 2022 but the 2-step withdraw path (requestWithdraw → wait one batch → withdraw) is still permissionless.',
    category: 'dex',
    color: '#10b981',
    contract: '0x6f400810b62df8e13fded51be75ff5393eaa841f',
    deployed: 'February 2020',
    returnsWeth: true,
    balanceAbi: 'function getBalance(address user, address token) view returns (uint256)',
    balanceArgs: (user) => [user, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
    balanceCall: 'getBalance',
    mesaWithdraw: true,
    requestWithdrawAbi: 'function requestWithdraw(address token, uint256 amount)',
    requestWithdrawCall: 'requestWithdraw',
    withdrawAbi: 'function withdraw(address user, address token)',
    withdrawCall: 'withdraw',
  },
};

// Per-tab state
const tabState = {};
for (const key of Object.keys(EXCHANGES)) {
  tabState[key] = { meta: null, rows: [], pagination: null, page: 0, pageSize: 50, sortField: 'rank', sortAsc: true };
}

// Generate tabs and panels from EXCHANGES
(function generateUI() {
  const tabsEl = document.getElementById('tabs');
  const panelsEl = document.getElementById('panelsContainer');
  let isFirst = true;

  for (const [key, cfg] of Object.entries(EXCHANGES)) {
    // Tab button — <a> for SEO (Google follows href), onclick prevents navigation for users
    const tab = document.createElement('a');
    const slugAliases = { ens_old: 'ens' };
    tab.href = '/' + (slugAliases[key] || key.replace(/_/g, '-'));
    tab.className = 'tab' + (isFirst ? ' active' : '');
    tab.dataset.tab = key;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('tabindex', isFirst ? '0' : '-1');
    tab.setAttribute('aria-selected', isFirst ? 'true' : 'false');
    tab.setAttribute('aria-controls', 'panel-' + key);
    tab.innerHTML = esc(cfg.name) + ' <span class="badge" id="badge-' + key + '">...</span>';
    tab.addEventListener('click', function(e) { e.preventDefault(); });
    tabsEl.appendChild(tab);

    // Panel
    const panel = document.createElement('div');
    panel.className = 'tab-panel' + (isFirst ? ' active' : '');
    panel.setAttribute('role', 'tabpanel');
    panel.id = 'panel-' + key;
    panel.innerHTML = '<div class="loading" id="loading-' + key + '"><div class="spinner"></div><div>Loading ' + esc(cfg.name) + ' data...</div></div>'
      + '<div id="app-' + key + '" style="display:none">'
      + '<p class="project-desc"><b>' + esc(cfg.name) + '</b> ' + esc(cfg.desc || '') + '</p>'
      + '<div class="contract-info" id="contract-' + key + '"></div>'
      + '<div class="cards" id="cards-' + key + '"></div>'
      + '</div>';
    panelsEl.appendChild(panel);

    isFirst = false;
  }

  // Attach "Go to" keydown handlers via delegation
  panelsEl.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter') return;
    var k = e.target.dataset.key;
    if (!k || !e.target.id.startsWith('goto-')) return;
    var t = tabState[k], p = parseInt(e.target.value) - 1, max = Math.ceil((t.pagination?.totalPages || 1)) - 1;
    if (p >= 0 && p <= max) { t.page = p; applyFilters(k); }
  });

  // Populate mobile tab select
  var sel = document.getElementById('tabSelect');
  if (sel) {
    sel.innerHTML = '';
    for (var _k in EXCHANGES) {
      var opt = document.createElement('option');
      opt.value = _k;
      opt.textContent = EXCHANGES[_k].name;
      sel.appendChild(opt);
    }
  }
})();

// Wallet state
let walletProvider = null;
let walletSigner = null;
let walletAddress = null;
let userBalances = {}; // { idex: BigInt, etherdelta: BigInt }
let pendingManualAddress = null; // Set when manual check finds results, cleared after wallet connects

// Helpers
function fmtEth(v) {
  const n = parseFloat(v);
  if (n > 0 && n < 0.01) {
    // Show decimals up to first non-zero digit
    const s = n.toFixed(10);
    const match = s.match(/^0\.(0*)[1-9]/);
    const digits = match ? match[1].length + 1 : 4;
    return n.toLocaleString('en', {minimumFractionDigits: digits, maximumFractionDigits: digits});
  }
  return n.toLocaleString('en', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}
function fmtNum(n) { return Number(n).toLocaleString('en'); }
function truncAddr(a) { return a.slice(0, 8) + '...' + a.slice(-6); }
function etherscanAddr(a) { return `https://etherscan.io/address/${encodeURIComponent(a)}`; }
function etherscanTx(h) { return `https://etherscan.io/tx/${encodeURIComponent(h)}`; }

// ─── Web3 Wallet ───

async function connectWallet() {
  if (walletAddress) {
    // Disconnect — revoke permissions so next connect shows wallet picker
    if (window.ethereum) {
      try { await window.ethereum.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] }); } catch(e) { /* not all wallets support this */ }
    }
    walletProvider = null;
    walletSigner = null;
    walletAddress = null;
    _keystoreWallet = null;
    userBalances = {};
    document.getElementById('walletBtn').textContent = 'Connect Wallet';
    document.getElementById('walletBtn').classList.remove('connected');
    document.getElementById('walletAddr').textContent = '';
    document.getElementById('claimBanner').classList.remove('visible');
    document.getElementById('claimBanner').classList.remove('celebrate');
    document.getElementById('networkWarn').classList.remove('visible');
    document.getElementById('connectCta').style.display = '';
    return;
  }

  try {
    // Show wallet picker (skip if only one browser wallet — connect directly)
    const providers = window._eip6963Providers || [];
    const pickProviders = providers.length > 0 ? providers : (window.ethereum ? [{ info: { name: 'Browser Wallet', icon: '', rdns: 'default' }, provider: window.ethereum }] : []);
    let choice;
    if (pickProviders.length === 1) {
      // Single wallet detected — skip picker, connect directly
      choice = { type: 'provider', provider: pickProviders[0].provider };
    } else {
      choice = await _showWalletPicker(pickProviders);
      if (!choice) return;
    }

    if (choice.type === 'keystore') {
      const wallet = await _handleKeystoreConnect();
      if (!wallet) return;
      // Connect keystore wallet to a public RPC
      const provider = new ethers.JsonRpcProvider(PUBLIC_RPCS[0]);
      walletSigner = wallet.connect(provider);
      walletProvider = provider;
      walletAddress = wallet.address;

      document.getElementById('walletBtn').textContent = 'Disconnect';
      document.getElementById('walletBtn').classList.add('connected');
      document.getElementById('walletAddr').textContent = truncAddr(walletAddress) + ' (keystore)';
      document.getElementById('connectCta').style.display = 'none';

      window.va?.track?.('wallet_connected', { method: 'keystore' });
      // Skip to balance check below
    } else {
      // Browser wallet provider
      walletProvider = new ethers.BrowserProvider(choice.provider);
      const accounts = await walletProvider.send('eth_requestAccounts', []);
      walletSigner = await walletProvider.getSigner();
      walletAddress = await walletSigner.getAddress();
      if (window._attachEip6963Listeners) window._attachEip6963Listeners(choice.provider);

      document.getElementById('walletBtn').textContent = 'Disconnect';
      document.getElementById('walletBtn').classList.add('connected');
      document.getElementById('walletAddr').textContent = truncAddr(walletAddress);
      document.getElementById('connectCta').style.display = 'none';

      window.va?.track?.('wallet_connected', { method: 'browser' });
    }

    try { await checkNetwork(); } catch(e) { console.warn('Network check failed:', e); }

    // If user already did a manual check for this same address, just enable withdraw buttons
    // instead of re-scanning (avoids flicker of results disappearing and reappearing)
    if (pendingManualAddress && pendingManualAddress.toLowerCase() === walletAddress.toLowerCase()) {
      // Remove the "Connect Wallet to Claim" button and enable withdraw
      pendingManualAddress = null;
      const rowsEl = document.getElementById('claimRows');
      const connectBtn = rowsEl.querySelector('[data-action="connect-for-manual"]');
      if (connectBtn) connectBtn.closest('div').remove();
      // Re-check with wallet connected to get full withdraw UI
      const banner = document.getElementById('claimBanner');
      document.getElementById('claimBannerTitle').textContent = '';
      banner.classList.remove('celebrate');
      rowsEl.innerHTML = spinnerHTML('Checking contracts... 0/' + Object.keys(EXCHANGES).length);
      banner.classList.add('visible');
      scanStart();
      try { await checkUserBalances(walletAddress); } catch(e) { console.error('Balance check failed:', e); }
    } else {
      // Show loading state while checking balances
      const banner = document.getElementById('claimBanner');
      const rowsEl = document.getElementById('claimRows');
      document.getElementById('claimBannerTitle').textContent = '';
      banner.classList.remove('celebrate');
      rowsEl.innerHTML = spinnerHTML('Checking contracts... 0/' + Object.keys(EXCHANGES).length);
      banner.classList.add('visible');
      scanStart();
      try { await checkUserBalances(); } catch(e) { console.error('Balance check failed:', e); }
    }
  } catch (e) {
    console.error('Wallet connection failed:', e);
    if (e.code !== 'ACTION_REJECTED' && e.code !== 4001) {
      showInlineError('walletError', 'Failed to connect wallet: ' + (e.message || e.code || 'Unknown error'));
    }
  }
}

async function checkNetwork() {
  const network = await walletProvider.getNetwork();
  const isMainnet = network.chainId === 1n;
  document.getElementById('networkWarn').classList.toggle('visible', !isMainnet);
  return isMainnet;
}

async function checkUserBalances(overrideAddress) {
  if (!walletAddress || !walletProvider) return;
  const checkAddr = overrideAddress || walletAddress;

  // ── Test Mode: use real API with impersonated address ──
  // Set impersonation address for test mode simulation buttons
  if (TEST_MODE) _testImpersonateAddr = (checkAddr || walletAddress || '').toLowerCase();

  window.va?.track?.('address_checked', { method: 'wallet' });
  logEvent('check', { address: walletAddress });

  const banner = document.getElementById('claimBanner');
  const rowsEl = document.getElementById('claimRows');
  let html = '';
  let hasBalance = false;

  // Fetch pre-computed balances from API (avoids loading full JSON)
  let apiBalances = {};
  let apiCoverage = {};
  let apiResp = null;
  window._lastApiBalances = null;
  try {
    apiResp = await fetchCheck(checkAddr);
    console.log('[Scan] fetchCheck response:', apiResp.ok, apiResp.status, apiResp.data ? Object.keys(apiResp.data.balances || {}) : 'NO DATA');
    if (apiResp.ok && apiResp.data) {
      apiBalances = apiResp.data.balances || {};
      apiCoverage = apiResp.data.coverage || {};
      window._lastApiBalances = apiBalances;
      console.log('[Scan] apiBalances keys:', Object.keys(apiBalances));
    } else if (apiResp.status === 429) {
      console.warn('API rate limited — noWalletCheck protocols may not appear');
      showInlineError('walletError', 'Rate limited — some results may be missing. Wait a moment and try again.');
    }
  } catch (e) { console.warn('API check failed, falling back to RPC', e); }

  // Smart balance checking: trust API for high-coverage contracts, RPC only when needed
  // Coverage >= 95%: trust API result (skip RPC if no balance, verify onchain if balance > 0)
  // Coverage < 95% or missing: always check onchain via RPC
  const HIGH_COVERAGE_THRESHOLD = 95;
  let _checkedCount = 0;
  const _totalContracts = Object.keys(EXCHANGES).length;
  const _scanProgressEl = document.getElementById('scanProgress');
  // Animate progress counter: increments by 1 every ~22ms = reaches 116 in ~2.5s
  let _displayedCount = 0;
  const _progressInterval = setInterval(function() {
    _displayedCount++;
    if (_scanProgressEl) _scanProgressEl.textContent = 'Checking contracts... ' + Math.min(_displayedCount, _totalContracts) + '/' + _totalContracts;
    if (_displayedCount >= _totalContracts) clearInterval(_progressInterval);
  }, Math.round(2500 / _totalContracts));
  const rpcChecks = Object.entries(EXCHANGES).map(async ([key, cfg]) => {
    try {
      const covPct = apiCoverage[key]?.coverage_pct ?? 0;
      const apiEntry = apiBalances[key];

      // noWalletCheck contracts (e.g. ENS): always use API only
      if (cfg.noWalletCheck) {
        if (apiEntry) {
          if (apiEntry.deeds) window._apiDeeds = apiEntry.deeds;
          console.log('[Scan] noWalletCheck HIT:', key, 'wei:', apiEntry.balance_wei);
          return { key, balance: BigInt(apiEntry.balance_wei) };
        }
        console.log('[Scan] noWalletCheck MISS:', key, '(no apiEntry)');
        return { key, balance: 0n };
      }

      // No API balance: skip RPC entirely (trust API as the source of truth)
      // This reduces RPC calls from ~110 to only the contracts with balance
      if (!apiEntry) {
        return { key, balance: 0n };
      }

      // HAS API balance: verify onchain to confirm it's still claimable.
      // balanceContract lets a protocol read its balance from a sibling
      // address (e.g. OZ RefundVault holds the ETH, crowdsale receives the
      // claimRefund call). Falls back to cfg.contract when not set.
      try {
        const balanceAddr = cfg.balanceContract || cfg.contract;
        const contract = new ethers.Contract(balanceAddr, [cfg.balanceAbi], walletProvider);
        const result = await contract[cfg.balanceCall](...cfg.balanceArgs(checkAddr));
        const balance = cfg.balanceTransform ? cfg.balanceTransform(result) : result;
        return { key, balance };
      } catch (rpcErr) {
        // RPC failed: trust API balance as fallback
        // API balance_wei is already in ETH terms (transform was applied during data pipeline)
        return { key, balance: BigInt(apiEntry.balance_wei) };
      }
    } catch (e) {
      // RPC failed: fall back to API balance if available
      const apiEntry = apiBalances[key];
      if (apiEntry) return { key, balance: BigInt(apiEntry.balance_wei) };
      return { key, balance: 0n };
    } finally {
      _checkedCount++;
    }
  });
  const balanceResults = await Promise.all(rpcChecks);
  clearInterval(_progressInterval);
  if (_scanProgressEl) _scanProgressEl.textContent = 'Checking contracts... ' + _totalContracts + '/' + _totalContracts;

  // Check Neufund LockedAccount state (NEU balance + neumarksDue)
  window._neufundLockedState = {};
  for (const { key, balance } of balanceResults) {
    const cfg = EXCHANGES[key];
    if (cfg.neufundLocked && balance > 0n && walletProvider) {
      try {
        const lc = new ethers.Contract(cfg.contract, [cfg.balanceAbi], walletProvider);
        const [bal, neuDue, unlockDate] = await lc[cfg.balanceCall](...cfg.balanceArgs(checkAddr));
        const neuContract = new ethers.Contract(cfg.neufundLocked.neuToken, ['function balanceOf(address) view returns (uint256)', 'function allowance(address,address) view returns (uint256)'], walletProvider);
        const neuBal = await neuContract.balanceOf(checkAddr);
        const neuAllowance = await neuContract.allowance(checkAddr, cfg.neufundLocked.lockedAccount);
        const ethTContract = new ethers.Contract(cfg.neufundLocked.etherToken, ['function balanceOf(address) view returns (uint256)'], walletProvider);
        const ethTBal = await ethTContract.balanceOf(checkAddr);
        window._neufundLockedState[key] = { neuDue, neuBal, neuAllowance, ethTBal, unlockDate };
      } catch (e) {
        console.warn('Failed to check Neufund locked state:', e);
      }
    }
  }

  // Check Aave v1 debt state (borrows that block redeem)
  window._aaveV1DebtState = {};
  for (const { key, balance } of balanceResults) {
    const cfg = EXCHANGES[key];
    if (cfg.aaveV1Repay && balance > 0n && walletProvider) {
      try {
        const lp = new ethers.Contract(cfg.aaveV1Repay.lendingPool, [
          'function getUserAccountData(address) view returns (uint256,uint256,uint256,uint256,uint256,uint256)',
          'function getUserReserveData(address,address) view returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool)'
        ], walletProvider);
        const acctData = await lp.getUserAccountData(checkAddr);
        const totalBorrowsETH = acctData[2];
        if (totalBorrowsETH > 0n) {
          // Has debt — check each reserve to find which tokens are borrowed
          const debts = {};
          for (const [sym, info] of Object.entries(cfg.aaveV1Repay.tokens)) {
            try {
              const reserveAddr = info.addr;
              const rd = await lp.getUserReserveData(reserveAddr, checkAddr);
              const currentBorrow = rd[1];
              const originationFee = rd[6];
              const totalOwed = currentBorrow + originationFee;
              if (totalOwed > 0n) {
                debts[sym] = { amount: totalOwed, decimals: info.decimals, addr: info.addr };
              }
            } catch {}
          }
          window._aaveV1DebtState[key] = { hasDebt: Object.keys(debts).length > 0, debts };
        } else {
          window._aaveV1DebtState[key] = { hasDebt: false };
        }
      } catch (e) {
        console.warn('Failed to check Aave v1 debt:', e);
        window._aaveV1DebtState[key] = { hasDebt: false };
      }
    }
  }

  // Check two-step lock states for protocols that require it
  window._twoStepLocks = {};
  for (const { key, balance } of balanceResults) {
    const cfg = EXCHANGES[key];
    if (cfg.twoStep && balance > 0n && walletProvider) {
      try {
        const lockContract = new ethers.Contract(cfg.contract, [cfg.twoStep.lockCheckAbi], walletProvider);
        const lockTs = await lockContract[cfg.twoStep.lockCheckCall](checkAddr);
        const now = BigInt(Math.floor(Date.now() / 1000));
        window._twoStepLocks[key] = {
          timestamp: lockTs,
          ready: lockTs > 0n && now > lockTs,
        };
      } catch (e) {
        console.warn(`Failed to check lock state for ${key}:`, e);
      }
    }
  }

  // Check DigixDAO DGD allowance for Acid contract
  window._digixState = {};
  for (const { key, balance } of balanceResults) {
    const cfg = EXCHANGES[key];
    if (cfg.digixBurn && balance > 0n && walletProvider) {
      try {
        const dgdContract = new ethers.Contract(cfg.digixBurn.dgdToken, ['function balanceOf(address) view returns (uint256)', 'function allowance(address,address) view returns (uint256)'], walletProvider);
        const dgdBal = await dgdContract.balanceOf(checkAddr);
        const dgdAllowance = await dgdContract.allowance(checkAddr, cfg.digixBurn.acidContract);
        window._digixState[key] = { dgdBal, dgdAllowance };
      } catch (e) {
        console.warn('Failed to check DigixDAO state:', e);
      }
    }
  }

  // Check The DAO token allowance + Parity multisig ownership
  window._daoState = {};
  window._daoMultisigMatch = null; // { multisigAddr, daoBal } if connected wallet owns a multisig
  for (const { key, balance } of balanceResults) {
    const cfg = EXCHANGES[key];
    if (!cfg.daoWithdraw || !walletProvider) continue;
    try {
      const daoContract = new ethers.Contract(cfg.daoWithdraw.daoToken, ['function balanceOf(address) view returns (uint256)', 'function allowance(address,address) view returns (uint256)'], walletProvider);
      if (balance > 0n) {
        const daoBal = await daoContract.balanceOf(checkAddr);
        const daoAllowance = await daoContract.allowance(checkAddr, cfg.daoWithdraw.withdrawContract);
        // If checking a different address than wallet, check if it's a Parity multisig
        let isParityMultisig = false;
        if (walletAddress && checkAddr.toLowerCase() !== walletAddress.toLowerCase()) {
          try {
            const msig = new ethers.Contract(checkAddr, ['function isOwner(address) view returns (bool)'], walletProvider);
            isParityMultisig = await msig.isOwner(walletAddress);
          } catch (_) {}
        }
        window._daoState[key] = { daoBal, daoAllowance, isParityMultisig };
      }
      // Auto-detect: check if connected wallet owns any known Parity multisig with DAO tokens
      if (walletAddress && checkAddr.toLowerCase() === walletAddress.toLowerCase() && !window._daoMultisigMatch) {
        if (cfg.parityMultisigs && cfg.parityMultisigs.length > 0) {
          // Batch isOwner checks via Multicall3
          const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11';
          const isOwnerSel = '0x2f54bf6e000000000000000000000000' + walletAddress.slice(2).toLowerCase();
          const calls = cfg.parityMultisigs.map(msig => ({
            target: msig, allowFailure: true, callData: isOwnerSel,
          }));
          try {
            const mc = new ethers.Contract(MULTICALL3, ['function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[])'], walletProvider);
            const results = await mc.aggregate3(calls);
            for (let i = 0; i < results.length; i++) {
              if (results[i].success && results[i].returnData.length >= 66) {
                const isOwner = parseInt(results[i].returnData.slice(-1), 16) === 1;
                if (isOwner) {
                  const msigAddr = cfg.parityMultisigs[i];
                  const msigBal = await daoContract.balanceOf(msigAddr);
                  if (msigBal > 0n) {
                    const msigAllowance = await daoContract.allowance(msigAddr, cfg.daoWithdraw.withdrawContract);
                    window._daoMultisigMatch = { multisigAddr: msigAddr, daoBal: msigBal, daoAllowance: msigAllowance, key };
                    break;
                  }
                }
              }
            }
          } catch (e) { console.warn('Multicall3 isOwner check failed:', e); }
        }
      }
    } catch (e) {
      console.warn('Failed to check The DAO state:', e);
    }
  }

  for (const { key, balance } of balanceResults) {
    const cfg = EXCHANGES[key];
    userBalances[key] = balance;

      if (balance > 0n) {
        hasBalance = true;
        const ethAmount = ethers.formatEther(balance);

        if (cfg.ensDeeds) {
          // ENS: check for pre-mapped deed data first, fall back to event log lookup
          // Check API response first, then local JSON data
          const apiDeeds = window._apiDeeds || null;
          const preDeeds = apiDeeds || null;

          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
                <span class="claim-card-tag" id="ensLookupStatus">${preDeeds ? '' : 'Looking up...'}</span>
              </div>
              <div class="claim-card-meta">
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr('0x6090A6e47849629b7245Dfa1Ca21D94cd15878Ef')}" target="_blank" rel="noopener noreferrer">0x6090A6e47849629b7245Dfa1Ca21D94cd15878Ef</a></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Function</span><span class="claim-card-meta-value"><span style="color:var(--text)">releaseDeed(bytes32 _hash)</span></span></div>
              </div>
              <div id="ensDeedRows" style="padding:12px 16px 14px;border-top:1px solid var(--border);margin-top:8px"></div>
            </div>`;

          const renderDeeds = (deeds) => {
            const statusEl = document.getElementById('ensLookupStatus');
            const rowsEl = document.getElementById('ensDeedRows');
            if (!deeds || deeds.length === 0) {
              statusEl.textContent = '';
              rowsEl.innerHTML = `<div class="claim-details visible" style="font-size:12px;color:var(--text2)">
                No deeds found. Try <a href="https://reclaim.ens.domains" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">reclaim.ens.domains</a> or enter manually:
                <div style="margin-top:10px;display:flex;gap:6px;align-items:center">
                  <input type="text" id="ensManualHash" placeholder="Label or hash (e.g. vitalik)" style="flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-family:inherit;background:var(--bg);color:var(--text)">
                  <button class="claim-btn" data-action="ens-manual-release">Release</button>
                </div>
              </div>`;
              return;
            }
            statusEl.textContent = '';
            deeds.sort((a, b) => parseFloat(b.value_eth || ethers.formatEther(b.value)) - parseFloat(a.value_eth || ethers.formatEther(a.value)));
            window._ensDeeds = deeds;
            var SHOW_INITIAL = 10;
            var renderDeed = function(d, i) {
              var ethVal = d.value_eth || ethers.formatEther(d.value);
              var deedLabel = d.name ? esc(d.name) + '.eth' : 'Deed ' + (i+1);
              return '<div class="claim-row" style="border-left:2px solid var(--green)">' +
                '<span class="dex-name" style="font-size:12px;min-width:60px" title="' + esc(d.labelHash) + '">' + deedLabel + '</span>' +
                '<span class="claim-amount">' + fmtEth(ethVal) + ' ETH</span>' +
                '<button class="claim-btn" id="claimBtn-ens-' + i + '" data-action="claim-ens-deed" data-deed-index="' + i + '">Release</button>' +
              '</div><div class="claim-status" id="claimStatus-ens-' + i + '"></div>';
            };
            var deedHtml = '';
            for (var i = 0; i < Math.min(deeds.length, SHOW_INITIAL); i++) { deedHtml += renderDeed(deeds[i], i); }
            if (deeds.length > SHOW_INITIAL) {
              deedHtml += '<div id="ensHiddenDeeds" style="display:none">';
              for (var i = SHOW_INITIAL; i < deeds.length; i++) { deedHtml += renderDeed(deeds[i], i); }
              deedHtml += '</div>';
              deedHtml += '<div style="text-align:center;margin:12px 0 4px"><button id="ensShowAllBtn" data-action="ens-show-all" style="background:var(--accent);color:#fff;border:none;padding:8px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Show all ' + deeds.length + ' deeds &#x25BE;</button></div>';
            }
            deedHtml += '<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);display:flex;gap:6px;align-items:center">' +
              '<input type="text" id="ensManualHash" placeholder="Another label or hash..." style="flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-family:inherit;background:var(--bg);color:var(--text)">' +
              '<button class="claim-btn" data-action="ens-manual-release">Release</button></div>';
            rowsEl.innerHTML = deedHtml;
          };

          if (preDeeds) {
            // Use pre-mapped deed data — instant, no RPC needed
            window._pendingENSDeeds = preDeeds.map(d => ({
              labelHash: d.labelHash,
              deedAddress: d.deedAddress,
              value: d.value_wei ? BigInt(d.value_wei) : ethers.parseEther(String(d.value_eth || '0')),
              value_eth: d.value_eth,
              name: d.name || null,
            }));
            window._ensRenderDeeds = renderDeeds;
          } else {
            // Fall back to event log lookup (renders after DOM is ready)
            window._ensLookupPromise = lookupENSDeeds(walletAddress, walletProvider).catch(e => {
              console.error('ENS deed lookup error:', e);
              return null;
            });
            window._ensRenderDeeds = renderDeeds;
          }
        } else if (cfg.nucypherWorklock) {
          // NuCypher WorkLock: claim() then refund(), or just refund() if already claimed
          const wiResult = await (async () => {
            try {
              const wc = new ethers.Contract(cfg.contract, [cfg.balanceAbi], walletProvider);
              const info = await wc.workInfo(checkAddr);
              return { deposited: info[0], claimed: info[2] };
            } catch { return { deposited: balance, claimed: false }; }
          })();
          const alreadyClaimed = wiResult.claimed;
          let actionBtn, stepInfo;

          if (alreadyClaimed) {
            actionBtn = `<button class="claim-btn" disabled style="opacity:0.35">Step 1: Claimed</button><button class="claim-btn" id="claimBtn-${key}" data-action="nucypher-refund" data-key="${key}">Step 2: Refund ETH</button>`;
            stepInfo = `<div style="font-size:11px;color:var(--green);margin-top:4px">Already claimed. Click Step 2 to refund your ETH.</div>`;
          } else {
            actionBtn = `<button class="claim-btn" id="claimBtn-${key}" data-action="nucypher-claim" data-key="${key}">Step 1: Claim</button><button class="claim-btn" disabled style="opacity:0.35">Step 2: Refund ETH</button>`;
            stepInfo = `<div style="font-size:11px;color:var(--text2);margin-top:4px">2-step: claim NU tokens into escrow, then refund ETH.</div>`;
          }
          const lastTx = apiBalances[key]?.last_tx_date ? apiBalances[key] : null;
          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
              </div>
              <div class="claim-card-meta" id="claimDetails-${key}">
                ${lastTx ? `<div class="claim-card-meta-row"><span class="claim-card-meta-label">Last tx</span><span class="claim-card-meta-value">${esc(lastTx.last_tx_date)} · <a href="${etherscanTx(lastTx.last_tx_hash)}" target="_blank" rel="noopener noreferrer">view tx</a></span></div>` : ''}
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr(cfg.contract)}" target="_blank" rel="noopener noreferrer">${cfg.contract}</a></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 1</span><span class="claim-card-meta-value"><span style="color:var(--text)">claim()</span></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 2</span><span class="claim-card-meta-value"><span style="color:var(--text)">refund()</span></span></div>
              </div>
              ${stepInfo}
              <div class="claim-card-actions">
                ${actionBtn}
              </div>
              <div class="claim-card-status" id="claimStatus-${key}"></div>
            </div>`;
        } else if (cfg.aaveV1Repay) {
          // Aave v1: conditional 2-step (repay debt if any, then redeem aETH)
          const aaveDebt = window._aaveV1DebtState?.[key];
          let actionBtn, stepInfo;
          // Hoisted out of the `else` below so the template literal on line ~2922
          // can reference it without a ReferenceError when hasDebt is true.
          let isEthDebt = false;

          if (!aaveDebt || !aaveDebt.hasDebt) {
            // No debt: normal single-step redeem
            actionBtn = `<button class="claim-btn" id="claimBtn-${key}" data-action="claim-eth" data-key="${key}">Redeem aETH</button>`;
            stepInfo = `<div class="claim-card-meta-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)"><span class="claim-card-meta-label" style="color:var(--green)">Ready</span><span class="claim-card-meta-value" style="color:var(--green)">No outstanding borrows. Redeem directly.</span></div>`;
          } else {
            // Has debt: show repay step first
            const debtEntries = Object.entries(aaveDebt.debts);
            const debtSummary = debtEntries.map(([sym, d]) => {
              const fmt = ethers.formatUnits(d.amount, d.decimals);
              return parseFloat(fmt).toFixed(sym === 'WBTC' ? 6 : sym === 'USDC' || sym === 'USDT' ? 2 : 4) + ' ' + sym;
            }).join(', ');
            const [firstSym] = debtEntries[0];
            isEthDebt = firstSym === 'ETH';

            if (isEthDebt) {
              // ETH debt: no approval needed, just Repay + Redeem
              actionBtn = `<button class="claim-btn" id="repayBtn-${key}" data-action="aave-repay" data-key="${key}" data-token="ETH">Step 1: Repay ${esc(debtSummary)}</button><button class="claim-btn" disabled style="opacity:0.35">Step 2: Redeem aETH</button>`;
              stepInfo = `<div class="claim-card-meta-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)"><span class="claim-card-meta-label" style="color:#facc15">Debt</span><span class="claim-card-meta-value" style="color:#facc15">Repay ${esc(debtSummary)} (sent as tx value) to unlock aETH redemption.</span></div>`;
            } else {
              // Token debt: Approve + Repay + Redeem
              actionBtn = `<button class="claim-btn" id="approveBtn-${key}" data-action="aave-approve" data-key="${key}" data-token="${firstSym}">Step 1: Approve ${esc(firstSym)}</button><button class="claim-btn" disabled style="opacity:0.35" id="repayBtn-${key}" data-action="aave-repay" data-key="${key}" data-token="${firstSym}">Step 2: Repay ${esc(debtSummary)}</button><button class="claim-btn" disabled style="opacity:0.35">Step 3: Redeem aETH</button>`;
              stepInfo = `<div class="claim-card-meta-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)"><span class="claim-card-meta-label" style="color:#facc15">Debt</span><span class="claim-card-meta-value" style="color:#facc15">Repay ${esc(debtSummary)} to unlock aETH redemption.</span></div>`;
            }
          }
          const lastTx = apiBalances[key]?.last_tx_date ? apiBalances[key] : null;
          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
              </div>
              <div class="claim-card-meta" id="claimDetails-${key}">
                ${lastTx ? `<div class="claim-card-meta-row"><span class="claim-card-meta-label">Last tx</span><span class="claim-card-meta-value">${esc(lastTx.last_tx_date)} · <a href="${etherscanTx(lastTx.last_tx_hash)}" target="_blank" rel="noopener noreferrer">view tx</a></span></div>` : ''}
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">aETH Token</span><span class="claim-card-meta-value"><a href="${etherscanAddr(cfg.contract)}" target="_blank" rel="noopener noreferrer">${cfg.contract}</a></span></div>
                ${aaveDebt?.hasDebt ? (isEthDebt ? `
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 1</span><span class="claim-card-meta-value"><span style="color:var(--text)">repay(ETH, amount) — send ETH</span></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 2</span><span class="claim-card-meta-value"><span style="color:var(--text)">redeem(balance)</span></span></div>
                ` : `
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 1</span><span class="claim-card-meta-value"><span style="color:var(--text)">approve(token, LendingPoolCore)</span></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 2</span><span class="claim-card-meta-value"><span style="color:var(--text)">repay(reserve, amount)</span></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 3</span><span class="claim-card-meta-value"><span style="color:var(--text)">redeem(balance)</span></span></div>
                `) : `
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Function</span><span class="claim-card-meta-value"><span style="color:var(--text)">redeem(balance)</span></span></div>
                `}
                ${stepInfo}
              </div>
              <div class="claim-card-actions">
                ${actionBtn}
              </div>
              <div class="claim-card-status" id="claimStatus-${key}"></div>
            </div>`;
        } else if (cfg.digixBurn) {
          // DigixDAO: 2-step (approve DGD to Acid, then burn)
          const dxState = window._digixState?.[key];
          const dgdBal = dxState?.dgdBal || 0n;
          const dgdAllowance = dxState?.dgdAllowance || 0n;
          const needsApproval = dgdAllowance < dgdBal;
          let actionBtn, stepInfo;

          if (dgdBal === 0n) {
            actionBtn = `<button class="claim-btn" disabled style="opacity:0.5">No DGD tokens</button>`;
            stepInfo = `<div class="claim-card-meta-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)"><span class="claim-card-meta-label" style="color:var(--red)">Blocked</span><span class="claim-card-meta-value" style="color:var(--red)">DGD tokens required to claim.</span></div>`;
          } else if (needsApproval) {
            actionBtn = `<button class="claim-btn" id="claimBtn-${key}" data-action="digix-approve" data-key="${key}">Step 1: Approve DGD</button><button class="claim-btn" disabled style="opacity:0.35">Step 2: Claim ETH</button>`;
            stepInfo = `<div class="claim-card-meta-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)"><span class="claim-card-meta-label" style="color:#facc15">Status</span><span class="claim-card-meta-value" style="color:#facc15">Burns ALL DGD at once.</span></div>`;
          } else {
            actionBtn = `<button class="claim-btn" disabled style="opacity:0.35">Step 1: Approved</button><button class="claim-btn" id="claimBtn-${key}" data-action="digix-burn" data-key="${key}">Step 2: Claim ETH</button>`;
            stepInfo = `<div class="claim-card-meta-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)"><span class="claim-card-meta-label" style="color:var(--green)">Ready</span><span class="claim-card-meta-value" style="color:var(--green)">DGD approved. Burns ALL DGD at once.</span></div>`;
          }
          const lastTx = apiBalances[key]?.last_tx_date ? apiBalances[key] : null;
          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
              </div>
              <div class="claim-card-meta" id="claimDetails-${key}">
                ${lastTx ? `<div class="claim-card-meta-row"><span class="claim-card-meta-label">Last tx</span><span class="claim-card-meta-value">${esc(lastTx.last_tx_date)} · <a href="${etherscanTx(lastTx.last_tx_hash)}" target="_blank" rel="noopener noreferrer">view tx</a></span></div>` : ''}
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr(cfg.digixBurn.acidContract)}" target="_blank" rel="noopener noreferrer">${cfg.digixBurn.acidContract}</a></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 1</span><span class="claim-card-meta-value"><span style="color:var(--text)">approve(Acid, balance)</span></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 2</span><span class="claim-card-meta-value"><span style="color:var(--text)">burn()</span></span></div>
                ${stepInfo}
              </div>
              <div class="claim-card-actions">
                ${actionBtn}
              </div>
              <div class="claim-card-status" id="claimStatus-${key}"></div>
            </div>`;
        } else if (cfg.daoWithdraw) {
          // The DAO: 2-step (approve DAO tokens to WithdrawDAO, then withdraw)
          const daoState = window._daoState?.[key];
          const daoBal = daoState?.daoBal || 0n;
          const daoAllowance = daoState?.daoAllowance || 0n;
          const isParityMultisig = daoState?.isParityMultisig || false;
          const needsApproval = daoAllowance < daoBal;
          let actionBtn, stepInfo;

          if (isParityMultisig) {
            // Parity multisig: owner can execute approve+withdraw via multisig.execute()
            actionBtn = needsApproval
              ? `<button class="claim-btn" id="claimBtn-${key}" data-action="dao-msig-approve" data-key="${key}" data-msig="${esc(checkAddr)}" data-allow-mismatch="true">Step 1: Approve (via multisig)</button><button class="claim-btn" disabled style="opacity:0.35">Step 2: Withdraw (via multisig)</button>`
              : `<button class="claim-btn" disabled style="opacity:0.35">Step 1: Approved</button><button class="claim-btn" id="claimBtn-${key}" data-action="dao-msig-withdraw" data-key="${key}" data-msig="${esc(checkAddr)}" data-allow-mismatch="true">Step 2: Withdraw (via multisig)</button>`;
            stepInfo = `<div class="claim-card-meta-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)"><span class="claim-card-meta-label" style="color:#facc15">Parity Multisig</span><span class="claim-card-meta-value" style="color:#facc15">Connected wallet is an owner. ETH will be sent to the multisig. May require additional confirmations.</span></div>`;
          } else if (daoBal === 0n) {
            actionBtn = `<button class="claim-btn" disabled style="opacity:0.5">No DAO tokens</button>`;
            stepInfo = `<div class="claim-card-meta-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)"><span class="claim-card-meta-label" style="color:var(--red)">Blocked</span><span class="claim-card-meta-value" style="color:var(--red)">DAO tokens required to claim.</span></div>`;
          } else if (needsApproval) {
            actionBtn = `<button class="claim-btn" id="claimBtn-${key}" data-action="dao-approve" data-key="${key}">Step 1: Approve DAO</button><button class="claim-btn" disabled style="opacity:0.35">Step 2: Claim ETH</button>`;
            stepInfo = `<div class="claim-card-meta-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)"><span class="claim-card-meta-label" style="color:#facc15">Status</span><span class="claim-card-meta-value" style="color:#facc15">Withdraws ALL DAO tokens at once.</span></div>`;
          } else {
            actionBtn = `<button class="claim-btn" disabled style="opacity:0.35">Step 1: Approved</button><button class="claim-btn" id="claimBtn-${key}" data-action="dao-withdraw" data-key="${key}">Step 2: Claim ETH</button>`;
            stepInfo = `<div class="claim-card-meta-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)"><span class="claim-card-meta-label" style="color:var(--green)">Ready</span><span class="claim-card-meta-value" style="color:var(--green)">DAO approved. Withdraws ALL DAO tokens at once.</span></div>`;
          }
          const lastTx = apiBalances[key]?.last_tx_date ? apiBalances[key] : null;
          const msigLabel = isParityMultisig ? 'Parity Multisig' : 'Contract';
          const msigAddr = isParityMultisig ? checkAddr : cfg.daoWithdraw.withdrawContract;
          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
              </div>
              <div class="claim-card-meta" id="claimDetails-${key}">
                ${lastTx ? `<div class="claim-card-meta-row"><span class="claim-card-meta-label">Last tx</span><span class="claim-card-meta-value">${esc(lastTx.last_tx_date)} · <a href="${etherscanTx(lastTx.last_tx_hash)}" target="_blank" rel="noopener noreferrer">view tx</a></span></div>` : ''}
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">${msigLabel}</span><span class="claim-card-meta-value"><a href="${etherscanAddr(msigAddr)}" target="_blank" rel="noopener noreferrer">${msigAddr}</a></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 1</span><span class="claim-card-meta-value"><span style="color:var(--text)">${isParityMultisig ? 'execute(DAO, 0, approve(WithdrawDAO, balance))' : 'approve(WithdrawDAO, balance)'}</span></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 2</span><span class="claim-card-meta-value"><span style="color:var(--text)">${isParityMultisig ? 'execute(WithdrawDAO, 0, withdraw())' : 'withdraw()'}</span></span></div>
                ${stepInfo}
              </div>
              <div class="claim-card-actions">
                ${actionBtn}
              </div>
              <div class="claim-card-status" id="claimStatus-${key}"></div>
            </div>`;
        } else if (cfg.neufundLocked) {
          // Neufund LockedAccount: 2-step withdrawal (approveAndCall + withdraw ETH-T)
          const nfState = window._neufundLockedState?.[key];
          let actionBtn, stepInfo;
          const hasNeu = nfState && nfState.neuBal >= nfState.neuDue;
          const hasEthT = nfState && nfState.ethTBal > 0n;

          if (hasEthT && balance === 0n) {
            // Already unlocked, just need to convert ETH-T to ETH
            actionBtn = `<button class="claim-btn" id="claimBtn-${key}" data-action="neufund-withdraw-etht" data-key="${key}">Withdraw ETH</button>`;
            stepInfo = `<div class="claim-card-meta-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)"><span class="claim-card-meta-label" style="color:var(--green)">Ready</span><span class="claim-card-meta-value" style="color:var(--green)">Already unlocked. Convert ETH-T to ETH.</span></div>`;
          } else if (hasEthT) {
            // Has both locked balance and ETH-T (partial state) — withdraw ETH-T first
            actionBtn = `<button class="claim-btn" id="claimBtn-${key}" data-action="neufund-withdraw-etht" data-key="${key}">Step 2: Withdraw ETH</button>`;
            stepInfo = `<div class="claim-card-meta-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)"><span class="claim-card-meta-label" style="color:var(--green)">Ready</span><span class="claim-card-meta-value" style="color:var(--green)">ETH-T ready. Convert to ETH.</span></div>`;
          } else if (hasNeu) {
            // Has NEU, ready to do approveAndCall (unlock in one tx)
            actionBtn = `<button class="claim-btn" id="claimBtn-${key}" data-action="neufund-approve-and-unlock" data-key="${key}" style="background:var(--text2)">Step 1: Unlock</button>`;
            stepInfo = `<div class="claim-card-meta-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)"><span class="claim-card-meta-label" style="color:#facc15">Status</span><span class="claim-card-meta-value" style="color:#facc15">2-step: unlock (burns NEU, returns ETH-T) → withdraw ETH.</span></div>`;
          } else {
            // No NEU tokens
            const neuDueStr = nfState ? ethers.formatEther(nfState.neuDue) : '?';
            actionBtn = `<button class="claim-btn" id="claimBtn-${key}" disabled style="opacity:0.5">Need NEU tokens</button>`;
            stepInfo = `<div class="claim-card-meta-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)"><span class="claim-card-meta-label" style="color:var(--red)">Blocked</span><span class="claim-card-meta-value" style="color:var(--red)">You need ${parseFloat(neuDueStr).toFixed(2)} NEU tokens to unlock. Obtain NEU first.</span></div>`;
          }
          const lastTx = apiBalances[key]?.last_tx_date ? apiBalances[key] : null;
          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
              </div>
              <div class="claim-card-meta" id="claimDetails-${key}">
                ${lastTx ? `<div class="claim-card-meta-row"><span class="claim-card-meta-label">Last tx</span><span class="claim-card-meta-value">${esc(lastTx.last_tx_date)} · <a href="${etherscanTx(lastTx.last_tx_hash)}" target="_blank" rel="noopener noreferrer">view tx</a></span></div>` : ''}
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr(cfg.contract)}" target="_blank" rel="noopener noreferrer">${cfg.contract}</a></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 1</span><span class="claim-card-meta-value"><span style="color:var(--text)">approveAndCall(NEU)</span></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 2</span><span class="claim-card-meta-value"><span style="color:var(--text)">withdraw(amount)</span></span></div>
                ${stepInfo}
              </div>
              <div class="claim-card-actions">
                ${actionBtn}
              </div>
              <div class="claim-card-status" id="claimStatus-${key}"></div>
            </div>`;
        } else if (cfg.kyberFeeHandler) {
          // Kyber FeeHandler: per-epoch claim from pre-computed data
          const epochDetails = apiBalances[key]?.epoch_details || [];
          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
              </div>
              <div class="claim-card-meta">
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr(cfg.contract)}" target="_blank" rel="noopener noreferrer">${cfg.contract}</a></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Function</span><span class="claim-card-meta-value"><span style="color:var(--text)">claimStakerReward(address, epoch)</span></span></div>
              </div>`;
          if (epochDetails.length > 0) {
            for (const ep of epochDetails) {
              html += `<div class="claim-row" style="margin:4px 16px;border-left:2px solid var(--accent);padding:6px 12px;display:flex;align-items:center;justify-content:space-between">
                <span style="font-size:13px">Epoch ${ep.epoch}<span style="color:var(--text2);font-size:12px"> · ${fmtEth(ep.eth)} ETH</span></span>
                <button class="claim-btn" data-action="kyber-claim-epoch" data-key="${key}" data-epoch="${ep.epoch}">Claim</button>
              </div>`;
            }
          } else {
            html += `<div style="padding:8px 16px;font-size:12px;color:var(--text2)">No claimable epochs found.</div>`;
          }
          html += `<div class="claim-card-status" id="claimStatus-${key}"></div></div>`;
        } else if (cfg.augurMulti) {
          // Augur v1: per-item claim buttons for mailboxes, orders, and shares
          const augurClaims = apiBalances[key]?.augur_claims || [];
          const mailboxes = augurClaims.filter(c => c.t === 'm');
          const orders = augurClaims.filter(c => c.t === 'o');
          const shares = augurClaims.filter(c => c.t === 's');
          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
              </div>
              <div class="claim-card-meta">
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Cash Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr(cfg.contract)}" target="_blank" rel="noopener noreferrer">${cfg.contract.slice(0,10)}...${cfg.contract.slice(-8)}</a></span></div>
              </div>`;
          // Mailbox section
          if (mailboxes.length > 0) {
            const mbTotal = mailboxes.reduce((s, m) => s + m.e, 0);
            html += `<div style="margin:10px 16px 2px;font-size:12px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px">Creator Fees · ${fmtEth(mbTotal)} ETH</div>`;
            html += `<div style="margin:0 16px 2px;font-size:11px;color:var(--text2)">Mailbox.withdrawEther() — owner-only</div>`;
            for (let mi = 0; mi < mailboxes.length; mi++) {
              const mb = mailboxes[mi];
              html += `<div class="claim-row" style="margin:3px 16px;border-left:2px solid #553C9A;padding:5px 12px;display:flex;align-items:center;justify-content:space-between">
                <span style="font-size:12px">Mailbox ${mb.a.slice(0,8)}..${mb.a.slice(-4)}<span style="color:var(--text2);font-size:11px"> · ${fmtEth(mb.e)} ETH</span></span>
                <button class="claim-btn" data-action="augur-mailbox" data-key="${key}" data-mailbox="${mb.a}" data-index="${mi}">Withdraw</button>
              </div>`;
            }
          }
          // Orders section
          if (orders.length > 0) {
            const ordTotal = orders.reduce((s, o) => s + o.e, 0);
            html += `<div style="margin:10px 16px 2px;font-size:12px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px">Open Orders · ${fmtEth(ordTotal)} ETH</div>`;
            html += `<div style="margin:0 16px 2px;font-size:11px;color:var(--text2)">CancelOrder.cancelOrder(orderId) — creator-only</div>`;
            for (let oi = 0; oi < orders.length; oi++) {
              const ord = orders[oi];
              html += `<div class="claim-row" style="margin:3px 16px;border-left:2px solid #553C9A;padding:5px 12px;display:flex;align-items:center;justify-content:space-between">
                <span style="font-size:12px">Order ${ord.id.slice(0,10)}..${ord.id.slice(-4)}<span style="color:var(--text2);font-size:11px"> · ${fmtEth(ord.e)} ETH</span></span>
                <button class="claim-btn" data-action="augur-cancel-order" data-key="${key}" data-order-id="${ord.id}" data-index="${oi}">Cancel Order</button>
              </div>`;
            }
          }
          // Shares section
          if (shares.length > 0) {
            const shareEth = ethAmount - mailboxes.reduce((s, m) => s + m.e, 0) - orders.reduce((s, o) => s + o.e, 0);
            html += `<div style="margin:10px 16px 2px;font-size:12px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px">Winning Shares · ${fmtEth(Math.max(0, shareEth))} ETH</div>`;
            html += `<div style="margin:0 16px 2px;font-size:11px;color:var(--text2)">claimTradingProceeds(market, holder) — permissionless</div>`;
            for (let si = 0; si < shares.length; si++) {
              const sh = shares[si];
              html += `<div class="claim-row" style="margin:3px 16px;border-left:2px solid #553C9A;padding:5px 12px;display:flex;align-items:center;justify-content:space-between">
                <span style="font-size:12px">Market ${sh.m.slice(0,8)}..${sh.m.slice(-4)}<span style="color:var(--text2);font-size:11px"> · outcome ${sh.o}</span></span>
                <button class="claim-btn" data-action="augur-claim-shares" data-key="${key}" data-market="${sh.m}" data-index="${si}">Claim</button>
              </div>`;
            }
          }
          if (augurClaims.length === 0) {
            html += `<div style="margin:8px 16px;font-size:12px;color:var(--text2)">Claim details not available. <a href="${etherscanAddr(cfg.contract)}" target="_blank" rel="noopener noreferrer">View on Etherscan</a>.</div>`;
          }
          html += `<div class="claim-card-status" id="claimStatus-${key}"></div></div>`;
        } else if (!cfg.withdrawAbi) {
          // Contracts without direct withdraw
          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
                <span class="claim-card-tag" style="opacity:0.5">Manual</span>
              </div>
            </div>`;
        } else if (cfg.twoStep) {
          // Two-step withdrawal (e.g. Joyso: lockMe -> wait -> withdraw)
          const lastTx = apiBalances[key]?.last_tx_date ? apiBalances[key] : null;
          // lockState is set during balance check (see checkTwoStepLock)
          const lock = window._twoStepLocks?.[key];
          let actionBtn, stepInfo;
          if (!lock || lock.timestamp === 0n) {
            // Step 1: not locked yet
            actionBtn = `<button class="claim-btn" id="claimBtn-${key}" data-action="claim-lock" data-key="${key}" style="background:var(--text2)">Step 1: Unlock</button>`;
            stepInfo = `<div style="font-size:11px;color:var(--text2);margin-top:4px">Two-step withdrawal: unlock first, then withdraw after ${cfg.twoStep.lockDays} days.</div>`;
          } else if (lock.ready) {
            // Step 2: lock expired, can withdraw
            actionBtn = `<button class="claim-btn" id="claimBtn-${key}" data-action="claim-eth" data-key="${key}">Step 2: Withdraw</button>`;
            stepInfo = `<div style="font-size:11px;color:var(--green);margin-top:4px">Unlock complete. Ready to withdraw.</div>`;
          } else {
            // Locked but still waiting
            const now = Date.now() / 1000;
            const secsLeft = Number(lock.timestamp) - Math.floor(now);
            const daysLeft = Math.ceil(secsLeft / 86400);
            const unlockDate = new Date(Number(lock.timestamp) * 1000).toLocaleDateString();
            actionBtn = `<button class="claim-btn" id="claimBtn-${key}" disabled style="opacity:0.5">Waiting (${daysLeft}d left)</button>`;
            stepInfo = `<div style="font-size:11px;color:var(--text2);margin-top:4px">Unlocking in progress. Withdraw available ${unlockDate}.</div>`;
          }
          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
              </div>
              <div class="claim-card-meta" id="claimDetails-${key}">
                ${lastTx ? `<div class="claim-card-meta-row"><span class="claim-card-meta-label">Last tx</span><span class="claim-card-meta-value">${esc(lastTx.last_tx_date)} · <a href="${etherscanTx(lastTx.last_tx_hash)}" target="_blank" rel="noopener noreferrer">view tx</a></span></div>` : ''}
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr(cfg.contract)}" target="_blank" rel="noopener noreferrer">${cfg.contract}</a></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 1</span><span class="claim-card-meta-value"><span style="color:var(--text)">lockMe()</span></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 2</span><span class="claim-card-meta-value"><span style="color:var(--text)">withdraw(0x0, amount)</span></span></div>
              </div>
              ${stepInfo}
              <div class="claim-card-actions">
                ${actionBtn}
              </div>
              <div class="claim-card-status" id="claimStatus-${key}"></div>
            </div>`;
        } else if (cfg.bountiesMulti) {
          // Bounties Network: per-bounty killBounty buttons
          const bountyDetails = apiBalances[key]?.bounty_details || [];
          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
              </div>
              <div class="claim-card-meta">
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr(cfg.contract)}" target="_blank" rel="noopener noreferrer">${cfg.contract}</a></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Function</span><span class="claim-card-meta-value">killBounty(uint256 _bountyId) per bounty</span></div>
              </div>`;
          if (bountyDetails.length > 0) {
            for (const bd of bountyDetails) {
              const bdEth = bd.eth ? ' · ' + fmtEth(bd.eth) + ' ETH' : '';
              html += `<div class="claim-row" style="margin:4px 16px;border-left:2px solid var(--accent);padding:6px 12px;display:flex;align-items:center;justify-content:space-between">
                <span style="font-size:13px">Bounty #${esc(String(bd.id))}<span style="color:var(--text2);font-size:12px">${bdEth}</span></span>
                <button class="claim-btn" data-action="kill-bounty" data-key="${key}" data-bounty-id="${bd.id}">Withdraw</button>
              </div>`;
            }
          } else {
            html += `<div style="margin:8px 16px;font-size:12px;color:var(--text2)">Bounty IDs not available. <a href="${etherscanAddr(cfg.contract)}#writeContract" target="_blank" rel="noopener noreferrer">Use Etherscan</a> to call killBounty with your bounty ID.</div>`;
          }
          html += `<div class="claim-card-status" id="claimStatus-${key}"></div></div>`;
        } else if (cfg.hegicMulti) {
          // Hegic V1: per-tranche withdrawWithoutHedge buttons
          const trancheDetails = apiBalances[key]?.tranche_details || [];
          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
              </div>
              <div class="claim-card-meta">
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr(cfg.contract)}" target="_blank" rel="noopener noreferrer">${cfg.contract}</a></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Function</span><span class="claim-card-meta-value">withdrawWithoutHedge(trancheID) per tranche</span></div>
              </div>`;
          if (trancheDetails.length > 0) {
            for (const td of trancheDetails) {
              const tdEth = td.eth ? ' · ' + fmtEth(td.eth) + ' ETH' : '';
              html += `<div class="claim-row" style="margin:4px 16px;border-left:2px solid var(--accent);padding:6px 12px;display:flex;align-items:center;justify-content:space-between">
                <span style="font-size:13px">Tranche #${esc(String(td.id))}<span style="color:var(--text2);font-size:12px">${tdEth}</span></span>
                <button class="claim-btn" data-action="hegic-withdraw" data-key="${key}" data-tranche-id="${td.id}">Withdraw</button>
              </div>`;
            }
          } else {
            html += `<div style="margin:8px 16px;font-size:12px;color:var(--text2)">Tranche IDs not available. <a href="${etherscanAddr(cfg.contract)}#writeContract" target="_blank" rel="noopener noreferrer">Use Etherscan</a> to call withdrawWithoutHedge with your tranche ID.</div>`;
          }
          html += `<div class="claim-card-status" id="claimStatus-${key}"></div></div>`;
        } else if (cfg.keeperdaoMulti) {
          // KeeperDAO: per-kToken 2-step flow (approve kToken, then LP.withdraw).
          // Users may hold kETH (→ ETH) and/or kwETH (→ WETH). Each item renders
          // as its own inline row with a state-tracked Step 1/Step 2 button pair.
          // State transition (approve → withdraw) is driven by allowance check on
          // tab open (window._keeperdaoState[itemKey] = 'needs-approve' | 'needs-withdraw').
          const kdItems = apiBalances[key]?.keeperdao_items || [];
          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
              </div>
              <div class="claim-card-meta">
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr(cfg.contract)}" target="_blank" rel="noopener noreferrer">${cfg.contract}</a></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Flow</span><span class="claim-card-meta-value">per kToken: <code class="inline-code">approve(pool, amount)</code> → <code class="inline-code">withdraw(user, kToken, amount)</code></span></div>
              </div>`;
          if (kdItems.length > 0) {
            // Always render BOTH buttons per item; Step 2 starts disabled and
            // gets enabled by the Step 1 handler via element.disabled = false.
            // No re-rendering, no innerHTML rewrites — simpler + safer.
            for (let ki = 0; ki < kdItems.length; ki++) {
              const it = kdItems[ki];
              const itemKey = key + '-' + esc(it.k_token) + '-' + ki;
              html += `<div class="claim-row" style="margin:6px 16px;border-left:2px solid var(--accent);padding:8px 12px">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                  <span style="font-size:13px"><b>${esc(it.k_token)}</b> · ${fmtEth(it.k_amount)} ${esc(it.k_token)} <span style="color:var(--text2);font-size:12px">&rarr; ${fmtEth(it.eth_eq)} ${esc(it.underlying)}</span></span>
                </div>
                <div class="claim-card-actions" style="padding:0">
                  <button class="claim-btn" id="approveBtn-${itemKey}" data-action="keeperdao-approve" data-key="${esc(key)}" data-item-idx="${ki}">Step 1: Approve ${esc(it.k_token)}</button>
                  <button class="claim-btn" id="withdrawBtn-${itemKey}" data-action="keeperdao-withdraw" data-key="${esc(key)}" data-item-idx="${ki}" disabled style="opacity:0.35">Step 2: Withdraw ${esc(it.underlying)}</button>
                </div>
                <div class="claim-card-status" id="kdStatus-${itemKey}"></div>
              </div>`;
            }
          } else {
            html += `<div style="margin:8px 16px;font-size:12px;color:var(--text2)">No kToken items detected for this address. <a href="${etherscanAddr(cfg.contract)}#readContract" target="_blank" rel="noopener noreferrer">Query underlyingBalance on Etherscan</a> if you believe this is wrong.</div>`;
          }
          html += `<div class="claim-card-status" id="claimStatus-${key}"></div></div>`;
        } else if (cfg.mesaWithdraw) {
          // Mesa / Gnosis Protocol v1: 2-step requestWithdraw + withdraw with one-batch (5min) delay
          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} WETH</span>
              </div>
              <div class="claim-card-meta" id="claimDetails-${key}">
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr(cfg.contract)}" target="_blank" rel="noopener noreferrer">${cfg.contract}</a></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 1</span><span class="claim-card-meta-value"><span style="color:var(--text)">requestWithdraw(WETH, amount)</span></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Wait</span><span class="claim-card-meta-value">~5 min (one batch)</span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 2</span><span class="claim-card-meta-value"><span style="color:var(--text)">withdraw(user, WETH)</span></span></div>
              </div>
              <div class="claim-card-actions">
                <button class="claim-btn" id="mesaReqBtn-${key}" data-action="mesa-request" data-key="${key}">Step 1: Request withdraw</button>
                <button class="claim-btn" disabled style="opacity:0.35" id="mesaWithdrawBtn-${key}" data-action="mesa-withdraw" data-key="${key}">Step 2: Withdraw (after 5 min)</button>
              </div>
              <div class="claim-card-status" id="claimStatus-${key}"></div>
            </div>`;
          // Auto-detect pre-existing matured pending request (e.g. user
          // started Step 1 earlier, closed the tab, came back). Run on the
          // next tick so the DOM elements exist.
          setTimeout(() => mesaCheckPendingOnLoad(key), 100);
        } else if (cfg.switcheoWithdraw) {
          // Switcheo BrokerV2: 2-step announceWithdraw + slowWithdraw (0 delay)
          const lastTx = apiBalances[key]?.last_tx_date ? apiBalances[key] : null;
          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
              </div>
              <div class="claim-card-meta" id="claimDetails-${key}">
                ${lastTx ? `<div class="claim-card-meta-row"><span class="claim-card-meta-label">Last tx</span><span class="claim-card-meta-value">${esc(lastTx.last_tx_date)} · <a href="${etherscanTx(lastTx.last_tx_hash)}" target="_blank" rel="noopener noreferrer">view tx</a></span></div>` : ''}
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr(cfg.contract)}" target="_blank" rel="noopener noreferrer">${cfg.contract}</a></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 1</span><span class="claim-card-meta-value"><span style="color:var(--text)">announceWithdraw(token, amount)</span></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 2</span><span class="claim-card-meta-value"><span style="color:var(--text)">slowWithdraw(user, token, amount)</span></span></div>
                <div class="claim-card-meta-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)"><span class="claim-card-meta-label" style="color:var(--green)">Ready</span><span class="claim-card-meta-value" style="color:var(--green)">No delay. Both steps can be executed back-to-back.</span></div>
              </div>
              <div class="claim-card-actions">
                <button class="claim-btn" id="announceBtn-${key}" data-action="switcheo-announce" data-key="${key}">Step 1: Announce</button>
                <button class="claim-btn" disabled style="opacity:0.35" id="claimBtn-${key}" data-action="switcheo-withdraw" data-key="${key}">Step 2: Withdraw</button>
              </div>
              <div class="claim-card-status" id="claimStatus-${key}"></div>
            </div>`;
        } else {
          const wArgs = cfg.withdrawArgs(balance, walletAddress);
          const argsDisplay = wArgs.length > 0 ? wArgs.map(a => typeof a === 'bigint' ? a.toString() + ' wei (' + ethers.formatEther(a) + ' ETH)' : String(a)).join(', ') : 'none';
          const funcSig = cfg.withdrawAbi.replace('function ', '');
          const exitBtn = cfg.exitAbi ? `<button class="claim-btn" id="exitBtn-${key}" data-action="claim-exit" data-key="${key}" style="background:var(--text2)">Exit (sell + withdraw)</button>` : '';
          const lastTx = apiBalances[key]?.last_tx_date ? apiBalances[key] : null;
          const adoptionReqs = apiBalances[key]?.adoption_requests;
          const unit = cfg.returnsWeth ? 'WETH' : 'ETH';
          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} ${unit}</span>
              </div>
              <div class="claim-card-meta" id="claimDetails-${key}">
                ${lastTx ? `<div class="claim-card-meta-row"><span class="claim-card-meta-label">Last tx</span><span class="claim-card-meta-value">${esc(lastTx.last_tx_date)} · <a href="${etherscanTx(lastTx.last_tx_hash)}" target="_blank" rel="noopener noreferrer">view tx</a></span></div>` : ''}
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr(cfg.contract)}" target="_blank" rel="noopener noreferrer">${cfg.contract}</a></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Function</span><span class="claim-card-meta-value">${esc(funcSig)}${cfg.exitAbi ? ' / ' + cfg.exitAbi.replace('function ', '') : ''}${adoptionReqs ? ' / cancelAdoptionRequest(bytes5)' : ''}</span></div>
              </div>`;
          // MoonCat adoption request escrow — show cancel buttons per catId
          if (adoptionReqs && adoptionReqs.length > 0) {
            html += `<div style="margin:8px 16px 0;font-size:12px;color:var(--text2)">
              ${adoptionReqs.length} adoption request(s) with escrowed ETH:
            </div>`;
            for (let ar = 0; ar < adoptionReqs.length; ar++) {
              const req = adoptionReqs[ar];
              html += `<div class="claim-row" style="margin:4px 16px;border-left:2px solid var(--accent)">
                <span class="dex-name" style="font-size:12px">Cat ${esc(req.catId)}</span>
                <span class="claim-amount">${parseFloat(req.price_eth).toFixed(4)} ETH</span>
                <button class="claim-btn" id="cancelReqBtn-${key}-${ar}" data-action="cancel-mooncat" data-key="${key}" data-cat-id="${req.catId}" data-index="${ar}">Cancel & Claim</button>
              </div>`;
            }
          }
          html += `
              <div class="claim-card-actions">
                <button class="claim-btn" id="claimBtn-${key}" data-action="claim-eth" data-key="${key}">Withdraw</button>${exitBtn}
              </div>
              <div class="claim-card-status" id="claimStatus-${key}"></div>
            </div>`;
        }
      }
  }

  const claimCount = Object.values(userBalances).filter(b => b > 0n).length;
  const ethPrice = await getEthPrice();
  // Append Parity multisig card if connected wallet owns one (works alongside personal balances)
  if (window._daoMultisigMatch) {
    const mm = window._daoMultisigMatch;
    const mmEth = ethers.formatEther(mm.daoBal);
    const mmEthNum = parseFloat(mmEth);
    const needsApproval = mm.daoAllowance < mm.daoBal;
    const cfg = EXCHANGES[mm.key];
    const mmActionBtn = needsApproval
      ? `<button class="claim-btn" id="claimBtn-msig-${mm.key}" data-action="dao-msig-approve" data-key="${mm.key}" data-msig="${esc(mm.multisigAddr)}" data-allow-mismatch="true">Step 1: Approve (via multisig)</button><button class="claim-btn" disabled style="opacity:0.35">Step 2: Withdraw (via multisig)</button>`
      : `<button class="claim-btn" disabled style="opacity:0.35">Step 1: Approved</button><button class="claim-btn" id="claimBtn-msig-${mm.key}" data-action="dao-msig-withdraw" data-key="${mm.key}" data-msig="${esc(mm.multisigAddr)}" data-allow-mismatch="true">Step 2: Withdraw (via multisig)</button>`;
    hasBalance = true;
    userBalances[mm.key] = (userBalances[mm.key] || 0n) + mm.daoBal;
    html += `<div class="claim-card">
        <div class="claim-card-header">
          <span class="claim-card-name">${esc(cfg.name)} (Parity Multisig)</span>
          <span class="claim-card-amount">${fmtEth(mmEthNum)} ETH</span>
        </div>
        <div class="claim-card-meta" id="claimDetails-msig-${mm.key}">
          <div class="claim-card-meta-row"><span class="claim-card-meta-label">Parity Multisig</span><span class="claim-card-meta-value"><a href="${etherscanAddr(mm.multisigAddr)}" target="_blank" rel="noopener noreferrer">${mm.multisigAddr}</a></span></div>
          <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 1</span><span class="claim-card-meta-value"><span style="color:var(--text)">execute(DAO, 0, approve(WithdrawDAO, balance))</span></span></div>
          <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 2</span><span class="claim-card-meta-value"><span style="color:var(--text)">execute(WithdrawDAO, 0, withdraw())</span></span></div>
          <div class="claim-card-meta-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)"><span class="claim-card-meta-label" style="color:#facc15">Parity Multisig</span><span class="claim-card-meta-value" style="color:#facc15">Your wallet is an owner. ETH will be sent to the multisig. May require additional confirmations.</span></div>
        </div>
        <div class="claim-card-actions">
          ${mmActionBtn}
        </div>
        <div class="claim-card-status" id="claimStatus-msig-${mm.key}"></div>
      </div>`;
  }
  if (!hasBalance) {
    html = `<div class="no-balance-state">
      <div class="no-balance-check">&#10003;</div>
      <div class="no-balance-title">No unclaimed ETH found</div>
      <div class="no-balance-addr">${esc(checkAddr)}</div>
      <p style="font-size:12px">Checked ${Object.keys(EXCHANGES).length} contracts. Try other wallets from 2015-2019.</p>
    </div>` + _botCTA;
    var _bannerTitle = 'Scan Complete';
  } else {
    let totalEth = 0;
    for (const b of Object.values(userBalances)) { if (b > 0n) totalEth += parseFloat(ethers.formatEther(b)); }
    const usdStr = ethPrice ? fmtUsd(totalEth * ethPrice) : '';
    const prefix = `<div class="claim-hero">
      <div class="claim-hero-amount">${fmtEth(totalEth)} ETH</div>
      ${usdStr ? '<div class="claim-hero-usd">' + usdStr + '</div>' : ''}
      <div class="claim-hero-contracts">${claimCount} contract${claimCount > 1 ? 's' : ''}</div>
    </div>`;
    const isMismatch = overrideAddress && overrideAddress.toLowerCase() !== walletAddress.toLowerCase();
    const mismatchNote = isMismatch
      ? `<div style="text-align:center;margin-top:12px;padding:10px;background:var(--bg2);border:1px solid var(--yellow);border-radius:8px;font-size:12px;color:var(--text2)">
          Showing balances for <b>${esc(truncAddr(overrideAddress))}</b>. To withdraw, connect the wallet that owns this address.
        </div>` : '';
    html = prefix + '<div class="claim-rows-list">' + html + '</div>' + mismatchNote + _botCTA;
    var _bannerTitle = 'Claimable ETH Found';
    var _celebrate = true;
    logEvent('found', { address: checkAddr, contracts_found: claimCount, total_eth: totalEth });
  }

  // Wait for minimum spinner display time before showing results
  await scanMinDelay();
  document.getElementById('claimBannerTitle').textContent = _bannerTitle;
  if (_celebrate) banner.classList.add('celebrate');
  rowsEl.innerHTML = html;
  banner.classList.add('visible');

  // Re-engagement Loop: render the inline "since your last check..." message
  // when the API response includes a recognition payload (returning visitor with new matches).
  try {
    if (apiResp && apiResp.data && apiResp.data.recognition) {
      var rec = apiResp.data.recognition;
      var newProtocols = rec.newly_added || [];
      if (newProtocols.length > 0) {
        var recMsg = document.createElement('div');
        recMsg.className = 'recognition-message';
        var icon = document.createElement('div');
        icon.className = 'recognition-icon';
        icon.textContent = '\u2728';
        recMsg.appendChild(icon);
        var content = document.createElement('div');
        content.className = 'recognition-content';
        var heading = document.createElement('h4');
        heading.textContent = 'Since your last check, you have new balances in:';
        content.appendChild(heading);
        var ul = document.createElement('ul');
        for (var i = 0; i < newProtocols.length; i++) {
          var li = document.createElement('li');
          var strong = document.createElement('strong');
          strong.textContent = newProtocols[i];
          li.appendChild(strong);
          ul.appendChild(li);
        }
        content.appendChild(ul);
        var meta = document.createElement('p');
        meta.className = 'recognition-meta';
        meta.textContent = 'Eligible since ' + (rec.first_eligible_at || 'recently') + '. The results below now include this match.';
        content.appendChild(meta);
        recMsg.appendChild(content);
        rowsEl.insertBefore(recMsg, rowsEl.firstChild);
        // Fire the recognition-seen POST so the message doesn't show again next visit
        fetch('/api/eligible-recognition-seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: apiResp.data.address }),
        }).catch(function() { /* silent */ });
      }
    }
  } catch (e) { /* silent — recognition is optional */ }

  // Disable withdraw buttons if address mismatch
  const isMismatchFinal = overrideAddress && overrideAddress.toLowerCase() !== walletAddress.toLowerCase();
  if (isMismatchFinal) {
    rowsEl.querySelectorAll('.claim-btn').forEach(btn => {
      if (btn.dataset.allowMismatch === 'true') return; // Parity multisig: owner can act
      btn.disabled = true;
      btn.title = 'Connect the wallet that owns this address to withdraw';
    });
  }

  // Render ENS deeds now that DOM is ready (fixes race with setTimeout)
  if (window._ensRenderDeeds) {
    if (window._pendingENSDeeds) {
      window._ensRenderDeeds(window._pendingENSDeeds);
      window._pendingENSDeeds = null;
    } else if (window._ensLookupPromise) {
      window._ensLookupPromise.then(deeds => {
        window._ensRenderDeeds(deeds);
        if (!deeds) {
          const el = document.getElementById('ensLookupStatus');
          if (el) el.textContent = 'Lookup failed';
        }
      });
      window._ensLookupPromise = null;
    }
    window._ensRenderDeeds = null;
  }

}

async function claimETH(key) {
  const cfg = EXCHANGES[key];
  const btn = document.getElementById('claimBtn-' + key);
  const statusEl = document.getElementById('claimStatus-' + key);
  const balance = userBalances[key];

  if (!balance || balance === 0n) return;
  if (!walletAddress || !walletSigner) { showInlineError('walletError', 'Wallet disconnected. Please reconnect.'); return; }
  if (btn.disabled) return; // prevent double-submit
  btn.disabled = true;

  // ── Test Mode: simulate successful claim ──
  if (TEST_MODE) {
    await _testClaimETH(key, cfg, btn, statusEl, balance);
    return;
  }

  if (!await checkNetwork()) {
    showInlineError('networkWarn', 'Please switch to Ethereum Mainnet to claim your ETH.', 0); document.getElementById('networkWarn').classList.add('visible');
    btn.disabled = false;
    return;
  }

  // ── Aave v1 click-time debt preflight ──────────────────────────────
  // The result-card render trusts a missing _aaveV1DebtState as "no debt",
  // which means a stale/failed/race-condition detection sends the user
  // straight to a doomed redeem. Re-verify here before signing — it's the
  // only place we can guarantee the check actually ran. If debt is found,
  // populate state (so the next re-scan surfaces the multi-step Repay UI)
  // and abort. ~373 ETH across ~597 holders is currently locked behind
  // dust-debt positions this catches.
  if (cfg.aaveV1Repay) {
    try {
      const lpAbi = [
        'function getUserAccountData(address) view returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)',
        'function getUserReserveData(address,address) view returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool)'
      ];
      const lp = new ethers.Contract(cfg.aaveV1Repay.lendingPool, lpAbi, walletProvider || walletSigner);
      const acct = await lp.getUserAccountData(walletAddress);
      const totalBorrowsETH = acct[2];
      if (totalBorrowsETH > 0n) {
        // Has outstanding debt — refuse the redeem and populate state for
        // the next render pass so the multi-step UI surfaces.
        const debts = {};
        for (const [sym, info] of Object.entries(cfg.aaveV1Repay.tokens)) {
          try {
            const rd = await lp.getUserReserveData(info.addr, walletAddress);
            const totalOwed = rd[1] + rd[6];
            if (totalOwed > 0n) debts[sym] = { amount: totalOwed, decimals: info.decimals, addr: info.addr };
          } catch {}
        }
        window._aaveV1DebtState = window._aaveV1DebtState || {};
        window._aaveV1DebtState[key] = { hasDebt: Object.keys(debts).length > 0, debts };
        const debtSummary = Object.entries(debts).map(([sym, d]) => {
          const fmt = parseFloat(ethers.formatUnits(d.amount, d.decimals));
          return fmt.toFixed(sym === 'WBTC' ? 6 : (sym === 'USDC' || sym === 'USDT') ? 2 : 4) + ' ' + sym;
        }).join(', ') || 'unknown';
        btn.disabled = false;
        btn.textContent = 'Redeem aETH';
        // Build the warning DOM safely — no innerHTML with interpolated values.
        statusEl.textContent = '';
        const warn = document.createElement('div');
        warn.style.cssText = 'padding:12px;background:rgba(250,204,21,0.08);border:1px solid #facc15;border-radius:6px;margin-top:8px;color:#facc15;font-size:13px;line-height:1.5';
        const title = document.createElement('b');
        title.textContent = '⚠️ Outstanding debt blocks redeem.';
        warn.appendChild(title);
        warn.appendChild(document.createElement('br'));
        warn.appendChild(document.createTextNode('You have '));
        const debtSpan = document.createElement('strong');
        debtSpan.textContent = debtSummary;
        warn.appendChild(debtSpan);
        warn.appendChild(document.createTextNode(' borrowed against this aETH. Aave v1 won\'t allow redemption until the debt is repaid.'));
        warn.appendChild(document.createElement('br'));
        warn.appendChild(document.createTextNode('Reconnect your wallet (or refresh the page) — the site will then show the multi-step Repay → Redeem flow.'));
        statusEl.appendChild(warn);
        logEvent('claim_failed', { address: walletAddress, contract: key, extra: { reason: 'preflight_debt_detected', debt_assets: Object.keys(debts) } });
        return;
      }
    } catch (e) {
      btn.disabled = false;
      btn.textContent = 'Redeem aETH';
      statusEl.textContent = 'Could not verify debt state — please refresh and try again.';
      logEvent('claim_failed', { address: walletAddress, contract: key, extra: { reason: 'preflight_check_threw', err: (e.shortMessage || e.message || '?').slice(0, 100) } });
      return;
    }
  }

  btn.textContent = 'Confirming...';
  btn.classList.add('pending');
  statusEl.textContent = 'Confirm in wallet...';

  let tx = null;
  try {
    const contract = new ethers.Contract(cfg.contract, [cfg.withdrawAbi], walletSigner);
    const args = cfg.withdrawArgs(balance, walletAddress);
    const ethAmount = ethers.formatEther(balance);

    window.va?.track?.('claim_initiated', { exchange: cfg.name, amount_eth: ethAmount });
    logEvent('claim_started', { address: walletAddress, contract: key, amount_eth: parseFloat(ethAmount) });

    tx = await contract[cfg.withdrawCall](...args);

    btn.textContent = 'Pending...';
    const claimedEthNum = parseFloat(ethAmount);
    const claimUsd = _ethPrice ? ' (' + fmtUsd(claimedEthNum * _ethPrice) + ')' : '';
    statusEl.innerHTML = `<div style="padding:12px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);margin-top:8px">
      <div style="font-size:12px;color:var(--text2);margin-bottom:4px">Transaction submitted — waiting for confirmation...</div>
      <div style="font-family:monospace;font-size:12px;word-break:break-all"><a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">${tx.hash}</a></div>
    </div>`;

    window.va?.track?.('claim_submitted', { exchange: cfg.name, amount_eth: ethAmount, tx_hash: tx.hash });

    const receipt = await tx.wait();

    window.va?.track?.('claim_confirmed', { exchange: cfg.name, amount_eth: ethAmount, tx_hash: tx.hash, block: receipt.blockNumber });
    logEvent('claim_confirmed', { address: walletAddress, contract: key, amount_eth: parseFloat(ethAmount), tx_hash: tx.hash, block_num: receipt.blockNumber });

    btn.textContent = 'Done';
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    statusEl.innerHTML = `<div class="claim-recovered">
        <div class="claim-recovered-label">Recovered</div>
        <div class="claim-recovered-amount">${fmtEth(ethAmount)} ETH${claimUsd}</div>
        <div class="claim-recovered-tx"><a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div>
      </div>`;
    showDonationModal(claimedEthNum);
    userBalances[key] = 0n;
  } catch (e) {
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      btn.disabled = false;
      btn.textContent = 'Withdraw';
      btn.classList.remove('pending');
      statusEl.textContent = 'Rejected';
      logEvent('claim_failed', { address: walletAddress, contract: key, extra: { reason: 'rejected' } });
    } else if (tx && tx.hash) {
      btn.textContent = 'Submitted';
      btn.classList.remove('pending');
      btn.style.opacity = '0.7';
      statusEl.textContent = 'Tx sent but confirmation timed out. Check on Etherscan: ' + tx.hash.slice(0, 22) + '...';
      logEvent('claim_failed', { address: walletAddress, contract: key, extra: { reason: 'timeout', tx_hash: tx.hash } });
    } else {
      btn.disabled = false;
      btn.textContent = 'Withdraw';
      btn.classList.remove('pending');
      console.error('Claim error:', e);
      statusEl.textContent = 'Failed. Try again.';
      logEvent('claim_failed', { address: walletAddress, contract: key, extra: { reason: (e.reason || e.message || 'unknown').slice(0, 200) } });
    }
  }
}

// ─── Two-step lock (e.g. Joyso lockMe) ───

async function claimLockMe(key) {
  const cfg = EXCHANGES[key];
  if (!cfg.twoStep) return;
  const btn = document.getElementById('claimBtn-' + key);
  const statusEl = document.getElementById('claimStatus-' + key);
  if (btn.disabled) return;
  btn.disabled = true;

  if (TEST_MODE) {
    btn.textContent = 'Locked';
    statusEl.textContent = `Unlock started. Come back in ${cfg.twoStep.lockDays} days to withdraw.`;
    return;
  }

  if (!await checkNetwork()) {
    showInlineError('networkWarn', 'Please switch to Ethereum Mainnet to claim your ETH.', 0); document.getElementById('networkWarn').classList.add('visible');
    btn.disabled = false;
    return;
  }
  btn.textContent = 'Confirming...';
  btn.classList.add('pending');
  statusEl.textContent = 'Confirm in wallet...';

  try {
    const contract = new ethers.Contract(cfg.contract, [cfg.twoStep.lockAbi], walletSigner);
    window.va?.track?.('lock_initiated', { exchange: cfg.name });

    const tx = await contract[cfg.twoStep.lockCall]();

    btn.textContent = 'Pending...';
    statusEl.innerHTML = `Tx submitted: <a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">${tx.hash.slice(0, 18)}...</a>`;

    const receipt = await tx.wait();
    window.va?.track?.('lock_confirmed', { exchange: cfg.name, tx_hash: tx.hash });

    const unlockDate = new Date(Date.now() + cfg.twoStep.lockDays * 86400 * 1000).toLocaleDateString();
    btn.textContent = 'Locked';
    btn.classList.remove('pending');
    btn.style.opacity = '0.7';
    statusEl.innerHTML = `<div style="padding:10px 0">
        Unlock started. Withdraw available <strong>${unlockDate}</strong> (${cfg.twoStep.lockDays} days).
        <div class="claim-recovered-tx"><a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div>
        <div style="font-size:11px;margin-top:4px;color:var(--text2)">Bookmark this page and come back after ${unlockDate} to complete withdrawal.</div>
      </div>`;
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Step 1: Unlock';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      statusEl.textContent = 'Rejected';
    } else {
      console.error('Lock error:', e);
      statusEl.textContent = 'Failed. Try again.';
    }
  }
}

// ─── NuCypher WorkLock (2-step: claim + refund) ───

async function nucypherClaim(key) {
  const cfg = EXCHANGES[key];
  const btn = document.getElementById('claimBtn-' + key);
  const statusEl = document.getElementById('claimStatus-' + key);

  if (TEST_MODE) {
    btn.disabled = true; btn.textContent = 'Claiming...'; btn.classList.add('pending');
    await new Promise(r => setTimeout(r, 1000));
    btn.textContent = 'Step 1: Claimed'; btn.classList.remove('pending'); btn.style.opacity = '0.35';
    const step2Btn = btn.nextElementSibling;
    if (step2Btn) { step2Btn.disabled = false; step2Btn.style.opacity = '1'; step2Btn.id = 'claimBtn-' + key; step2Btn.dataset.action = 'nucypher-refund'; step2Btn.dataset.key = key; }
    statusEl.innerHTML = '<span style="color:var(--green)">Claimed. Click Step 2 to refund ETH.</span>';
    return;
  }

  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }
  if (!walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }

  btn.disabled = true; btn.textContent = 'Claiming...'; btn.classList.add('pending');
  try {
    const wc = new ethers.Contract(cfg.contract, ['function claim()'], walletSigner);
    logEvent('claim_started', { address: walletAddress, contract: key });
    const tx = await wc.claim();
    statusEl.textContent = 'Waiting for confirmation...';
    await tx.wait();
    btn.textContent = 'Step 1: Claimed'; btn.classList.remove('pending'); btn.style.opacity = '0.35';
    const step2Btn = btn.nextElementSibling;
    if (step2Btn) { step2Btn.disabled = false; step2Btn.style.opacity = '1'; step2Btn.id = 'claimBtn-' + key; step2Btn.dataset.action = 'nucypher-refund'; step2Btn.dataset.key = key; }
    statusEl.innerHTML = '<span style="color:var(--green)">Claimed. Click Step 2 to refund ETH.</span>';
    window.va?.track?.('nucypher_claim_confirmed', { exchange: cfg.name, tx_hash: tx.hash });
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Step 1: Claim'; btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) { statusEl.textContent = 'Rejected'; }
    else { statusEl.textContent = 'Claim failed: ' + (e.reason || e.message || 'Unknown error'); }
  }
}

async function nucypherRefund(key) {
  const cfg = EXCHANGES[key];
  const btn = document.getElementById('claimBtn-' + key);
  const statusEl = document.getElementById('claimStatus-' + key);

  if (TEST_MODE) {
    btn.disabled = true; btn.textContent = 'Refunding...'; btn.classList.add('pending');
    await new Promise(r => setTimeout(r, 1500));
    const ethAmount = ethers.formatEther(userBalances[key] || 0n);
    const claimedEthNum = parseFloat(ethAmount);
    const claimUsd = _ethPrice ? ' (' + fmtUsd(claimedEthNum * _ethPrice) + ')' : '';
    const fakeTxHash = '0x' + Array.from({length: 64}, () => '0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
    btn.textContent = 'Done'; btn.classList.remove('pending'); btn.style.background = 'var(--green)'; btn.style.opacity = '0.7';
    statusEl.innerHTML = `<div class="claim-recovered"><div class="claim-recovered-label">Recovered</div><div class="claim-recovered-amount">${fmtEth(ethAmount)} ETH${claimUsd}</div><div class="claim-recovered-tx"><a href="${etherscanTx(fakeTxHash)}" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div><div style="font-size:10px;color:var(--yellow);margin-top:2px">[TEST MODE]</div></div>`;
    showDonationModal(claimedEthNum);
    userBalances[key] = 0n;
    return;
  }

  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }
  if (!walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }

  btn.disabled = true; btn.textContent = 'Refunding...'; btn.classList.add('pending');
  try {
    const wc = new ethers.Contract(cfg.contract, ['function refund()'], walletSigner);
    logEvent('claim_started', { address: walletAddress, contract: key, amount_eth: parseFloat(ethers.formatEther(userBalances[key] || 0n)) });
    const tx = await wc.refund();
    btn.textContent = 'Pending...';
    statusEl.innerHTML = `Tx submitted: <a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">${tx.hash.slice(0, 18)}...</a>`;
    window.va?.track?.('claim_submitted', { exchange: cfg.name, tx_hash: tx.hash });
    const receipt = await tx.wait();
    const ethAmount = ethers.formatEther(userBalances[key] || 0n);
    const claimedEthNum = parseFloat(ethAmount);
    const claimUsd = _ethPrice ? ' (' + fmtUsd(claimedEthNum * _ethPrice) + ')' : '';
    window.va?.track?.('claim_confirmed', { exchange: cfg.name, amount_eth: ethAmount, tx_hash: tx.hash, block: receipt.blockNumber });
    logEvent('claim_confirmed', { address: walletAddress, contract: key, amount_eth: claimedEthNum, tx_hash: tx.hash, block_num: receipt.blockNumber });
    btn.textContent = 'Done'; btn.classList.remove('pending'); btn.style.background = 'var(--green)'; btn.style.opacity = '0.7';
    statusEl.innerHTML = `<div class="claim-recovered"><div class="claim-recovered-label">Recovered</div><div class="claim-recovered-amount">${fmtEth(ethAmount)} ETH${claimUsd}</div><div class="claim-recovered-tx"><a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div></div>`;
    showDonationModal(claimedEthNum);
    userBalances[key] = 0n;
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Step 2: Refund ETH'; btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) { statusEl.textContent = 'Rejected'; }
    else { statusEl.textContent = 'Refund failed: ' + (e.reason || e.message || 'Unknown error'); }
  }
}

// ─── DigixDAO Acid (2-step: approve DGD + burn) ───

async function digixApprove(key) {
  const cfg = EXCHANGES[key];
  const btn = document.getElementById('claimBtn-' + key);
  const statusEl = document.getElementById('claimStatus-' + key);

  // Test mode: simulate approval via Tenderly
  if (TEST_MODE && _testImpersonateAddr) {
    btn.disabled = true;
    btn.textContent = 'Simulating approve...';
    btn.classList.add('pending');
    statusEl.textContent = 'Simulating as ' + _testImpersonateAddr.slice(0, 10) + '...';
    var iface = new ethers.Interface(['function approve(address spender, uint256 amount) returns (bool)']);
    var balance = userBalances[key] || 0n;
    var calldata = iface.encodeFunctionData('approve', [cfg.digixBurn.acidContract, balance]);
    var result = await testSimulateTx(_testImpersonateAddr, cfg.digixBurn.dgdToken, calldata);
    if (result.success) {
      btn.textContent = 'Step 1: SIM OK';
      btn.classList.remove('pending');
      btn.style.background = 'var(--green)';
      btn.style.opacity = '0.35';
      var step2Btn = btn.nextElementSibling;
      if (step2Btn) { step2Btn.disabled = false; step2Btn.style.opacity = '1'; step2Btn.id = 'claimBtn-' + key; step2Btn.dataset.action = 'digix-burn'; step2Btn.dataset.key = key; }
      statusEl.innerHTML = '<span style="color:var(--green)">[TEST] approve() passed. Click Step 2 to simulate burn.</span>';
    } else {
      btn.textContent = 'SIM FAIL'; btn.classList.remove('pending'); btn.style.background = '#ef4444';
      statusEl.innerHTML = '<span style="color:#ef4444">[TEST] approve() reverted: ' + esc((result.error || '').slice(0, 150)) + '</span>';
    }
    return;
  }

  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }
  if (!walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }

  btn.disabled = true;
  btn.textContent = 'Approving...';
  btn.classList.add('pending');

  try {
    const dgdContract = new ethers.Contract(cfg.digixBurn.dgdToken, ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256) returns (bool)'], walletSigner);
    const dgdBal = await dgdContract.balanceOf(walletAddress);
    const tx = await dgdContract.approve(cfg.digixBurn.acidContract, dgdBal);
    statusEl.textContent = 'Waiting for confirmation...';
    await tx.wait();
    // Dim step 1, enable step 2
    btn.textContent = 'Step 1: Approved';
    btn.classList.remove('pending');
    btn.disabled = true;
    btn.style.opacity = '0.35';
    const step2Btn = btn.nextElementSibling;
    if (step2Btn) {
      step2Btn.disabled = false;
      step2Btn.style.opacity = '1';
      step2Btn.id = 'claimBtn-' + key;
      step2Btn.dataset.action = 'digix-burn';
      step2Btn.dataset.key = key;
    }
    statusEl.innerHTML = '<span style="color:var(--green)">Approved. Click Step 2 to burn DGD and claim ETH.</span>';
    window.va?.track?.('digix_approve_confirmed', { exchange: cfg.name, tx_hash: tx.hash });
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Step 1: Approve DGD';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      statusEl.textContent = 'Rejected';
    } else {
      statusEl.textContent = 'Approve failed: ' + (e.reason || e.message || 'Unknown error');
    }
  }
}

async function digixBurn(key) {
  const cfg = EXCHANGES[key];
  const btn = document.getElementById('claimBtn-' + key);
  const statusEl = document.getElementById('claimStatus-' + key);

  // Test mode: simulate burn via Tenderly
  if (TEST_MODE && _testImpersonateAddr) {
    btn.disabled = true;
    btn.textContent = 'Simulating burn...';
    btn.classList.add('pending');
    statusEl.textContent = 'Simulating burn() as ' + _testImpersonateAddr.slice(0, 10) + '...';
    var iface = new ethers.Interface(['function burn()']);
    var calldata = iface.encodeFunctionData('burn', []);
    var result = await testSimulateTx(_testImpersonateAddr, cfg.digixBurn.acidContract, calldata);
    var ethAmount = ethers.formatEther(userBalances[key] || 0n);
    var claimedEthNum = parseFloat(ethAmount);
    if (result.success) {
      btn.textContent = 'SIM OK';
      btn.classList.remove('pending');
      btn.style.background = 'var(--green)';
      btn.style.opacity = '0.7';
      var claimUsd = _ethPrice ? ' (' + fmtUsd(claimedEthNum * _ethPrice) + ')' : '';
      statusEl.innerHTML = '<div class="claim-recovered"><div class="claim-recovered-label" style="color:var(--green)">Simulation Passed</div><div class="claim-recovered-amount">' + fmtEth(ethAmount) + ' ETH' + claimUsd + '</div><div style="font-size:10px;color:#d946ef;margin-top:2px">[TEST] burn() would succeed</div></div>';
      showDonationModal(claimedEthNum);
    } else {
      btn.textContent = 'SIM FAIL'; btn.classList.remove('pending'); btn.style.background = '#ef4444';
      statusEl.innerHTML = '<span style="color:#ef4444">[TEST] burn() reverted: ' + esc((result.error || '').slice(0, 200)) + '</span>';
    }
    return;
  }

  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }
  if (!walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }

  btn.disabled = true;
  btn.textContent = 'Burning DGD...';
  btn.classList.add('pending');

  try {
    const acidContract = new ethers.Contract(cfg.digixBurn.acidContract, ['function burn()'], walletSigner);
    logEvent('claim_started', { address: walletAddress, contract: key, amount_eth: parseFloat(ethers.formatEther(userBalances[key] || 0n)) });
    const tx = await acidContract.burn();
    btn.textContent = 'Pending...';
    statusEl.innerHTML = `Tx submitted: <a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">${tx.hash.slice(0, 18)}...</a>`;

    window.va?.track?.('claim_submitted', { exchange: cfg.name, tx_hash: tx.hash });
    const receipt = await tx.wait();

    const ethAmount = ethers.formatEther(userBalances[key] || 0n);
    const claimedEthNum = parseFloat(ethAmount);
    const claimUsd = _ethPrice ? ' (' + fmtUsd(claimedEthNum * _ethPrice) + ')' : '';
    window.va?.track?.('claim_confirmed', { exchange: cfg.name, amount_eth: ethAmount, tx_hash: tx.hash, block: receipt.blockNumber });
    logEvent('claim_confirmed', { address: walletAddress, contract: key, amount_eth: claimedEthNum, tx_hash: tx.hash, block_num: receipt.blockNumber });
    btn.textContent = 'Done';
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    statusEl.innerHTML = `<div class="claim-recovered">
        <div class="claim-recovered-label">Recovered</div>
        <div class="claim-recovered-amount">${fmtEth(ethAmount)} ETH${claimUsd}</div>
        <div class="claim-recovered-tx"><a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div>
      </div>
      `;
    showDonationModal(claimedEthNum);
    userBalances[key] = 0n;
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Claim ETH';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      statusEl.textContent = 'Rejected';
    } else {
      statusEl.textContent = 'Burn failed: ' + (e.reason || e.message || 'Unknown error');
    }
  }
}

// ─── The DAO (2-step: approve DAO tokens to WithdrawDAO + withdraw) ───

async function daoApprove(key) {
  const cfg = EXCHANGES[key];
  const btn = document.getElementById('claimBtn-' + key);
  const statusEl = document.getElementById('claimStatus-' + key);

  if (TEST_MODE) {
    btn.disabled = true;
    btn.textContent = 'Approving...';
    btn.classList.add('pending');
    await new Promise(r => setTimeout(r, 1000));
    btn.textContent = 'Step 1: Approved';
    btn.classList.remove('pending');
    btn.style.opacity = '0.35';
    const step2Btn = btn.nextElementSibling;
    if (step2Btn) {
      step2Btn.disabled = false;
      step2Btn.style.opacity = '1';
      step2Btn.id = 'claimBtn-' + key;
      step2Btn.dataset.action = 'dao-withdraw';
      step2Btn.dataset.key = key;
    }
    statusEl.innerHTML = '<span style="color:var(--green)">Approved. Click Step 2 to claim ETH.</span>';
    return;
  }

  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }
  if (!walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }

  btn.disabled = true;
  btn.textContent = 'Approving...';
  btn.classList.add('pending');

  try {
    const daoContract = new ethers.Contract(cfg.daoWithdraw.daoToken, ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256) returns (bool)'], walletSigner);
    const daoBal = await daoContract.balanceOf(walletAddress);
    const tx = await daoContract.approve(cfg.daoWithdraw.withdrawContract, daoBal);
    statusEl.textContent = 'Waiting for confirmation...';
    await tx.wait();
    btn.textContent = 'Step 1: Approved';
    btn.classList.remove('pending');
    btn.disabled = true;
    btn.style.opacity = '0.35';
    const step2Btn = btn.nextElementSibling;
    if (step2Btn) {
      step2Btn.disabled = false;
      step2Btn.style.opacity = '1';
      step2Btn.id = 'claimBtn-' + key;
      step2Btn.dataset.action = 'dao-withdraw';
      step2Btn.dataset.key = key;
    }
    statusEl.innerHTML = '<span style="color:var(--green)">Approved. Click Step 2 to claim ETH.</span>';
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Step 1: Approve DAO';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      statusEl.textContent = 'Rejected';
    } else {
      statusEl.textContent = 'Approve failed: ' + (e.reason || e.message || 'Unknown error');
    }
  }
}

async function daoWithdrawExecute(key) {
  const cfg = EXCHANGES[key];
  const btn = document.getElementById('claimBtn-' + key);
  const statusEl = document.getElementById('claimStatus-' + key);

  if (TEST_MODE) {
    btn.disabled = true;
    btn.textContent = 'Withdrawing...';
    btn.classList.add('pending');
    await new Promise(r => setTimeout(r, 1500));
    const ethAmount = ethers.formatEther(userBalances[key] || 0n);
    const claimedEthNum = parseFloat(ethAmount);
    const fakeTxHash = '0x' + Array.from({length: 64}, () => '0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
    btn.textContent = 'Done';
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    const claimUsd = _ethPrice ? ' (' + fmtUsd(claimedEthNum * _ethPrice) + ')' : '';
    statusEl.innerHTML = `<div class="claim-recovered">
      <div class="claim-recovered-label">Recovered</div>
      <div class="claim-recovered-amount">${fmtEth(ethAmount)} ETH${claimUsd}</div>
      <div class="claim-recovered-tx"><a href="${etherscanTx(fakeTxHash)}" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div>
      <div style="font-size:10px;color:var(--yellow);margin-top:2px">[TEST MODE]</div>
    </div>
    `;
    showDonationModal(claimedEthNum);
    userBalances[key] = 0n;
    return;
  }

  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }
  if (!walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }

  btn.disabled = true;
  btn.textContent = 'Withdrawing...';
  btn.classList.add('pending');

  try {
    const withdrawContract = new ethers.Contract(cfg.daoWithdraw.withdrawContract, ['function withdraw()'], walletSigner);
    logEvent('claim_started', { address: walletAddress, contract: key, amount_eth: parseFloat(ethers.formatEther(userBalances[key] || 0n)) });
    const tx = await withdrawContract.withdraw();
    btn.textContent = 'Pending...';
    statusEl.innerHTML = `Tx submitted: <a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">${tx.hash.slice(0, 18)}...</a>`;

    const receipt = await tx.wait();

    const ethAmount = ethers.formatEther(userBalances[key] || 0n);
    const claimedEthNum = parseFloat(ethAmount);
    const claimUsd = _ethPrice ? ' (' + fmtUsd(claimedEthNum * _ethPrice) + ')' : '';
    logEvent('claim_confirmed', { address: walletAddress, contract: key, amount_eth: claimedEthNum, tx_hash: tx.hash, block_num: receipt.blockNumber });
    btn.textContent = 'Done';
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    statusEl.innerHTML = `<div class="claim-recovered">
        <div class="claim-recovered-label">Recovered</div>
        <div class="claim-recovered-amount">${fmtEth(ethAmount)} ETH${claimUsd}</div>
        <div class="claim-recovered-tx"><a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div>
      </div>
      `;
    showDonationModal(claimedEthNum);
    userBalances[key] = 0n;
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Claim ETH';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      statusEl.textContent = 'Rejected';
    } else {
      statusEl.textContent = 'Withdraw failed: ' + (e.reason || e.message || 'Unknown error');
    }
  }
}

// ─── The DAO: Parity Multisig path (execute approve + execute withdraw) ───

async function daoMsigApprove(key, msigAddr) {
  const cfg = EXCHANGES[key];
  const btn = document.getElementById('claimBtn-msig-' + key) || document.getElementById('claimBtn-' + key);
  const statusEl = document.getElementById('claimStatus-msig-' + key) || document.getElementById('claimStatus-' + key);

  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }
  if (!walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }

  btn.disabled = true;
  btn.textContent = 'Submitting...';
  btn.classList.add('pending');

  try {
    // Encode: approve(withdrawDAO, maxUint256)
    const iface = new ethers.Interface(['function approve(address,uint256) returns (bool)']);
    const calldata = iface.encodeFunctionData('approve', [cfg.daoWithdraw.withdrawContract, ethers.MaxUint256]);

    const multisig = new ethers.Contract(msigAddr, ['function execute(address,uint256,bytes) returns (bytes32)'], walletSigner);
    const tx = await multisig.execute(cfg.daoWithdraw.daoToken, 0n, calldata);
    statusEl.innerHTML = `Tx submitted: <a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">${tx.hash.slice(0, 18)}...</a>`;
    btn.textContent = 'Pending...';
    await tx.wait();

    // Check if approval went through (multisig might need more confirmations)
    const daoContract = new ethers.Contract(cfg.daoWithdraw.daoToken, ['function allowance(address,address) view returns (uint256)'], walletProvider);
    const newAllowance = await daoContract.allowance(msigAddr, cfg.daoWithdraw.withdrawContract);
    if (newAllowance > 0n) {
      btn.textContent = 'Step 1: Approved';
      btn.classList.remove('pending');
      btn.disabled = true;
      btn.style.opacity = '0.35';
      const step2Btn = btn.nextElementSibling;
      if (step2Btn) {
        step2Btn.disabled = false;
        step2Btn.style.opacity = '1';
        step2Btn.id = 'claimBtn-msig-' + key;
        step2Btn.dataset.action = 'dao-msig-withdraw';
        step2Btn.dataset.key = key;
        step2Btn.dataset.msig = msigAddr;
        step2Btn.dataset.allowMismatch = 'true';
      }
      statusEl.innerHTML = '<span style="color:var(--green)">Approved. Click Step 2 to withdraw ETH to the multisig.</span>';
    } else {
      btn.textContent = 'Submitted';
      btn.classList.remove('pending');
      btn.style.opacity = '0.7';
      statusEl.innerHTML = `Tx confirmed but approval not yet active. This multisig may require additional owner confirmations. <a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">View tx</a>`;
    }
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Step 1: Approve (via multisig)';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      statusEl.textContent = 'Rejected';
    } else {
      statusEl.textContent = 'Execute failed: ' + (e.reason || e.message || 'Unknown error');
    }
  }
}

async function daoMsigWithdraw(key, msigAddr) {
  const cfg = EXCHANGES[key];
  const btn = document.getElementById('claimBtn-msig-' + key) || document.getElementById('claimBtn-' + key);
  const statusEl = document.getElementById('claimStatus-msig-' + key) || document.getElementById('claimStatus-' + key);

  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }
  if (!walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }

  btn.disabled = true;
  btn.textContent = 'Submitting...';
  btn.classList.add('pending');

  try {
    // Encode: withdraw()
    const iface = new ethers.Interface(['function withdraw()']);
    const calldata = iface.encodeFunctionData('withdraw', []);

    const amountEth = parseFloat(ethers.formatEther(userBalances[key] || 0n));
    logEvent('claim_started', { address: msigAddr, contract: key, amount_eth: amountEth });

    const multisig = new ethers.Contract(msigAddr, ['function execute(address,uint256,bytes) returns (bytes32)'], walletSigner);
    const tx = await multisig.execute(cfg.daoWithdraw.withdrawContract, 0n, calldata);
    statusEl.innerHTML = `Tx submitted: <a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">${tx.hash.slice(0, 18)}...</a>`;
    btn.textContent = 'Pending...';
    const receipt = await tx.wait();

    // Check if DAO tokens were actually burned (withdrawal executed)
    const daoContract = new ethers.Contract(cfg.daoWithdraw.daoToken, ['function balanceOf(address) view returns (uint256)'], walletProvider);
    const remainingBal = await daoContract.balanceOf(msigAddr);
    if (remainingBal === 0n) {
      const claimUsd = _ethPrice ? ' (' + fmtUsd(amountEth * _ethPrice) + ')' : '';
      logEvent('claim_confirmed', { address: msigAddr, contract: key, amount_eth: amountEth, tx_hash: tx.hash, block_num: receipt.blockNumber });
      btn.textContent = 'Done';
      btn.classList.remove('pending');
      btn.style.background = 'var(--green)';
      btn.style.opacity = '0.7';
      statusEl.innerHTML = `<div class="claim-recovered">
          <div class="claim-recovered-label">Recovered to Multisig</div>
          <div class="claim-recovered-amount">${fmtEth(amountEth)} ETH${claimUsd}</div>
          <div class="claim-recovered-tx"><a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div>
        </div>`;
      userBalances[key] = 0n;
    } else {
      btn.textContent = 'Submitted';
      btn.classList.remove('pending');
      btn.style.opacity = '0.7';
      statusEl.innerHTML = `Tx confirmed but DAO tokens still in multisig. This multisig may require additional owner confirmations. <a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">View tx</a>`;
    }
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Step 2: Withdraw (via multisig)';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      statusEl.textContent = 'Rejected';
    } else {
      statusEl.textContent = 'Execute failed: ' + (e.reason || e.message || 'Unknown error');
    }
  }
}

// ─── Neufund LockedAccount (2-step: approveAndCall + withdraw ETH-T) ───

async function neufundApproveAndUnlock(key) {
  const cfg = EXCHANGES[key];
  const btn = document.getElementById('claimBtn-' + key);
  const statusEl = document.getElementById('claimStatus-' + key);
  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet to claim your ETH.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }

  const nfState = window._neufundLockedState?.[key];
  if (!nfState) { statusEl.textContent = 'State not loaded. Refresh page.'; return; }

  btn.disabled = true;
  btn.textContent = 'Confirming...';
  btn.classList.add('pending');
  statusEl.textContent = 'Confirm in wallet (burns NEU, returns ETH-T in one tx)...';

  try {
    const neuContract = new ethers.Contract(cfg.neufundLocked.neuToken,
      ['function approveAndCall(address spender, uint256 amount, bytes extraData) returns (bool)'], walletSigner);
    const tx = await neuContract.approveAndCall(cfg.neufundLocked.lockedAccount, nfState.neuDue, '0x');
    btn.textContent = 'Pending...';
    statusEl.innerHTML = `Tx submitted: <a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">${tx.hash.slice(0, 18)}...</a>`;
    await tx.wait();
    btn.textContent = 'Step 2: Withdraw ETH';
    btn.classList.remove('pending');
    btn.disabled = false;
    btn.dataset.action = 'neufund-withdraw-etht';
    statusEl.innerHTML = `Unlocked! ETH-T in your wallet. <a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">View tx</a>. Now click "Step 2: Withdraw ETH".`;
    window.va?.track?.('neufund_unlock_confirmed', { exchange: cfg.name, tx_hash: tx.hash });
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Step 1: Unlock';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      statusEl.textContent = 'Rejected';
    } else {
      console.error('ApproveAndCall error:', e);
      statusEl.textContent = 'Failed. Make sure you have enough NEU tokens.';
    }
  }
}

async function neufundWithdrawEthT(key) {
  const cfg = EXCHANGES[key];
  const btn = document.getElementById('claimBtn-' + key);
  const statusEl = document.getElementById('claimStatus-' + key);
  if (btn.disabled) return;
  btn.disabled = true;
  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet to claim your ETH.', 0); document.getElementById('networkWarn').classList.add('visible'); btn.disabled = false; return; }
  btn.textContent = 'Confirming...';
  btn.classList.add('pending');
  statusEl.textContent = 'Confirm ETH-T withdrawal in wallet...';

  try {
    const ethTContract = new ethers.Contract(cfg.neufundLocked.etherToken, ['function balanceOf(address) view returns (uint256)'], walletProvider);
    const ethTBal = await ethTContract.balanceOf(walletAddress);
    if (ethTBal === 0n) {
      btn.textContent = 'Done';
      btn.classList.remove('pending');
      statusEl.textContent = 'No ETH-T to withdraw. You may have already completed this step.';
      return;
    }
    const withdrawContract = new ethers.Contract(cfg.neufundLocked.etherToken, ['function withdraw(uint256)'], walletSigner);
    const tx = await withdrawContract.withdraw(ethTBal);
    const ethAmount = ethers.formatEther(ethTBal);
    btn.textContent = 'Pending...';
    statusEl.innerHTML = `Tx submitted: <a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">${tx.hash.slice(0, 18)}...</a>`;
    await tx.wait();
    const claimedEthNum = parseFloat(ethAmount);
    btn.textContent = 'Done';
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    const claimUsd = _ethPrice ? ' (' + fmtUsd(claimedEthNum * _ethPrice) + ')' : '';
    statusEl.innerHTML = `<div class="claim-recovered">
        <div class="claim-recovered-label">Recovered</div>
        <div class="claim-recovered-amount">${fmtEth(ethAmount)} ETH${claimUsd}</div>
        <div class="claim-recovered-tx"><a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div>
      </div>
      `;
    showDonationModal(claimedEthNum);
    userBalances[key] = 0n;
    window.va?.track?.('claim_confirmed', { exchange: cfg.name, amount_eth: ethAmount, tx_hash: tx.hash });
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Step 3: Withdraw ETH';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      statusEl.textContent = 'Rejected';
    } else {
      console.error('Withdraw error:', e);
      statusEl.textContent = 'Failed. Try again.';
    }
  }
}

// ─── Aave v1 (2-step: repay debt + redeem aETH) ───

async function switcheoAnnounce(key) {
  const cfg = EXCHANGES[key];
  const btn = document.getElementById('announceBtn-' + key);
  const withdrawBtn = document.getElementById('claimBtn-' + key);
  const statusEl = document.getElementById('claimStatus-' + key);
  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }
  if (!walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }
  const balance = userBalances[key] || 0n;
  if (balance === 0n) { statusEl.textContent = 'No balance to withdraw.'; return; }
  btn.disabled = true;
  btn.classList.add('pending');
  btn.textContent = 'Announcing...';
  try {
    const contract = new ethers.Contract(cfg.contract, [cfg.announceAbi], walletSigner);
    const tx = await contract[cfg.announceCall](...cfg.announceArgs(balance));
    statusEl.textContent = 'Waiting for confirmation...';
    await tx.wait();
    btn.textContent = 'Step 1: Announced';
    btn.classList.remove('pending');
    btn.style.opacity = '0.35';
    if (withdrawBtn) { withdrawBtn.disabled = false; withdrawBtn.style.opacity = '1'; }
    statusEl.textContent = 'Announced. Click Step 2 to withdraw.';
  } catch (e) {
    btn.disabled = false;
    btn.classList.remove('pending');
    btn.textContent = 'Step 1: Announce';
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      statusEl.textContent = 'Rejected';
    } else {
      statusEl.textContent = 'Announce failed: ' + (e.shortMessage || e.reason || e.message || 'Unknown error').slice(0, 150);
    }
  }
}

async function switcheoWithdraw(key) {
  const cfg = EXCHANGES[key];
  const btn = document.getElementById('claimBtn-' + key);
  const statusEl = document.getElementById('claimStatus-' + key);
  if (!walletSigner) return;
  const balance = userBalances[key] || 0n;
  btn.disabled = true;
  btn.classList.add('pending');
  btn.textContent = 'Withdrawing...';
  try {
    const contract = new ethers.Contract(cfg.contract, [cfg.withdrawAbi], walletSigner);
    const tx = await contract[cfg.withdrawCall](...cfg.withdrawArgs(balance, walletAddress));
    statusEl.textContent = 'Waiting for confirmation...';
    await tx.wait();
    const ethAmount = ethers.formatEther(balance);
    const claimUsd = window._ethPrice ? ' (~$' + (parseFloat(ethAmount) * window._ethPrice).toFixed(2) + ')' : '';
    btn.textContent = 'Done';
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    statusEl.innerHTML = '<div class="claim-recovered"><div class="claim-recovered-label">Recovered</div><div class="claim-recovered-amount">' + fmtEth(ethAmount) + ' ETH' + claimUsd + '</div><div class="claim-recovered-tx"><a href="' + etherscanTx(tx.hash) + '" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div></div>';
    showDonationModal(parseFloat(ethAmount));
    userBalances[key] = 0n;
  } catch (e) {
    btn.disabled = false;
    btn.classList.remove('pending');
    btn.textContent = 'Step 2: Withdraw';
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      statusEl.textContent = 'Rejected';
    } else {
      statusEl.textContent = 'Withdraw failed: ' + (e.shortMessage || e.reason || e.message || 'Unknown error').slice(0, 150);
    }
  }
}

async function aaveV1Approve(key, tokenSymbol) {
  const cfg = EXCHANGES[key];
  const btn = document.getElementById('approveBtn-' + key);
  const repayBtn = document.getElementById('repayBtn-' + key);
  const statusEl = document.getElementById('claimStatus-' + key);
  const debtState = window._aaveV1DebtState?.[key];
  if (!debtState?.hasDebt) return;
  const debtInfo = debtState.debts[tokenSymbol];
  if (!debtInfo) return;
  if (tokenSymbol === 'ETH') {
    // ETH debt doesn't need approval — skip to repay
    btn.textContent = 'Step 1: N/A (ETH)';
    btn.disabled = true;
    btn.style.opacity = '0.35';
    if (repayBtn) { repayBtn.disabled = false; repayBtn.style.opacity = '1'; }
    return;
  }
  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }
  if (!walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }
  btn.disabled = true;
  btn.classList.add('pending');
  btn.textContent = 'Approving ' + tokenSymbol + '...';
  try {
    const tokenContract = new ethers.Contract(
      debtInfo.addr,
      ['function approve(address,uint256) returns (bool)'],
      walletSigner
    );
    const approveAmount = debtInfo.amount * 101n / 100n; // 1% buffer for accrued interest
    const approveTx = await tokenContract.approve(cfg.aaveV1Repay.lendingPoolCore, approveAmount);
    statusEl.textContent = 'Waiting for approval confirmation...';
    await approveTx.wait();
    btn.textContent = 'Step 1: Approved';
    btn.classList.remove('pending');
    btn.style.opacity = '0.35';
    if (repayBtn) { repayBtn.disabled = false; repayBtn.style.opacity = '1'; }
    statusEl.textContent = 'Approved. Now click Step 2 to repay.';
  } catch (e) {
    btn.disabled = false;
    btn.classList.remove('pending');
    btn.textContent = 'Step 1: Approve ' + tokenSymbol;
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      statusEl.textContent = 'Approval rejected.';
    } else {
      statusEl.textContent = 'Approval failed: ' + (e.shortMessage || e.message || '').slice(0, 100);
    }
  }
}

async function aaveV1Repay(key, tokenSymbol) {
  const cfg = EXCHANGES[key];
  const btn = document.getElementById('repayBtn-' + key);
  const statusEl = document.getElementById('claimStatus-' + key);
  const debtState = window._aaveV1DebtState?.[key];
  if (!debtState?.hasDebt) return;

  const debtInfo = debtState.debts[tokenSymbol];
  if (!debtInfo) return;

  const isEthDebt = tokenSymbol === 'ETH';

  // Test mode: simulate full approve → repay → redeem bundle via Tenderly
  if (TEST_MODE && _testImpersonateAddr) {
    btn.disabled = true;
    btn.textContent = 'Simulating bundle...';
    btn.classList.add('pending');
    statusEl.textContent = 'Simulating approve → repay → redeem as ' + _testImpersonateAddr.slice(0, 10) + '...';

    var repayIface = new ethers.Interface(['function repay(address reserve, uint256 amount, address onBehalfOf) payable']);
    var redeemIface = new ethers.Interface([cfg.withdrawAbi]);
    var balance = userBalances[key] || 0n;
    var txs = [];
    // Known balanceOf storage slots for common ERC20s (slot used in keccak256(addr, slot))
    // Known balanceOf storage slots: keccak256(abi.encode(address, slot)) → balance
    // DAI=2, USDC=9, USDT=2, LINK=1, BAT=1, MKR=3, ZRX=0, KNC=0, LEND=0, MANA=0, REP=0
    // Proxy tokens (sUSD, SNX, TUSD, BUSD) may not work — balanceOf is on external state contract
    var TOKEN_BALANCE_SLOTS = { DAI: 2, USDC: 9, USDT: 2, WBTC: 0, LINK: 1, MKR: 3, KNC: 0, LEND: 0, BAT: 1, ZRX: 0, MANA: 0, REP: 0 };

    if (isEthDebt) {
      // ETH debt: repay (with ETH value) → redeem
      txs.push({
        label: 'repay ETH',
        from: _testImpersonateAddr,
        to: cfg.aaveV1Repay.lendingPool,
        data: repayIface.encodeFunctionData('repay', [cfg.aaveV1Repay.ethSentinel, ethers.MaxUint256, _testImpersonateAddr]),
        value: (debtInfo.amount * 101n / 100n).toString(),
      });
    } else {
      // ERC20 debt: approve → repay with token balance override
      var approveIface = new ethers.Interface(['function approve(address spender, uint256 amount) returns (bool)']);
      txs.push({
        label: 'approve ' + tokenSymbol,
        from: _testImpersonateAddr,
        to: debtInfo.addr,
        data: approveIface.encodeFunctionData('approve', [cfg.aaveV1Repay.lendingPoolCore, ethers.MaxUint256]),
      });
      txs.push({
        label: 'repay ' + tokenSymbol,
        from: _testImpersonateAddr,
        to: cfg.aaveV1Repay.lendingPool,
        data: repayIface.encodeFunctionData('repay', [debtInfo.addr, ethers.MaxUint256, _testImpersonateAddr]),
      });
    }

    // Final step: redeem aETH
    txs.push({
      label: 'redeem aETH',
      from: _testImpersonateAddr,
      to: cfg.contract,
      data: redeemIface.encodeFunctionData(cfg.withdrawCall, cfg.withdrawArgs(balance, _testImpersonateAddr)),
      recipient: _testImpersonateAddr,
    });

    try {
      var resp = await fetch('/api/simulate-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: txs,
          stateOverrides: (function() {
            var ov = { [_testImpersonateAddr]: { balance: '0x' + (10n ** 20n).toString(16) } };
            // Override ERC20 token balance if we know the storage slot
            if (!isEthDebt && TOKEN_BALANCE_SLOTS[tokenSymbol] !== undefined) {
              var slot = TOKEN_BALANCE_SLOTS[tokenSymbol];
              var paddedAddr = _testImpersonateAddr.toLowerCase().replace('0x', '').padStart(64, '0');
              var paddedSlot = slot.toString(16).padStart(64, '0');
              var storageKey = ethers.keccak256('0x' + paddedAddr + paddedSlot);
              var hugeVal = '0x' + (10n ** 24n).toString(16).padStart(64, '0');
              ov[debtInfo.addr] = { stateDiff: { [storageKey]: hugeVal } };
            }
            return ov;
          })(),
        }),
      });
      var result = await resp.json();
    } catch (e) {
      var result = { success: false, error: e.message };
    }

    var steps = (result.results || []).map(function(r) { return r.label + ': ' + (r.success ? '✓' : '✗'); }).join(' → ');
    btn.classList.remove('pending');
    btn.removeAttribute('id');

    if (result.success) {
      var lastResult = result.results[result.results.length - 1];
      var ethReceived = lastResult.ethReceived || 0;
      btn.textContent = 'ALL STEPS OK';
      btn.style.background = 'var(--green)';
      btn.style.opacity = '0.35';
      var step2Btn = btn.nextElementSibling;
      if (step2Btn) { step2Btn.textContent = 'Redeem: SIM OK'; step2Btn.style.background = 'var(--green)'; step2Btn.style.opacity = '0.35'; step2Btn.disabled = true; }
      statusEl.innerHTML = '<div class="claim-recovered"><div class="claim-recovered-label" style="color:var(--green)">Bundle Simulation Passed</div><div style="font-size:11px;color:var(--text2);margin-top:4px">' + esc(steps) + '</div>' + (ethReceived > 0 ? '<div class="claim-recovered-amount">' + fmtEth(ethReceived) + ' ETH</div>' : '') + '</div>';
    } else {
      var failedStep = (result.results || []).find(function(r) { return !r.success; });
      var isRepayFail = failedStep && failedStep.label.startsWith('repay ');
      btn.textContent = isRepayFail ? 'REPAY NEEDS TOKEN' : 'SIM FAIL';
      btn.style.background = isRepayFail ? '#facc15' : '#ef4444';
      btn.style.opacity = '0.5';
      if (isRepayFail && !isEthDebt) {
        statusEl.innerHTML = '<div style="font-size:11px"><span style="color:#facc15">[TEST] ' + esc(steps) + '</span><br><span style="color:var(--text2)">Address doesn\'t hold ' + esc(tokenSymbol) + '. User must hold the repay token. Redeem untestable until debt is cleared.</span></div>';
      } else {
        statusEl.innerHTML = '<span style="color:#ef4444">[TEST] ' + esc(steps || result.error || 'Unknown error') + '</span>';
      }
    }
    return;
  }

  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }
  if (!walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }

  btn.disabled = true;
  btn.classList.add('pending');

  try {
    const lp = new ethers.Contract(
      cfg.aaveV1Repay.lendingPool,
      ['function repay(address reserve, uint256 amount, address onBehalfOf) payable'],
      walletSigner
    );

    if (isEthDebt) {
      // ETH debt: send ETH with the repay call (add 1% buffer for accrued interest)
      btn.textContent = 'Repaying ETH debt...';
      const repayValue = debtInfo.amount * 101n / 100n;
      const tx = await lp.repay(cfg.aaveV1Repay.ethSentinel, ethers.MaxUint256, walletAddress, { value: repayValue });
      statusEl.textContent = 'Waiting for confirmation...';
      await tx.wait();
    } else {
      // ERC20 debt: repay (approve already done in Step 1)
      btn.textContent = 'Repaying ' + tokenSymbol + '...';
      const tx = await lp.repay(debtInfo.addr, ethers.MaxUint256, walletAddress);
      statusEl.textContent = 'Waiting for confirmation...';
      await tx.wait();
    }

    // Check if more debts remain
    delete debtState.debts[tokenSymbol];
    const remaining = Object.entries(debtState.debts);

    if (remaining.length > 0) {
      // More debts to repay before redeem
      const [nextSym, nextDebt] = remaining[0];
      const fmtAmt = parseFloat(ethers.formatUnits(nextDebt.amount, nextDebt.decimals)).toFixed(4);
      btn.textContent = 'Repaid ' + tokenSymbol;
      btn.classList.remove('pending');
      btn.disabled = true;
      btn.style.opacity = '0.35';
      btn.removeAttribute('id');
      const step2Btn = btn.nextElementSibling;
      if (step2Btn) {
        step2Btn.disabled = false;
        step2Btn.style.opacity = '1';
        step2Btn.id = 'claimBtn-' + key;
        step2Btn.dataset.action = 'aave-repay';
        step2Btn.dataset.key = key;
        step2Btn.dataset.token = nextSym;
        step2Btn.textContent = 'Next: Repay ' + fmtAmt + ' ' + nextSym;
      }
      statusEl.innerHTML = `<span style="color:#facc15">${esc(tokenSymbol)} repaid. ${remaining.length} debt(s) remaining.</span>`;
    } else {
      // All debt cleared — enable redeem
      const repayStepNum = isEthDebt ? '1' : '2';
      const redeemStepNum = isEthDebt ? '2' : '3';
      btn.textContent = 'Step ' + repayStepNum + ': Repaid';
      btn.classList.remove('pending');
      btn.disabled = true;
      btn.style.opacity = '0.35';
      const redeemBtn = btn.nextElementSibling;
      if (redeemBtn) {
        redeemBtn.disabled = false;
        redeemBtn.style.opacity = '1';
        redeemBtn.id = 'claimBtn-' + key;
        redeemBtn.dataset.action = 'claim-eth';
        redeemBtn.dataset.key = key;
        redeemBtn.textContent = 'Step ' + redeemStepNum + ': Redeem aETH';
      }
      statusEl.textContent = 'Debt repaid. Click Step ' + redeemStepNum + ' to redeem aETH for ETH.';
      window._aaveV1DebtState[key] = { hasDebt: false };
    }

    window.va?.track?.('aave_repay_confirmed', { exchange: cfg.name, token: tokenSymbol });

  } catch (e) {
    btn.disabled = false;
    btn.textContent = isEthDebt ? 'Step 1: Repay ETH' : 'Step 2: Repay';
    btn.classList.remove('pending');
    const errMsg = (e.shortMessage || e.reason || e.message || '').toLowerCase();
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      statusEl.textContent = 'Rejected';
    } else if (e.code === 'INSUFFICIENT_FUNDS' || errMsg.includes('insufficient funds')) {
      const needed = isEthDebt ? ethers.formatEther(debtInfo.amount * 101n / 100n) : ethers.formatUnits(debtInfo.amount, debtInfo.decimals);
      statusEl.textContent = 'Insufficient funds. Need ~' + parseFloat(needed).toFixed(6) + (isEthDebt ? ' ETH' : ' ' + tokenSymbol) + ' to repay debt + gas.';
    } else {
      console.error('Aave repay error:', e.message);
      statusEl.textContent = 'Repay failed: ' + (e.shortMessage || e.reason || e.message || 'Unknown error').slice(0, 150);
    }
  }
}

// ─── PoWH3D Exit (sell tokens + withdraw) ───

async function claimExit(key) {
  const cfg = EXCHANGES[key];
  if (!cfg.exitAbi) return;
  const btn = document.getElementById('exitBtn-' + key);
  const statusEl = document.getElementById('claimStatus-' + key);
  if (btn.disabled) return;
  btn.disabled = true;

  if (!await checkNetwork()) {
    showInlineError('networkWarn', 'Please switch to Ethereum Mainnet to claim your ETH.', 0); document.getElementById('networkWarn').classList.add('visible');
    btn.disabled = false;
    return;
  }
  btn.textContent = 'Confirming...';
  statusEl.textContent = 'This will sell all your tokens (10% fee) and withdraw everything. Confirm in wallet...';

  try {
    const contract = new ethers.Contract(cfg.contract, [cfg.exitAbi], walletSigner);
    const tx = await contract[cfg.exitCall](...cfg.exitArgs());

    btn.textContent = 'Pending...';
    statusEl.innerHTML = `Tx submitted: <a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">${tx.hash.slice(0, 18)}...</a>`;

    window.va?.track?.('exit_submitted', { exchange: cfg.name, tx_hash: tx.hash });

    const receipt = await tx.wait();
    logEvent('claim_confirmed', { address: walletAddress, contract: key, amount_eth: parseFloat(ethers.formatEther(userBalances[key] || 0n)), tx_hash: tx.hash, block_num: receipt.blockNumber });
    btn.textContent = 'Exited';
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    statusEl.innerHTML = `<div class="claim-recovered">
        <div class="claim-recovered-label">Exited</div>
        <div class="claim-recovered-tx"><a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div>
      </div>`;
    userBalances[key] = 0n;
    // Disable the withdraw button too
    const wBtn = document.getElementById('claimBtn-' + key);
    if (wBtn) { wBtn.disabled = true; wBtn.textContent = 'Exited'; }
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Exit (sell + withdraw)';
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      statusEl.textContent = 'Rejected';
    } else {
      console.error('Exit error:', e);
      statusEl.textContent = 'Failed. Try again.';
    }
  }
}

// ─── Bounties Network: killBounty per bounty ID ───

// ─── Kyber FeeHandler: claim single epoch ───

async function kyberClaimEpoch(key, epoch, btn) {
  if (!walletAddress || !walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }
  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }

  var cfg = EXCHANGES[key];
  var statusEl = document.getElementById('claimStatus-' + key);
  btn.disabled = true;
  btn.textContent = 'Claiming...';
  btn.classList.add('pending');

  try {
    var contract = new ethers.Contract(cfg.contract, ['function claimStakerReward(address staker, uint256 epoch) returns (uint256)'], walletSigner);
    logEvent('claim_started', { address: walletAddress, contract: key });
    var tx = await contract.claimStakerReward(walletAddress, epoch);
    if (statusEl) statusEl.textContent = 'Tx submitted, waiting for confirmation...';
    var receipt = await tx.wait();
    btn.textContent = 'Done';
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    logEvent('claim_confirmed', { address: walletAddress, contract: key, amount_eth: parseFloat(ethers.formatEther(userBalances[key] || 0n)), tx_hash: tx.hash, block_num: receipt.blockNumber });
    if (statusEl) statusEl.textContent = 'Epoch ' + epoch + ' claimed!';
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Claim';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      if (statusEl) statusEl.textContent = 'Rejected';
    } else {
      if (statusEl) statusEl.textContent = 'Failed: ' + (e.reason || e.message || 'unknown').slice(0, 80);
    }
  }
}

// ─── Test Mode Simulation Helper ───
// Encodes calldata, calls /api/simulate, updates button state

async function _testSimulateBtn(btn, statusKey, fromAddr, toAddr, iface, funcName, args, successMsg, originalLabel, expectedEth, recipient) {
  var statusEl = document.getElementById('claimStatus-' + statusKey);
  btn.disabled = true;
  btn.textContent = 'Simulating...';
  btn.classList.add('pending');
  if (statusEl) statusEl.textContent = 'Simulating as ' + fromAddr.slice(0, 10) + '...';

  try {
    var calldata = iface.encodeFunctionData(funcName, args);
    var result = await testSimulateTx(fromAddr, toAddr, calldata, expectedEth, recipient);
    if (result.success) {
      btn.textContent = result.balanceVerified === false ? 'SIM WARN' : 'SIM OK';
      btn.classList.remove('pending');
      btn.style.background = result.balanceVerified === false ? '#f59e0b' : 'var(--green)';
      btn.style.opacity = '0.7';
      if (statusEl) statusEl.innerHTML = _fmtSimResult(result, successMsg) + '<div style="font-size:10px;color:#d946ef;margin-top:2px">[TEST MODE]</div>';
      var simEth = result.ethReceived || expectedEth || 0;
      if (simEth >= 0.1) showDonationModal(simEth);
    } else {
      btn.textContent = 'SIM FAIL';
      btn.classList.remove('pending');
      btn.style.background = '#ef4444';
      btn.style.opacity = '0.7';
      if (statusEl) statusEl.innerHTML = _fmtSimResult(result, '') + '<div style="font-size:10px;color:#d946ef;margin-top:2px">[TEST MODE]</div>';
    }
  } catch (e) {
    btn.disabled = false;
    btn.textContent = originalLabel;
    btn.classList.remove('pending');
    if (statusEl) statusEl.textContent = 'Error: ' + (e.message || 'Unknown');
  }
}

// ─── Augur v1 Withdrawal Functions ───

async function augurWithdrawMailbox(key, mailboxAddr, btn) {
  // Test mode: simulate via Tenderly
  if (TEST_MODE && _testImpersonateAddr) {
    var iface = new ethers.Interface(['function withdrawEther() returns (bool)']);
    // Get expected ETH from the button's parent row
    var expectedEth = parseFloat(btn.closest('div')?.querySelector('span span')?.textContent?.match(/([\d.]+)\s*ETH/)?.[1] || '0');
    await _testSimulateBtn(btn, key, _testImpersonateAddr, mailboxAddr, iface, 'withdrawEther', [], 'withdrawEther() would succeed.', 'Withdraw', expectedEth, _testImpersonateAddr);
    return;
  }

  if (!walletAddress || !walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }
  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }

  btn.disabled = true;
  btn.textContent = 'Withdrawing...';
  btn.classList.add('pending');
  var statusEl = document.getElementById('claimStatus-' + key);

  try {
    var contract = new ethers.Contract(mailboxAddr, ['function withdrawEther() returns (bool)'], walletSigner);
    logEvent('claim_started', { address: walletAddress, contract: key, extra: JSON.stringify({ type: 'mailbox', mailbox: mailboxAddr }) });
    var tx = await contract.withdrawEther();
    btn.textContent = 'Pending...';
    if (statusEl) statusEl.textContent = 'Tx submitted: ' + tx.hash.slice(0, 22) + '...';
    var receipt = await tx.wait();
    btn.textContent = 'Done';
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    btn.disabled = true;
    logEvent('claim_confirmed', { address: walletAddress, contract: key, amount_eth: parseFloat(ethers.formatEther(userBalances[key] || 0n)), tx_hash: tx.hash, block_num: receipt.blockNumber });
    if (statusEl) statusEl.textContent = 'Mailbox fees withdrawn to your wallet.';
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Withdraw';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      if (statusEl) statusEl.textContent = 'Rejected';
    } else {
      if (statusEl) statusEl.textContent = 'Failed: ' + (e.reason || e.message || 'Unknown error');
    }
  }
}

async function augurCancelOrder(key, orderId, btn) {
  // Test mode: simulate via Tenderly
  if (TEST_MODE && _testImpersonateAddr) {
    var cfg = EXCHANGES[key];
    var iface = new ethers.Interface(['function cancelOrder(bytes32 _orderId) returns (bool)']);
    var expectedEth = parseFloat(btn.closest('div')?.querySelector('span span')?.textContent?.match(/([\d.]+)\s*ETH/)?.[1] || '0');
    await _testSimulateBtn(btn, key, _testImpersonateAddr, cfg.augurContracts.cancelOrder, iface, 'cancelOrder', [orderId], 'cancelOrder() would succeed.', 'Cancel Order', expectedEth, _testImpersonateAddr);
    return;
  }

  if (!walletAddress || !walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }
  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }

  btn.disabled = true;
  btn.textContent = 'Cancelling...';
  btn.classList.add('pending');
  var statusEl = document.getElementById('claimStatus-' + key);

  try {
    var cfg = EXCHANGES[key];
    var contract = new ethers.Contract(cfg.augurContracts.cancelOrder, ['function cancelOrder(bytes32 _orderId) returns (bool)'], walletSigner);
    logEvent('claim_started', { address: walletAddress, contract: key, extra: JSON.stringify({ type: 'order', order_id: orderId }) });
    var tx = await contract.cancelOrder(orderId);
    btn.textContent = 'Pending...';
    if (statusEl) statusEl.textContent = 'Tx submitted: ' + tx.hash.slice(0, 22) + '...';
    var receipt = await tx.wait();
    btn.textContent = 'Done';
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    btn.disabled = true;
    logEvent('claim_confirmed', { address: walletAddress, contract: key, amount_eth: parseFloat(ethers.formatEther(userBalances[key] || 0n)), tx_hash: tx.hash, block_num: receipt.blockNumber });
    if (statusEl) statusEl.textContent = 'Order cancelled. Escrowed ETH returned to your wallet.';
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Cancel Order';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      if (statusEl) statusEl.textContent = 'Rejected';
    } else {
      if (statusEl) statusEl.textContent = 'Failed: ' + (e.reason || e.message || 'Unknown error');
    }
  }
}

async function augurClaimShares(key, marketAddr, btn) {
  // Test mode: simulate via Tenderly
  if (TEST_MODE && _testImpersonateAddr) {
    var cfg = EXCHANGES[key];
    var iface = new ethers.Interface(['function claimTradingProceeds(address _market, address _shareHolder) returns (bool)']);
    // Share claims don't have per-market ETH in the data, skip balance verification
    await _testSimulateBtn(btn, key, _testImpersonateAddr, cfg.augurContracts.claimTradingProceeds, iface, 'claimTradingProceeds', [marketAddr, _testImpersonateAddr], 'claimTradingProceeds() would succeed.', 'Claim', undefined, _testImpersonateAddr);
    return;
  }

  if (!walletAddress || !walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }
  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }

  btn.disabled = true;
  btn.textContent = 'Claiming...';
  btn.classList.add('pending');
  var statusEl = document.getElementById('claimStatus-' + key);

  try {
    var cfg = EXCHANGES[key];
    var contract = new ethers.Contract(cfg.augurContracts.claimTradingProceeds, ['function claimTradingProceeds(address _market, address _shareHolder) returns (bool)'], walletSigner);
    logEvent('claim_started', { address: walletAddress, contract: key, extra: JSON.stringify({ type: 'shares', market: marketAddr }) });
    var tx = await contract.claimTradingProceeds(marketAddr, walletAddress);
    btn.textContent = 'Pending...';
    if (statusEl) statusEl.textContent = 'Tx submitted: ' + tx.hash.slice(0, 22) + '...';
    var receipt = await tx.wait();
    btn.textContent = 'Done';
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    btn.disabled = true;
    logEvent('claim_confirmed', { address: walletAddress, contract: key, amount_eth: parseFloat(ethers.formatEther(userBalances[key] || 0n)), tx_hash: tx.hash, block_num: receipt.blockNumber });
    if (statusEl) statusEl.textContent = 'Shares claimed. Proceeds sent to your wallet.';
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Claim';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      if (statusEl) statusEl.textContent = 'Rejected';
    } else {
      if (statusEl) statusEl.textContent = 'Failed: ' + (e.reason || e.message || 'Unknown error');
    }
  }
}

async function killBounty(key, bountyId, btn) {
  if (!walletAddress || !walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }
  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }

  btn.disabled = true;
  btn.textContent = 'Withdrawing...';
  btn.classList.add('pending');
  var statusEl = document.getElementById('claimStatus-' + key);

  try {
    var contract = new ethers.Contract(EXCHANGES[key].contract, ['function killBounty(uint256 _bountyId)'], walletSigner);
    logEvent('claim_started', { address: walletAddress, contract: key });
    var tx = await contract.killBounty(bountyId);
    btn.textContent = 'Pending...';
    if (statusEl) statusEl.textContent = 'Tx submitted: ' + tx.hash.slice(0, 22) + '...';
    var receipt = await tx.wait();
    btn.textContent = 'Done';
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    logEvent('claim_confirmed', { address: walletAddress, contract: key, amount_eth: parseFloat(ethers.formatEther(userBalances[key] || 0n)), tx_hash: tx.hash, block_num: receipt.blockNumber });
    if (statusEl) statusEl.textContent = 'Bounty #' + bountyId + ' withdrawn. ETH returned to your wallet.';
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Withdraw';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      if (statusEl) statusEl.textContent = 'Rejected';
    } else {
      if (statusEl) statusEl.textContent = 'Failed: ' + (e.reason || e.message || 'Unknown error');
    }
  }
}

// ─── Mesa / Gnosis Protocol v1: 2-step requestWithdraw + withdraw ───
//
// Step 1: requestWithdraw(WETH, amount) — registers a withdraw request at the
//         CURRENT batch. Mesa's BATCH_TIME is 300 seconds (5 minutes).
// Step 2: withdraw(user, WETH) — finalizes. Requires `pendingWithdraws.batchId
//         < getCurrentBatchId()`, i.e. the chain must have ticked past the
//         batch where the request was registered. This is anywhere from ~1s
//         to 300s depending on where in the batch window Step 1 landed.
//
// Rather than waiting a fixed 5 min, we poll getCurrentBatchId() every 5s
// and enable Step 2 as soon as the chain ticks over. On average this saves
// ~2.5 minutes of wait vs a fixed countdown.

const MESA_WETH_ADDR = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const MESA_READ_ABI = [
  'function requestWithdraw(address token, uint256 amount)',
  'function withdraw(address user, address token)',
  'function getCurrentBatchId() view returns (uint32)',
  'function getPendingWithdraw(address user, address token) view returns (uint256 amount, uint32 batchId)',
];

// Track per-tab Mesa polling so we don't double-start
const _mesaPollState = {};

async function mesaRequestWithdraw(key, btn) {
  if (!walletAddress || !walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }
  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }

  btn.disabled = true;
  btn.textContent = 'Requesting...';
  btn.classList.add('pending');
  var statusEl = document.getElementById('claimStatus-' + key);
  var step2Btn = document.getElementById('mesaWithdrawBtn-' + key);

  try {
    var bal = userBalances[key] || 0n;
    if (bal === 0n) {
      throw new Error('No claimable balance');
    }
    var contract = new ethers.Contract(EXCHANGES[key].contract, MESA_READ_ABI, walletSigner);
    logEvent('claim_started', { address: walletAddress, contract: key });
    var tx = await contract.requestWithdraw(MESA_WETH_ADDR, bal);
    btn.textContent = 'Pending...';
    if (statusEl) statusEl.textContent = 'Tx submitted: ' + tx.hash.slice(0, 22) + '...';
    await tx.wait();
    btn.textContent = 'Requested';
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    if (statusEl) statusEl.textContent = 'Withdraw requested. Waiting for the next batch tick...';

    // Start polling for the batch tick
    mesaStartPolling(key, step2Btn, statusEl);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Step 1: Request withdraw';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      if (statusEl) statusEl.textContent = 'Rejected';
    } else {
      if (statusEl) statusEl.textContent = 'Failed: ' + (e.reason || e.message || 'Unknown error');
    }
  }
}

// Poll getCurrentBatchId every 5s; enable Step 2 when it ticks past the
// request's registered batch. Idempotent — safe to call multiple times.
async function mesaStartPolling(key, step2Btn, statusEl) {
  if (_mesaPollState[key]) return; // already polling
  _mesaPollState[key] = true;

  var readProvider = walletProvider;
  if (!readProvider) {
    // Fallback: user disconnected. Use a public RPC.
    readProvider = new ethers.JsonRpcProvider('https://ethereum.publicnode.com');
  }
  var readContract = new ethers.Contract(EXCHANGES[key].contract, MESA_READ_ABI, readProvider);

  var registeredBatchId;
  try {
    var pending = await readContract.getPendingWithdraw(walletAddress, MESA_WETH_ADDR);
    registeredBatchId = BigInt(pending[1]);
    if (pending[0] === 0n) {
      // No pending request — user probably refreshed. Exit silently.
      _mesaPollState[key] = false;
      return;
    }
  } catch (e) {
    // Read failed — fall back to fixed 5-min timer
    registeredBatchId = null;
  }

  // Check every 5s; show countdown relative to batch boundary
  var pollMs = 5000;
  var startMs = Date.now();
  var maxWaitMs = 330 * 1000; // safety cap: batches are 300s, +30s slack

  async function tick() {
    if (!_mesaPollState[key]) return;
    var elapsed = Date.now() - startMs;

    try {
      var currentBatchId = BigInt(await readContract.getCurrentBatchId());
      if (registeredBatchId !== null && currentBatchId > registeredBatchId) {
        if (step2Btn) {
          step2Btn.disabled = false;
          step2Btn.style.opacity = '1';
          step2Btn.textContent = 'Step 2: Withdraw';
        }
        if (statusEl) statusEl.textContent = 'Ready. Click Step 2 to finalize.';
        _mesaPollState[key] = false;
        return;
      }
    } catch (e) {
      // swallow transient read errors; keep polling
    }

    // Show estimated time remaining (worst case: full batch = 300s)
    var approxRemaining = Math.max(0, Math.ceil((maxWaitMs - elapsed) / 1000));
    if (step2Btn) {
      step2Btn.textContent = 'Step 2: Withdraw (checking... ~' + approxRemaining + 's left)';
    }

    if (elapsed >= maxWaitMs) {
      // Safety: enable the button anyway. The contract will revert if not
      // matured, and the user can re-try.
      if (step2Btn) {
        step2Btn.disabled = false;
        step2Btn.style.opacity = '1';
        step2Btn.textContent = 'Step 2: Withdraw';
      }
      if (statusEl) statusEl.textContent = 'Batch should be ready. Click Step 2 — will retry if not matured.';
      _mesaPollState[key] = false;
      return;
    }

    setTimeout(tick, pollMs);
  }
  tick();
}

// Tab-open check: if the user already has a matured pending withdraw request
// (e.g. they closed the tab after Step 1 and came back later), enable Step 2
// immediately. Called from the balance check flow when the mesa card renders.
async function mesaCheckPendingOnLoad(key) {
  if (!walletAddress || !walletProvider) return;
  try {
    var readContract = new ethers.Contract(EXCHANGES[key].contract, MESA_READ_ABI, walletProvider);
    var pending = await readContract.getPendingWithdraw(walletAddress, MESA_WETH_ADDR);
    var pendingAmount = BigInt(pending[0]);
    if (pendingAmount === 0n) return; // no pending request
    var registeredBatchId = BigInt(pending[1]);
    var currentBatchId = BigInt(await readContract.getCurrentBatchId());
    var step1Btn = document.getElementById('mesaReqBtn-' + key);
    var step2Btn = document.getElementById('mesaWithdrawBtn-' + key);
    var statusEl = document.getElementById('claimStatus-' + key);
    if (currentBatchId > registeredBatchId) {
      // Already matured — enable Step 2, disable Step 1
      if (step2Btn) {
        step2Btn.disabled = false;
        step2Btn.style.opacity = '1';
        step2Btn.textContent = 'Step 2: Withdraw';
      }
      if (step1Btn) {
        step1Btn.textContent = 'Already requested';
        step1Btn.disabled = true;
        step1Btn.style.opacity = '0.5';
      }
      if (statusEl) statusEl.textContent = 'Pending request detected — ready to finalize.';
    } else {
      // Still waiting for tick — start polling
      if (step1Btn) {
        step1Btn.textContent = 'Requested';
        step1Btn.disabled = true;
        step1Btn.style.background = 'var(--green)';
        step1Btn.style.opacity = '0.7';
      }
      if (statusEl) statusEl.textContent = 'Pending request detected — waiting for batch tick...';
      mesaStartPolling(key, step2Btn, statusEl);
    }
  } catch (e) {
    // silent — if the read fails, leave the default UI state
  }
}

async function mesaWithdraw(key, btn) {
  if (!walletAddress || !walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }
  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }

  btn.disabled = true;
  btn.textContent = 'Withdrawing...';
  btn.classList.add('pending');
  var statusEl = document.getElementById('claimStatus-' + key);

  try {
    var contract = new ethers.Contract(EXCHANGES[key].contract, ['function withdraw(address user, address token)'], walletSigner);
    var tx = await contract.withdraw(walletAddress, MESA_WETH_ADDR);
    btn.textContent = 'Pending...';
    if (statusEl) statusEl.textContent = 'Tx submitted: ' + tx.hash.slice(0, 22) + '...';
    var receipt = await tx.wait();
    btn.textContent = 'Done';
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    logEvent('claim_confirmed', { address: walletAddress, contract: key, amount_eth: parseFloat(ethers.formatEther(userBalances[key] || 0n)), tx_hash: tx.hash, block_num: receipt.blockNumber });
    if (statusEl) statusEl.textContent = 'WETH transferred to your wallet.';
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Step 2: Withdraw';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      if (statusEl) statusEl.textContent = 'Rejected';
    } else if (e.message && e.message.indexOf('not registered') !== -1) {
      if (statusEl) statusEl.textContent = 'Withdraw not yet matured. Wait one more batch.';
    } else {
      if (statusEl) statusEl.textContent = 'Failed: ' + (e.reason || e.message || 'Unknown error');
    }
  }
}

// ─── Hegic V1 Call: per-tranche withdrawWithoutHedge ───

async function hegicWithdrawTranche(key, trancheId, btn) {
  if (!walletAddress || !walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }
  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }

  btn.disabled = true;
  btn.textContent = 'Withdrawing...';
  btn.classList.add('pending');
  var statusEl = document.getElementById('claimStatus-' + key);

  try {
    var contract = new ethers.Contract(EXCHANGES[key].contract, ['function withdrawWithoutHedge(uint256 trancheID) returns (uint256)'], walletSigner);
    logEvent('claim_started', { address: walletAddress, contract: key });
    var tx = await contract.withdrawWithoutHedge(trancheId);
    btn.textContent = 'Pending...';
    if (statusEl) statusEl.textContent = 'Tx submitted: ' + tx.hash.slice(0, 22) + '...';
    var receipt = await tx.wait();
    btn.textContent = 'Done';
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    logEvent('claim_confirmed', { address: walletAddress, contract: key, amount_eth: parseFloat(ethers.formatEther(userBalances[key] || 0n)), tx_hash: tx.hash, block_num: receipt.blockNumber });
    if (statusEl) statusEl.textContent = 'Tranche #' + trancheId + ' withdrawn. WETH returned to your wallet.';
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Withdraw';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      if (statusEl) statusEl.textContent = 'Rejected';
    } else {
      if (statusEl) statusEl.textContent = 'Failed: ' + (e.reason || e.message || 'Unknown error');
    }
  }
}

// ─── KeeperDAO / Rook: per-kToken 2-step (approve kToken to LP, then LP.withdraw) ───
//
// Users hold kETH and/or kwETH. Each item in apiBalances[key].keeperdao_items
// gets its own Step 1 + Step 2 button row. Both buttons are rendered upfront —
// Step 2 starts disabled and is enabled via `.disabled = false` after Step 1
// succeeds. No innerHTML rewriting, no element replacement.
//
// Step 1: kToken.approve(poolAddress, kAmount)  — so LP.burnFrom() is allowed
// Step 2: pool.withdraw(user, kToken, kAmount)  — burns kToken, transfers underlying

window._keeperdaoState = window._keeperdaoState || {};

async function keeperdaoApprove(key, itemIdx) {
  if (!walletAddress || !walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }
  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }

  const cfg = EXCHANGES[key];
  const items = (window._lastApiBalances && window._lastApiBalances[key] && window._lastApiBalances[key].keeperdao_items) || [];
  const it = items[itemIdx];
  if (!it) return;
  const itemKey = key + '-' + it.k_token + '-' + itemIdx;
  const btn = document.getElementById('approveBtn-' + itemKey);
  const wBtn = document.getElementById('withdrawBtn-' + itemKey);
  const statusEl = document.getElementById('kdStatus-' + itemKey);
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = 'Approving...';
  btn.classList.add('pending');

  try {
    const kToken = new ethers.Contract(it.k_address, ['function approve(address,uint256) returns (bool)'], walletSigner);
    const tx = await kToken.approve(cfg.contract, it.k_amount_wei);
    btn.textContent = 'Pending...';
    if (statusEl) statusEl.textContent = 'Approve tx: ' + tx.hash.slice(0, 22) + '...';
    await tx.wait();
    btn.textContent = 'Step 1: Approved';
    btn.classList.remove('pending');
    btn.style.opacity = '0.35';
    window._keeperdaoState[itemKey] = 'needs-withdraw';
    // Enable Step 2 button in place (it was rendered disabled upfront).
    if (wBtn) { wBtn.disabled = false; wBtn.style.opacity = ''; }
    if (statusEl) statusEl.textContent = 'Approved. Click Step 2 to withdraw.';
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Step 1: Approve ' + it.k_token;
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      if (statusEl) statusEl.textContent = 'Rejected';
    } else {
      if (statusEl) statusEl.textContent = 'Failed: ' + (e.reason || e.message || 'Unknown error');
    }
  }
}

async function keeperdaoWithdraw(key, itemIdx) {
  if (!walletAddress || !walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }
  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }

  const cfg = EXCHANGES[key];
  const items = (window._lastApiBalances && window._lastApiBalances[key] && window._lastApiBalances[key].keeperdao_items) || [];
  const it = items[itemIdx];
  if (!it) return;
  const itemKey = key + '-' + it.k_token + '-' + itemIdx;
  const btn = document.getElementById('withdrawBtn-' + itemKey);
  const statusEl = document.getElementById('kdStatus-' + itemKey);
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = 'Withdrawing...';
  btn.classList.add('pending');

  try {
    const pool = new ethers.Contract(cfg.contract, ['function withdraw(address _to, address _kToken, uint256 _kTokenAmount)'], walletSigner);
    logEvent('claim_started', { address: walletAddress, contract: key, extra: { item: it.k_token } });
    const tx = await pool.withdraw(walletAddress, it.k_address, it.k_amount_wei);
    btn.textContent = 'Pending...';
    if (statusEl) statusEl.textContent = 'Withdraw tx: ' + tx.hash.slice(0, 22) + '...';
    const receipt = await tx.wait();
    btn.textContent = 'Done';
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    window._keeperdaoState[itemKey] = 'done';
    logEvent('claim_confirmed', {
      address: walletAddress,
      contract: key,
      amount_eth: parseFloat(it.eth_eq || 0),
      tx_hash: tx.hash,
      block_num: receipt.blockNumber,
      extra: { item: it.k_token, underlying: it.underlying },
    });
    if (statusEl) statusEl.textContent = fmtEth(it.eth_eq) + ' ' + it.underlying + ' withdrawn to your wallet.';
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Step 2: Withdraw ' + it.underlying;
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      if (statusEl) statusEl.textContent = 'Rejected';
    } else {
      if (statusEl) statusEl.textContent = 'Failed: ' + (e.reason || e.message || 'Unknown error');
    }
  }
}

// ─── MoonCat Adoption Request Cancellation ───

async function cancelMoonCatRequest(key, catIdHex, index) {
  const cfg = EXCHANGES[key];
  if (!cfg.cancelAbi) return;
  const btn = document.getElementById(`cancelReqBtn-${key}-${index}`);
  const statusEl = document.getElementById('claimStatus-' + key);
  if (btn.disabled) return;
  btn.disabled = true;

  if (!await checkNetwork()) {
    showInlineError('networkWarn', 'Please switch to Ethereum Mainnet to claim your ETH.', 0); document.getElementById('networkWarn').classList.add('visible');
    btn.disabled = false;
    return;
  }
  btn.textContent = 'Confirming...';
  statusEl.textContent = 'Cancelling adoption request — this sends escrowed ETH directly to your wallet. Confirm in wallet...';

  try {
    const contract = new ethers.Contract(cfg.contract, [cfg.cancelAbi], walletSigner);
    const tx = await contract.cancelAdoptionRequest(catIdHex);

    btn.textContent = 'Pending...';
    statusEl.innerHTML = `Tx submitted: <a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">${tx.hash.slice(0, 18)}...</a>`;

    const receipt = await tx.wait();
    btn.textContent = 'Claimed';
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    statusEl.innerHTML = `<div class="claim-recovered"><div class="claim-recovered-label">Recovered</div><div class="claim-recovered-tx"><a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div></div>`;
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Cancel & Claim';
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      statusEl.textContent = 'Rejected';
    } else {
      console.error('Cancel request error:', e);
      statusEl.textContent = 'Failed. Try again.';
    }
  }
}

// ─── ENS Deed Claiming ───

async function claimENSDeed(index) {
  const deed = window._ensDeeds[index];
  if (!deed) return;
  const btn = document.getElementById('claimBtn-ens-' + index);
  const statusEl = document.getElementById('claimStatus-ens-' + index);
  if (btn.disabled) return;
  btn.disabled = true;
  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet to claim your ETH.', 0); document.getElementById('networkWarn').classList.add('visible'); btn.disabled = false; return; }
  btn.textContent = 'Confirming...';
  btn.classList.add('pending');
  statusEl.textContent = 'Confirm in wallet...';

  try {
    const registrar = new ethers.Contract(ENS_REGISTRAR, ENS_REGISTRAR_ABI, walletSigner);
    const ethAmount = ethers.formatEther(deed.value);
    window.va?.track?.('claim_initiated', { exchange: 'ENS Old Registrar', amount_eth: ethAmount });

    const tx = await registrar.releaseDeed(deed.labelHash);
    btn.textContent = 'Pending...';
    const claimedEthNum = parseFloat(ethAmount);
    statusEl.innerHTML = 'Tx submitted: <a href="' + etherscanTx(tx.hash) + '" target="_blank" rel="noopener noreferrer">' + tx.hash.slice(0, 18) + '...</a>';

    window.va?.track?.('claim_submitted', { exchange: 'ENS Old Registrar', amount_eth: ethAmount, tx_hash: tx.hash });

    const receipt = await tx.wait();
    window.va?.track?.('claim_confirmed', { exchange: 'ENS Old Registrar', amount_eth: ethAmount, tx_hash: tx.hash, block: receipt.blockNumber });
    logEvent('claim_confirmed', { address: walletAddress, contract: 'ens_old', amount_eth: parseFloat(ethAmount), tx_hash: tx.hash, block_num: receipt.blockNumber, extra: { deed_name: deed.name || null, deed_hash: deed.labelHash } });

    btn.textContent = 'Released';
    btn.disabled = true;
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.5';
    btn.style.cursor = 'default';
    const claimUsd = _ethPrice ? ' (' + fmtUsd(claimedEthNum * _ethPrice) + ')' : '';
    statusEl.innerHTML = '<div class="claim-recovered">' +
      '<div class="claim-recovered-label">Released</div>' +
      '<div class="claim-recovered-amount">' + fmtEth(ethAmount) + ' ETH' + claimUsd + '</div>' +
      '<div class="claim-recovered-tx"><a href="' + etherscanTx(tx.hash) + '" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div>' +
    '</div>';
    // Track cumulative ENS claims — show donation modal after last deed or on idle
    window._ensCumulativeEth = (window._ensCumulativeEth || 0) + claimedEthNum;
    var remainingDeeds = document.querySelectorAll('[data-action="claim-ens-deed"]:not([disabled])').length;
    if (remainingDeeds === 0) {
      // All deeds claimed — show full-screen donation modal
      showDonationModal(window._ensCumulativeEth);
    } else {
      // More deeds to go — reset idle timer (shows modal if they stop for 30s)
      resetDonationIdleTimer(window._ensCumulativeEth);
    }
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Release';
    btn.classList.remove('pending');
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      statusEl.textContent = 'Rejected';
    } else {
      console.error('ENS release error:', e);
      statusEl.textContent = 'Failed — may not be deed owner';
    }
  }
}

async function ensManualRelease() {
  const input = document.getElementById('ensManualHash').value.trim();
  if (!input) { showInlineError('addrError', 'Please enter a domain label or labelHash.'); return; }
  if (!walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }
  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet to claim your ETH.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }

  // If input starts with 0x and is 66 chars, treat as labelHash; otherwise hash it
  let labelHash;
  if (/^0x[0-9a-fA-F]{64}$/.test(input)) {
    labelHash = input;
  } else {
    // Remove .eth suffix if present
    const label = input.toLowerCase().replace(/\.eth$/, '');
    labelHash = ethers.id(label);
  }

  // Verify deed exists and has value before sending tx
  const provider = walletProvider || new ethers.JsonRpcProvider(PUBLIC_RPC);
  const registrar = new ethers.Contract(ENS_REGISTRAR, ENS_REGISTRAR_ABI, provider);
  try {
    const entry = await registrar.entries(labelHash);
    const deedAddr = entry[1];
    if (deedAddr === ethers.ZeroAddress) {
      showInlineError('addrError', 'No deed found for this label/hash. It may have already been released.');
      return;
    }
    const deed = new ethers.Contract(deedAddr, ENS_DEED_ABI, provider);
    const deedOwner = await deed.owner();
    if (deedOwner.toLowerCase() !== walletAddress.toLowerCase()) {
      showInlineError('addrError', 'You are not the owner of this deed. Deed owner: ' + deedOwner);
      return;
    }
    var deedValue = await deed.value();
    var deedEth = parseFloat(ethers.formatEther(deedValue));
  } catch (e) {
    console.error('Deed verification failed:', e);
    showInlineError('addrError', 'Deed verification failed — please try again.');
    return;
  }

  try {
    const sRegistrar = new ethers.Contract(ENS_REGISTRAR, ENS_REGISTRAR_ABI, walletSigner);
    logEvent('claim_started', { address: walletAddress, contract: 'ens_old' });
    const tx = await sRegistrar.releaseDeed(labelHash);
    window.va?.track?.('claim_submitted', { exchange: 'ENS Old Registrar', tx_hash: tx.hash });
    showInlineError('addrError', 'Transaction submitted: ' + tx.hash.slice(0, 22) + '... Waiting for confirmation...');
    var _addrEl = document.getElementById('addrError'); if (_addrEl) _addrEl.style.color = 'var(--text2)';
    var receipt = await tx.wait();
    var deedName = /^0x/.test(input) ? null : input.toLowerCase().replace(/\.eth$/, '');
    logEvent('claim_confirmed', { address: walletAddress, contract: 'ens_old', amount_eth: deedEth, tx_hash: tx.hash, block_num: receipt.blockNumber, extra: { deed_name: deedName, deed_hash: labelHash } });
    if (_addrEl) { _addrEl.textContent = 'Deed released successfully! ETH has been returned to your wallet.'; _addrEl.style.color = 'var(--green)'; }
    setTimeout(function() { if (_addrEl) { _addrEl.style.display = 'none'; _addrEl.style.color = 'var(--red)'; } }, 10000);
  } catch (e) {
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      showInlineError('addrError', 'Transaction rejected.');
    } else {
      showInlineError('addrError', 'Release failed: ' + (e.reason || e.message || 'Unknown error'));
    }
  }
}

// Listen for account/chain changes
function _onAccountsChanged(accounts) {
  (async () => {
    if (accounts.length === 0) {
      walletAddress = null;
      walletSigner = null;
      walletProvider = null;
      document.getElementById('walletBtn').textContent = 'Connect Wallet';
      document.getElementById('walletBtn').classList.remove('connected');
      document.getElementById('walletAddr').textContent = '';
      document.getElementById('claimBanner').classList.remove('visible');
      document.getElementById('connectCta').style.display = '';
    } else if (walletProvider && walletAddress) {
      // Already connected — just update address and re-scan
      // Skip if connected via keystore (JsonRpcProvider doesn't support parameterless getSigner)
      if (!(walletProvider instanceof ethers.BrowserProvider)) return;
      walletSigner = await walletProvider.getSigner();
      walletAddress = await walletSigner.getAddress();
      document.getElementById('walletAddr').textContent = truncAddr(walletAddress);
      scanStart();
      try { await checkUserBalances(); } catch(e) {}
    }
  })();
}
function _onChainChanged() { if (walletAddress) checkNetwork(); }
if (window.ethereum) {
  window.ethereum.on('accountsChanged', _onAccountsChanged);
  window.ethereum.on('chainChanged', _onChainChanged);
}
// EIP-6963 wallets (Rabby, etc.) may use a different provider object than window.ethereum.
// Re-attach listeners to the actual connected provider after each wallet connection.
window._attachEip6963Listeners = function(rawProvider) {
  if (rawProvider && rawProvider !== window.ethereum && rawProvider.on) {
    rawProvider.on('accountsChanged', _onAccountsChanged);
    rawProvider.on('chainChanged', _onChainChanged);
  }
};

// ─── Tab Switching ───

// Mobile select (already populated by generateUI)
const tabSelect = document.getElementById('tabSelect');

function filterTabs(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.tab').forEach(tab => {
    const name = tab.textContent.toLowerCase();
    tab.style.display = !q || name.includes(q) ? '' : 'none';
  });
  // Expand tabs while searching so results are visible
  const tabsEl = document.getElementById('tabs');
  if (q) { tabsEl.style.maxHeight = tabsEl.scrollHeight + 'px'; tabsEl.classList.add('expanded'); }
  else { tabsEl.style.maxHeight = '80px'; tabsEl.classList.remove('expanded'); document.getElementById('tabsToggleBtn').innerHTML = 'More contracts &#x25BE;'; }
}

const loadedTabs = new Set();
function switchTab(tab) {
  const key = tab.dataset.tab;
  document.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); t.setAttribute('tabindex', '-1'); });
  document.querySelectorAll('.tab-panel').forEach(p => { p.classList.remove('active'); });
  tab.classList.add('active');
  tab.setAttribute('aria-selected', 'true');
  tab.setAttribute('tabindex', '0');
  document.getElementById('panel-' + key).classList.add('active');
  tabSelect.value = key;
  // Lazy-load full exchange data on first tab view
  if (!loadedTabs.has(key)) {
    loadedTabs.add(key);
    loadExchange(key);
  }
}
document.getElementById('tabs').addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  switchTab(tab);
});
document.getElementById('tabs').addEventListener('keydown', e => {
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const idx = tabs.indexOf(e.target);
  if (idx < 0) return;
  let next;
  if (e.key === 'ArrowRight') next = tabs[(idx + 1) % tabs.length];
  else if (e.key === 'ArrowLeft') next = tabs[(idx - 1 + tabs.length) % tabs.length];
  else if (e.key === 'Home') next = tabs[0];
  else if (e.key === 'End') next = tabs[tabs.length - 1];
  if (next) { e.preventDefault(); switchTab(next); }
});
tabSelect.addEventListener('change', () => {
  const tab = document.querySelector('.tab[data-tab="' + tabSelect.value + '"]');
  if (tab) switchTab(tab);
});

// ─── Data Loading & Rendering ───

async function fetchTable(key) {
  const s = tabState[key];
  const query = document.getElementById('search-' + key)?.value?.trim() || '';
  const minBal = parseFloat(document.getElementById('minBal-' + key)?.value) || 0;
  const sortDir = s.sortField === 'balance' ? (s.sortAsc ? 'asc' : 'desc') : (s.sortAsc ? 'asc' : 'desc');
  const params = new URLSearchParams({
    exchange: key, page: s.page, pageSize: s.pageSize,
    sort: s.sortField, sortDir,
    ...(query ? { search: query } : {}),
    ...(minBal > 0 ? { minBal } : {}),
  });
  const resp = await fetch('/api/table?' + params);
  if (!resp.ok) throw new Error('API error');
  return resp.json();
}

async function loadExchange(key) {
  const cfg = EXCHANGES[key];
  var retries = 3;
  while (retries > 0) {
    try {
      const result = await fetchTable(key);
      tabState[key].meta = result.meta;
      tabState[key].rows = result.rows;
      tabState[key].pagination = result.pagination;
      break;
    } catch(e) {
      retries--;
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1500));
      } else {
        document.getElementById('loading-' + key).innerHTML =
          `<p style="color:var(--text2)">Could not load data for ${esc(cfg.name)}. <a href="javascript:void(0)" onclick="loadExchange('${key}')" style="color:var(--accent)">Retry</a></p>`;
        return;
      }
    }
  }
  document.getElementById('loading-' + key).style.display = 'none';
  document.getElementById('app-' + key).style.display = '';

  const d = tabState[key].meta;
  const badgeUsd = _ethPrice ? ' (' + fmtUsd(d.total_eth * _ethPrice) + ')' : '';
  document.getElementById('badge-' + key).textContent = fmtEth(d.total_eth) + ' ETH';
  // Contract info — all values from EXCHANGES config (trusted), escaped for safety
  document.getElementById('contract-' + key).innerHTML =
    `<span style="color:var(--text);font-weight:600">Contract</span> <a href="${etherscanAddr(esc(d.contract))}" target="_blank" rel="noopener noreferrer">${esc(d.contract)}</a>` +
    (cfg.deployed ? `<br><span style="color:var(--text);font-weight:600">Deployed</span> ${esc(cfg.deployed)}` : '');

  renderCards(key);
  renderCharts(key);
  renderTable(key);
  setupEvents(key);
}

function renderCards(key) {
  const d = tabState[key].meta;
  const cards = [
    { label: 'Unclaimed ETH', value: fmtEth(d.total_eth), cls: 'eth' },
    { label: 'Addresses', value: fmtNum(d.addresses_with_balance), cls: 'eth' },
  ];
  let cardsHtml = '<div class="cards">' +
    cards.map(c => `<div class="card"><div class="label">${c.label}</div><div class="value ${c.cls}">${c.value}</div></div>`).join('') +
    '</div>';

  document.getElementById('cards-' + key).innerHTML = cardsHtml;

  // Distribution table — rendered after charts (appended to panel)
  let distDiv = document.getElementById('dist-' + key);
  if (!distDiv && d.distribution) {
    const order = ['>=100 ETH', '10-100 ETH', '1-10 ETH', '0.1-1 ETH', '0.01-0.1 ETH', '<0.01 ETH'];
    let rows = '';
    for (const range of order) {
      const b = d.distribution[range];
      if (!b) continue;
      rows += `<tr><td>${esc(range)}</td><td>${fmtNum(b.count)}</td><td>${fmtEth(b.total_eth)} ETH</td></tr>`;
    }
    if (rows) {
      distDiv = document.createElement('div');
      distDiv.id = 'dist-' + key;
      distDiv.innerHTML = `<div class="table-wrap" style="margin-bottom:24px"><table>
        <thead><tr><th>Range</th><th>Addresses</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
      // Insert after charts (or after cards if no charts)
      const chartsEl = document.getElementById('charts-' + key);
      if (chartsEl) chartsEl.after(distDiv);
      else document.getElementById('cards-' + key).after(distDiv);
    }
  }
}

const chartInstances = {};
function renderCharts(key) {
  if (typeof Chart === 'undefined') return; // Chart.js not loaded (ad blocker?)
  const d = tabState[key].meta;
  if (!d) return;
  // Destroy previous chart instances to prevent memory leaks
  if (chartInstances['activity-' + key]) { chartInstances['activity-' + key].destroy(); delete chartInstances['activity-' + key]; }
  if (chartInstances['tvl-' + key]) { chartInstances['tvl-' + key].destroy(); delete chartInstances['tvl-' + key]; }
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? '#2d2a3a' : '#e5e2db';
  const textColor = isDark ? '#7d7890' : '#6b6560';

  const cardsEl = document.getElementById('cards-' + key);
  let chartDiv = document.getElementById('charts-' + key);
  if (!chartDiv) {
    chartDiv = document.createElement('div');
    chartDiv.id = 'charts-' + key;
    chartDiv.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:0 0 16px';
    const hasActivity = d.activity && d.activity.length > 0;
    const hasTvl = d.tvl && d.tvl.length > 0;
    chartDiv.innerHTML =
      '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:12px">' +
        '<h3 style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text2);margin-bottom:8px;font-weight:700">ETH Balance Over Time</h3>' +
        '<div style="height:300px">' +
          (hasTvl ? '<canvas id="chartTvl-' + key + '"></canvas>' : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text2);font-size:12px">No TVL data available</div>') +
        '</div>' +
      '</div>' +
      '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:12px">' +
        '<h3 style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text2);margin-bottom:8px;font-weight:700">Contract Interactions</h3>' +
        '<div style="height:300px">' +
          (hasActivity ? '<canvas id="chartActivity-' + key + '"></canvas>' : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text2);font-size:12px">No activity data available</div>') +
        '</div>' +
      '</div>';
    cardsEl.after(chartDiv);
  }

  // Activity chart - monthly transaction counts (normalized to 2026-03, gaps filled)
  const rawActivity = d.activity;
  if (rawActivity && rawActivity.length > 0) {
    const cfg = EXCHANGES[key];
    // Build full monthly timeline from first data point to 2026-03, fill gaps with 0
    const actMap = {};
    rawActivity.forEach(a => { actMap[a.month] = a.tx_count; });
    const now = new Date(); const endMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const activity = [];
    let [y, m] = [2016, 1];
    while (true) {
      const key2 = y + '-' + String(m).padStart(2, '0');
      activity.push({ month: key2, tx_count: actMap[key2] || 0 });
      if (key2 === endMonth) break;
      m++;
      if (m > 12) { m = 1; y++; }
    }
    chartInstances['activity-' + key] = new Chart(document.getElementById('chartActivity-' + key), {
      type: 'bar',
      data: {
        labels: activity.map(a => a.month),
        datasets: [{
          data: activity.map(a => a.tx_count),
          backgroundColor: '#0f766e80',
          borderColor: '#0f766e',
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ctx.raw.toLocaleString() + ' transactions' } }
        },
        scales: {
          x: {
            ticks: {
              color: textColor,
              font: { size: 11, weight: 'bold' },
              maxRotation: 0,
              callback: function(val, idx) {
                const label = this.getLabelForValue(idx);
                const month = label.slice(5, 7);
                // Show year at January for clean alignment
                if (month === '01') return label.slice(0, 4);
                return '';
              },
              autoSkip: false,
            },
            grid: { display: false }
          },
          y: {
            title: { display: true, text: 'Transactions', color: textColor, font: { size: 11, weight: 'bold' } },
            ticks: { color: textColor, font: { size: 10 } },
            grid: { color: gridColor }
          }
        }
      }
    });
  }

  // TVL chart - ETH balance over time (area chart)
  const tvlData = d.tvl;
  if (tvlData && tvlData.length > 0) {
    // Filter to months with any balance (trim leading zeros)
    const firstNonZero = tvlData.findIndex(t => t.balance_eth > 0);
    const tvl = firstNonZero >= 0 ? tvlData.slice(Math.max(0, firstNonZero - 1)) : tvlData;

    chartInstances['tvl-' + key] = new Chart(document.getElementById('chartTvl-' + key), {
      type: 'bar',
      data: {
        labels: tvl.map(t => t.month),
        datasets: [{
          data: tvl.map(t => t.balance_eth),
          backgroundColor: '#0f766e80',
          borderColor: '#0f766e',
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ctx.raw.toLocaleString(undefined, {maximumFractionDigits: 1}) + ' ETH' } }
        },
        scales: {
          x: {
            ticks: {
              color: textColor,
              font: { size: 11, weight: 'bold' },
              maxRotation: 0,
              callback: function(val, idx) {
                const label = this.getLabelForValue(idx);
                if (label.slice(5, 7) === '01') return label.slice(0, 4);
                return '';
              },
              autoSkip: false,
            },
            grid: { display: false }
          },
          y: {
            title: { display: true, text: 'ETH', color: textColor, font: { size: 11, weight: 'bold' } },
            ticks: {
              color: textColor,
              font: { size: 10 },
              callback: v => v >= 1000 ? (v/1000).toFixed(0) + 'k' : v,
            },
            grid: { color: gridColor }
          }
        }
      }
    });
  }
}

async function applyFilters(key) {
  const s = tabState[key];
  s.page = 0;
  try {
    const result = await fetchTable(key);
    s.rows = result.rows;
    s.pagination = result.pagination;
  } catch (e) { console.error('Filter fetch failed', e); }
  renderTable(key);
}

function renderTable(key) {
  // Address table removed for privacy — users check their own address via the search bar
}


function setupEvents(key) {
  // Address table and controls removed for privacy
}

// Init
// Manual address check (no wallet needed)
async function resolveAddressInput(raw) {
  // Resolve ENS name or return address as-is
  if (isAddr(raw)) return raw;
  if (isENSName(raw)) {
    try {
      const provider = new ethers.JsonRpcProvider(PUBLIC_RPCS[0]);
      const resolved = await provider.resolveName(raw);
      if (resolved) return resolved;
    } catch(e) { console.warn('ENS resolution failed:', e); }
    return null;
  }
  return null;
}

async function checkSingleAddress(addr) {
  // Returns { found, totalEth, html, apiBalances }
  let html = '';
  let found = 0;
  let totalEth = 0;

  let apiBalances = {};
  let apiCoverage = {};
  try {
    const apiResp = await fetchCheck(addr);
    if (apiResp.ok && apiResp.data) {
      apiBalances = apiResp.data.balances || {};
      apiCoverage = apiResp.data.coverage || {};
    }
  } catch (e) { console.warn('API check failed, falling back to RPC', e); }

  const HIGH_COVERAGE_THRESHOLD = 95;
  let provider = null;
  let _manualChecked = 0;
  const _manualTotal = Object.keys(EXCHANGES).length;
  const _manualProgressEl = document.getElementById('scanProgress');
  let _manualDisplayed = 0;
  const _manualProgressInterval = setInterval(function() {
    _manualDisplayed++;
    if (_manualProgressEl) _manualProgressEl.textContent = 'Checking contracts... ' + Math.min(_manualDisplayed, _manualTotal) + '/' + _manualTotal;
    if (_manualDisplayed >= _manualTotal) clearInterval(_manualProgressInterval);
  }, Math.round(2500 / _manualTotal));

  const checks = Object.entries(EXCHANGES).map(async ([key, cfg]) => {
    try {
      const covPct = apiCoverage[key]?.coverage_pct ?? 0;
      const apiEntry = apiBalances[key];
      if (cfg.noWalletCheck) {
        return { key, balance: apiEntry ? BigInt(apiEntry.balance_wei) : 0n };
      }
      if (covPct >= HIGH_COVERAGE_THRESHOLD && !apiEntry) {
        return { key, balance: 0n };
      }
      if (covPct >= HIGH_COVERAGE_THRESHOLD && apiEntry) {
        // API balance_wei is already in ETH terms (transform applied in data pipeline)
        return { key, balance: BigInt(apiEntry.balance_wei) };
      }
      if (!provider) provider = new ethers.JsonRpcProvider(PUBLIC_RPC);
      const balanceAddr = cfg.balanceContract || cfg.contract;
      const contract = new ethers.Contract(balanceAddr, [cfg.balanceAbi], provider);
      const result = await contract[cfg.balanceCall](...cfg.balanceArgs(addr));
      const balance = cfg.balanceTransform ? cfg.balanceTransform(result) : result;
      return { key, balance };
    } catch (e) {
      const apiEntry = apiBalances[key];
      if (apiEntry) return { key, balance: BigInt(apiEntry.balance_wei) };
      return { key, balance: 0n };
    } finally {
      _manualChecked++;
    }
  });

  const results = await Promise.all(checks);
  for (const { key, balance } of results) {
    const cfg = EXCHANGES[key];
    if (balance > 0n) {
      found++;
      const ethAmount = ethers.formatEther(balance);
      totalEth += parseFloat(ethAmount);
      const mLastTx = apiBalances[key]?.last_tx_date || '';
      const mLastTxHtml = mLastTx ? '<span style="font-size:11px;color:var(--text2);margin-left:8px">last tx: ' + esc(mLastTx) + '</span>' : '';
      html += '<div class="claim-card"><div class="claim-card-header"><span class="claim-card-name">' + esc(cfg.name) + mLastTxHtml + '</span><span class="claim-card-amount">' + fmtEth(ethAmount) + ' ETH</span><span class="claim-card-tag">Claimable</span></div>';
      // Kyber: show per-epoch breakdown
      if (cfg.kyberFeeHandler && apiBalances[key]?.epoch_details) {
        var eps = apiBalances[key].epoch_details;
        for (var ei = 0; ei < eps.length; ei++) {
          html += '<div style="margin:4px 16px;border-left:2px solid var(--accent);padding:4px 12px;font-size:13px">Epoch ' + eps[ei].epoch + '<span style="color:var(--text2);font-size:12px"> · ' + fmtEth(eps[ei].eth) + ' ETH</span></div>';
        }
      }
      // Show Augur v1 per-item breakdown (with simulate buttons in test mode)
      if (cfg.augurMulti && apiBalances[key]?.augur_claims) {
        var acs = apiBalances[key].augur_claims;
        var acMailboxes = acs.filter(function(c) { return c.t === 'm'; });
        var acOrders = acs.filter(function(c) { return c.t === 'o'; });
        var acShares = acs.filter(function(c) { return c.t === 's'; });
        if (acMailboxes.length) {
          var mbTotal = acMailboxes.reduce(function(s, m) { return s + m.e; }, 0);
          html += '<div style="margin:8px 16px 2px;font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px">Creator Fees · ' + fmtEth(mbTotal) + ' ETH</div>';
          if (TEST_MODE) html += '<div style="margin:0 16px 2px;font-size:10px;color:var(--text2)">Mailbox.withdrawEther() — owner-only</div>';
          for (var mi = 0; mi < acMailboxes.length; mi++) {
            var mbBtn = TEST_MODE ? '<button class="claim-btn" data-action="augur-mailbox" data-key="' + key + '" data-mailbox="' + acMailboxes[mi].a + '" data-index="' + mi + '">Simulate</button>' : '';
            html += '<div style="margin:3px 16px;border-left:2px solid #553C9A;padding:4px 12px;font-size:12px;display:flex;align-items:center;justify-content:space-between"><span>' + acMailboxes[mi].a.slice(0,10) + '.. <span style="color:var(--text2)">· ' + fmtEth(acMailboxes[mi].e) + ' ETH</span></span>' + mbBtn + '</div>';
          }
        }
        if (acOrders.length) {
          var ordTotal = acOrders.reduce(function(s, o) { return s + o.e; }, 0);
          html += '<div style="margin:8px 16px 2px;font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px">Open Orders · ' + fmtEth(ordTotal) + ' ETH</div>';
          if (TEST_MODE) html += '<div style="margin:0 16px 2px;font-size:10px;color:var(--text2)">CancelOrder.cancelOrder(orderId) — creator-only</div>';
          for (var oi = 0; oi < acOrders.length; oi++) {
            var ordBtn = TEST_MODE ? '<button class="claim-btn" data-action="augur-cancel-order" data-key="' + key + '" data-order-id="' + acOrders[oi].id + '" data-index="' + oi + '">Simulate</button>' : '';
            html += '<div style="margin:3px 16px;border-left:2px solid #553C9A;padding:4px 12px;font-size:12px;display:flex;align-items:center;justify-content:space-between"><span>Order ' + acOrders[oi].id.slice(0,10) + '.. <span style="color:var(--text2)">· ' + fmtEth(acOrders[oi].e) + ' ETH</span></span>' + ordBtn + '</div>';
          }
        }
        if (acShares.length) {
          var shareEthVal = parseFloat(ethAmount) - acMailboxes.reduce(function(s, m) { return s + m.e; }, 0) - acOrders.reduce(function(s, o) { return s + o.e; }, 0);
          html += '<div style="margin:8px 16px 2px;font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px">Winning Shares · ' + fmtEth(Math.max(0, shareEthVal)) + ' ETH</div>';
          if (TEST_MODE) html += '<div style="margin:0 16px 2px;font-size:10px;color:var(--text2)">claimTradingProceeds(market, holder) — permissionless</div>';
          for (var si = 0; si < acShares.length; si++) {
            var shBtn = TEST_MODE ? '<button class="claim-btn" data-action="augur-claim-shares" data-key="' + key + '" data-market="' + acShares[si].m + '" data-index="' + si + '">Simulate</button>' : '';
            html += '<div style="margin:3px 16px;border-left:2px solid #553C9A;padding:4px 12px;font-size:12px;display:flex;align-items:center;justify-content:space-between"><span>Market ' + acShares[si].m.slice(0,10) + '.. <span style="color:var(--text2)">· outcome ' + acShares[si].o + '</span></span>' + shBtn + '</div>';
          }
        }
        if (TEST_MODE) {
          html += '<div class="claim-card-status" id="claimStatus-' + key + '"></div>';
        } else {
          html += '<div style="margin:8px 16px 4px;font-size:12px;color:var(--text2)">Connect this wallet to withdraw.</div>';
        }
      }
      // Show per-bounty breakdown in manual check flow
      if (cfg.bountiesMulti && apiBalances[key]?.bounty_details) {
        var bds = apiBalances[key].bounty_details;
        for (var bi = 0; bi < bds.length; bi++) {
          var bdEth = bds[bi].eth ? ' · ' + fmtEth(bds[bi].eth) + ' ETH' : '';
          html += '<div style="margin:4px 16px;border-left:2px solid var(--accent);padding:4px 12px;font-size:13px">Bounty #' + esc(String(bds[bi].id)) + '<span style="color:var(--text2);font-size:12px">' + bdEth + '</span></div>';
        }
      }
      html += '</div>';
    }
  }

  return { found, totalEth, html, apiBalances };
}

async function checkManualAddress() {
  const rawInput = document.getElementById('manualAddrInput').value.trim();
  if (!rawInput) { showInlineError('addrError', 'Please enter an Ethereum address or ENS name.'); return; }
  if (rawInput.toLowerCase() === ZERO_ADDR) { showInlineError('addrError', 'The zero address has no claimable ETH.'); return; }

  // ── Test Mode: set impersonation address, then run normal check flow ──
  if (TEST_MODE) {
    _testImpersonateAddr = null; // will be set after address resolution
  }

  const banner = document.getElementById('claimBanner');
  const rowsEl = document.getElementById('claimRows');
  const ensResolvedEl = document.getElementById('ensResolved');

  rowsEl.innerHTML = spinnerHTML('Resolving address...');
  banner.classList.add('visible');

  // Resolve address (ENS or raw)
  let addr;
  let ensName = null;
  if (isAddr(rawInput)) {
    addr = rawInput;
  } else if (isENSName(rawInput)) {
    addr = await resolveAddressInput(rawInput);
    if (!addr) {
      rowsEl.innerHTML = '<div class="no-balance-state"><p>Could not resolve ' + esc(rawInput) + '</p></div>';
      return;
    }
    ensName = rawInput;
  } else {
    showInlineError('addrError', 'Invalid address or ENS name.');
    return;
  }

  if (ensName) {
    ensResolvedEl.style.display = 'block';
    ensResolvedEl.innerHTML = esc(ensName) + ' = ' + esc(truncAddr(addr));
  } else {
    ensResolvedEl.style.display = 'none';
  }

  // Test mode: store impersonation address for simulation buttons
  if (TEST_MODE) {
    _testImpersonateAddr = addr.toLowerCase();
    walletAddress = addr; // needed for claim card rendering
  }

  const resolvedAddrs = [addr];

  document.getElementById('claimBannerTitle').textContent = '';
  banner.classList.remove('celebrate');
  rowsEl.innerHTML = spinnerHTML('Checking contracts... 0/' + Object.keys(EXCHANGES).length);
  scanStart();

  window.va?.track?.('address_checked', { method: 'manual' });
  logEvent('check', { address: addr });

  const result = await checkSingleAddress(addr);
  let grandTotalEth = result.totalEth;
  let grandFound = result.found;
  let allHtml = result.html;

  const ethPrice = await getEthPrice();
  let finalHtml;
  if (grandFound === 0) {
    const addrDisplay = resolvedAddrs.length === 1 ? esc(resolvedAddrs[0]) : resolvedAddrs.length + ' addresses';
    finalHtml = '<div class="no-balance-state"><div class="no-balance-check">&#10003;</div><div class="no-balance-title">No unclaimed ETH found</div><div class="no-balance-addr">' + addrDisplay + '</div><p>Checked ' + Object.keys(EXCHANGES).length + ' contracts.</p><div class="no-balance-hint">Try other wallets from 2015-2019.</div></div>' + _botCTA;
    var _manualTitle = 'Scan Complete';
    var _manualCelebrate = false;
  } else {
    const usdStr = ethPrice ? fmtUsd(grandTotalEth * ethPrice) : '';
    finalHtml = '<div class="claim-hero"><div class="claim-hero-amount">' + fmtEth(grandTotalEth) + ' ETH</div>' +
      (usdStr ? '<div class="claim-hero-usd">' + usdStr + '</div>' : '') +
      '<div class="claim-hero-contracts">' + grandFound + ' contract' + (grandFound > 1 ? 's' : '') + (resolvedAddrs.length > 1 ? ' across ' + resolvedAddrs.length + ' addresses' : '') + '</div></div>' +
      '<div class="claim-rows-list">' + allHtml + '</div>' +
      '<div style="text-align:center;margin-top:16px">' +
        '<button class="wallet-btn" data-action="connect-for-manual" style="padding:8px 18px;font-size:14px">Connect Wallet to Claim</button>' +
      '</div>' + _botCTA;
    var _manualTitle = 'Claimable ETH Found';
    var _manualCelebrate = true;
    logEvent('found', { address: resolvedAddrs[0], contracts_found: grandFound, total_eth: grandTotalEth });
    pendingManualAddress = resolvedAddrs[0];
  }

  // Wait for minimum spinner display time before showing results
  await scanMinDelay();

  document.getElementById('claimBannerTitle').textContent = _manualTitle;
  if (_manualCelebrate) banner.classList.add('celebrate');
  rowsEl.innerHTML = finalHtml;
}

async function connectWalletForManual() {
  // Connect wallet, then re-check the MANUAL address (not the wallet address) with withdraw buttons
  const addrToCheck = pendingManualAddress;
  if (!addrToCheck) { connectWallet(); return; }

  if (!window.ethereum) {
    const banner = document.getElementById('claimBanner');
    const rowsEl = document.getElementById('claimRows');
    rowsEl.innerHTML = `<div style="text-align:center;padding:20px">
      <p style="font-size:14px;font-weight:700;margin-bottom:8px">No wallet detected</p>
      <p style="font-size:12px;color:var(--text2);margin-bottom:12px">Install <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">MetaMask</a> or another Web3 wallet to withdraw.</p>
      <p style="font-size:12px;color:var(--text2)">You can still paste any address above to check balances without a wallet.</p>
    </div>`;
    banner.classList.add('visible');
    document.getElementById('claimBannerTitle').textContent = '';
    return;
  }

  try {
    walletProvider = new ethers.BrowserProvider(window.ethereum);
    try { await walletProvider.send('wallet_requestPermissions', [{ eth_accounts: {} }]); } catch(e) {}
    await walletProvider.send('eth_requestAccounts', []);
    walletSigner = await walletProvider.getSigner();
    walletAddress = await walletSigner.getAddress();

    document.getElementById('walletBtn').textContent = 'Disconnect';
    document.getElementById('walletBtn').classList.add('connected');
    document.getElementById('walletAddr').textContent = truncAddr(walletAddress);
    document.getElementById('connectCta').style.display = 'none';

    try { await checkNetwork(); } catch(e) {}

    // Now re-check the MANUAL address with full claim UI (withdraw buttons + calldata)
    pendingManualAddress = null;
    scanStart();
    await checkUserBalances(addrToCheck);
  } catch (e) {
    console.error('Wallet connection failed:', e);
    showInlineError('walletError', 'Failed to connect wallet: ' + (e.message || e.code || 'Unknown error'));
  }
}

// ─── Test Mode Helper Functions ───

// _testCheckBalances and _testFakeTxHash removed �� test mode uses real API flow

async function _testClaimETH(key, cfg, btn, statusEl, balance) {
  // Test mode: simulate the real withdrawal call via Tenderly
  var fromAddr = _testImpersonateAddr || walletAddress;
  if (!fromAddr) { statusEl.textContent = 'No address to simulate (enter an address first)'; return; }

  var ethAmount = ethers.formatEther(balance);
  btn.disabled = true;
  btn.textContent = 'Simulating...';
  btn.classList.add('pending');
  statusEl.textContent = 'Simulating as ' + fromAddr.slice(0, 10) + '...';

  try {
    var iface = new ethers.Interface([cfg.withdrawAbi]);
    var args = cfg.withdrawArgs(balance, fromAddr);
    var calldata = iface.encodeFunctionData(cfg.withdrawCall, args);
    var result = await testSimulateTx(fromAddr, cfg.contract, calldata);

    if (result.success) {
      btn.textContent = 'SIM OK';
      btn.classList.remove('pending');
      btn.style.background = 'var(--green)';
      btn.style.opacity = '0.7';
      var claimedEthNum = parseFloat(ethAmount);
      var claimUsd = _ethPrice ? ' (' + fmtUsd(claimedEthNum * _ethPrice) + ')' : '';
      statusEl.innerHTML = '<div class="claim-recovered"><div class="claim-recovered-label" style="color:var(--green)">Simulation Passed</div><div class="claim-recovered-amount">' + fmtEth(ethAmount) + ' ETH' + claimUsd + '</div><div style="font-size:10px;color:#d946ef;margin-top:2px">[TEST MODE] ' + esc(cfg.withdrawCall) + '() would succeed</div></div>';
      showDonationModal(claimedEthNum);
    } else {
      btn.textContent = 'SIM FAIL';
      btn.classList.remove('pending');
      btn.style.background = '#ef4444';
      btn.style.opacity = '0.7';
      statusEl.innerHTML = '<span style="color:#ef4444">Simulation reverted</span>: ' + esc((result.error || '').slice(0, 200)) + '<div style="font-size:10px;color:#d946ef;margin-top:4px">[TEST MODE]</div>';
    }
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Withdraw';
    btn.classList.remove('pending');
    statusEl.textContent = 'Simulation error: ' + (e.message || 'Unknown');
  }

  console.log('[TEST MODE] Simulated claim:', cfg.name, ethAmount, 'ETH');
}

// _testCheckManualAddress removed — test mode now uses normal check flow with impersonation

// Lightweight init: fetch total first, then badge data for all tabs
(async () => {
  // Fetch pre-computed total immediately (single fast request, retry once on failure)
  var totalData = null;
  for (var _attempt = 0; _attempt < 2 && !totalData; _attempt++) {
    try {
      var totalResp = await fetch('/api/total');
      if (totalResp.ok) totalData = await totalResp.json();
      else if (_attempt === 0) await new Promise(r => setTimeout(r, 1500));
    } catch { if (_attempt === 0) await new Promise(r => setTimeout(r, 1500)); }
  }
  // Fallback: use values baked into the page if API is unreachable.
  // A prior commit had a second fallback that fetched /data/total.json, but
  // that URL always 404'd in production (Vercel only serves public/; data/
  // is bundled via includeFiles into API handlers, never served as a static
  // asset). The fetch was dead code and has been removed. The hardcoded
  // values below are the real last resort — update them when adding
  // protocols (grep for this comment).
  if (!totalData) totalData = { total_eth: 164553, total_contract_eth: 165700, contract_count: 170, eth_claimed: 1400, peak_eth: 165960 };
  try {
      var totalEthVal = Math.round(totalData.total_eth);
      const contractCount = totalData.contract_count || Object.keys(EXCHANGES).length;
      document.querySelectorAll('.contract-count').forEach(function(el) { el.textContent = contractCount; });
      getEthPrice();

      // Peak is a stable high-water mark — only increases when new protocols are added
      var ethClaimed = totalData.eth_claimed || 0;
      var PEAK_ETH = Math.round(totalData.peak_eth || ((totalData.total_eth || 0) + ethClaimed));
      animateCount('totalAllEth', PEAK_ETH, '.hero-eth-value');
      animateCount('totalContracts', contractCount);
      setTimeout(function() { var c = document.querySelector('.hero-cursor'); if (c) c.style.display = 'none'; }, 1500);

      // Show progress bar if claims exist
      if (ethClaimed > 0) {
        var totalBlocks = 77;
        var filledBlocks = Math.max(1, Math.round(ethClaimed / PEAK_ETH * totalBlocks));
        var blocksEl = document.getElementById('heroBlocks');
        for (var bi = 0; bi < totalBlocks; bi++) {
          var block = document.createElement('div');
          block.className = 'hero-progress-block' + (bi < filledBlocks ? ' filled' : '');
          blocksEl.appendChild(block);
        }

        var pctRaw = ethClaimed / PEAK_ETH * 100;
        var pct = (Math.floor(pctRaw * 100) / 100).toFixed(2);
        document.getElementById('heroPct').textContent = pct + '%';

        var counterEl = document.getElementById('heroCounter');
        var recoveredSpan = document.createElement('span');
        recoveredSpan.className = 'recovered-val';
        recoveredSpan.textContent = Math.round(ethClaimed).toLocaleString();
        var totalSpan = document.createElement('span');
        totalSpan.className = 'total-val';
        totalSpan.textContent = PEAK_ETH.toLocaleString();
        counterEl.appendChild(recoveredSpan);
        counterEl.appendChild(document.createTextNode(' / '));
        counterEl.appendChild(totalSpan);
        counterEl.appendChild(document.createTextNode(' '));
        var ethSpan = document.createElement('span');
        ethSpan.textContent = 'ETH ';
        ethSpan.style.cssText = 'font-weight:600;color:var(--text);';
        counterEl.appendChild(ethSpan);
        var labelSpan = document.createElement('span');
        labelSpan.textContent = 'claimed back';
        labelSpan.style.cssText = 'font-style:italic;font-weight:600;color:var(--text);letter-spacing:0.5px;';
        counterEl.appendChild(labelSpan);

        document.getElementById('heroProgress').style.display = '';
      }
  } catch(e) {}

  // Fetch all badge data in a single request instead of ~76 parallel calls
  try {
    const summaryResp = await fetch('/api/summary');
    if (summaryResp.ok) {
      const summary = await summaryResp.json();
      for (const key of Object.keys(EXCHANGES)) {
        const c = summary.contracts[key];
        if (c) {
          tabState[key].meta = c;
          document.getElementById('badge-' + key).textContent = fmtEth(c.total_eth) + ' ETH';
        }
      }
    }
  } catch(e) {
    // Fallback: fetch badges individually if summary fails
    const badgePromises = Object.keys(EXCHANGES).map(async key => {
      try {
        const resp = await fetch('/api/table?exchange=' + key + '&page=0&pageSize=1');
        if (!resp.ok) return;
        const data = await resp.json();
        tabState[key].meta = data.meta;
        const d = data.meta;
        if (d) document.getElementById('badge-' + key).textContent = fmtEth(d.total_eth) + ' ETH';
      } catch(e) {}
    });
    await Promise.all(badgePromises);
  }

  const tabsContainer = document.getElementById('tabs');
  const tabs = Array.from(tabsContainer.querySelectorAll('.tab'));
  tabs.sort((a, b) => {
    const aEth = tabState[a.dataset.tab]?.meta?.total_eth || 0;
    const bEth = tabState[b.dataset.tab]?.meta?.total_eth || 0;
    return bEth - aEth;
  });

  // Re-append tabs sorted by ETH (flat, no categories)
  tabs.forEach(tab => tabsContainer.appendChild(tab));

  // Update mobile select to match sort order
  const sel = document.getElementById('tabSelect');
  const curVal = sel.value;
  sel.innerHTML = '';
  tabs.forEach(tab => {
    const opt = document.createElement('option');
    opt.value = tab.dataset.tab;
    opt.textContent = tab.textContent.trim();
    sel.appendChild(opt);
  });
  sel.value = curVal;

  // Load the first (active) tab fully
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    const key = activeTab.dataset.tab;
    loadedTabs.add(key);
    await loadExchange(key);
  }

  getEthPrice();

  // Hide footer donation address if it's a placeholder (not a valid Ethereum address)
  const footerDonation = document.getElementById('footerDonationAddr');
  if (footerDonation && !ethers.isAddress(footerDonation.textContent.trim())) {
    footerDonation.parentElement.style.display = 'none';
  }

  if (TEST_MODE) {
    const testBanner = document.createElement('div');
    testBanner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#d946ef;color:#fff;text-align:center;padding:4px;font-size:11px;font-weight:700;z-index:9999;font-family:monospace';
    testBanner.textContent = 'TEST MODE — All balances and transactions are simulated. No real wallet or RPC calls.';
    document.body.prepend(testBanner);
    document.body.style.paddingTop = '28px';
  }
})();

// ─── Event Delegation for Dynamic Content ───
// All dynamically generated buttons use data-action attributes instead of inline onclick

// Static element event listeners
document.getElementById('walletBtn').addEventListener('click', function() { connectWallet(); });

document.getElementById('checkManualBtn').addEventListener('click', function() { checkManualAddress(); });

document.getElementById('manualAddrInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); checkManualAddress(); }
});

document.getElementById('explorerToggle').addEventListener('click', function() {
  document.getElementById('explorerSection').classList.remove('explorer-collapsed');
  this.style.display = 'none';
});

document.getElementById('tabsToggleBtn').addEventListener('click', function() {
  var t = document.getElementById('tabs'), b = this;
  if (t.classList.contains('expanded')) {
    t.style.maxHeight = '80px';
    t.classList.remove('expanded');
    b.innerHTML = 'More contracts &#x25BE;';
  } else {
    t.style.maxHeight = t.scrollHeight + 'px';
    t.classList.add('expanded');
    b.innerHTML = 'Less contracts &#x25B4;';
  }
});

document.getElementById('protocolSearch').addEventListener('input', function() {
  filterTabs(this.value);
});

// Footer donation address copy-to-clipboard
document.getElementById('footerDonationAddr')?.addEventListener('click', function() {
  var el = this;
  navigator.clipboard.writeText(el.textContent).then(function() {
    el.style.color = 'var(--green)';
    setTimeout(function() { el.style.color = ''; }, 1500);
  });
});

// Custom donation amount input handler
document.getElementById('claimBanner').addEventListener('input', function(e) {
  if (e.target.id === 'donationAmt') {
    var val = parseFloat(e.target.value) || 0;
    var usdEl = document.getElementById('donationUsd');
    if (usdEl && _ethPrice) usdEl.textContent = val > 0 ? '(' + fmtUsd(val * _ethPrice) + ')' : '';
    var card = e.target.closest('.donation-card');
    var confirmBtn = card && card.querySelector('.donation-confirm-btn');
    if (confirmBtn) {
      var label = 'Donate ' + val.toFixed(2) + ' ETH';
      if (_ethPrice && val > 0) label += ' (' + fmtUsd(val * _ethPrice) + ')';
      confirmBtn.textContent = label;
      confirmBtn.dataset.label = label;
      confirmBtn.dataset.amt = val.toFixed(4);
    }
    // Deselect pills when custom amount is typed
    var pills = card && card.querySelectorAll('.donation-pct-btn');
    if (pills) pills.forEach(function(p) { p.classList.remove('active'); });
  }
});

// Event delegation on claim banner for all dynamically generated buttons
document.getElementById('claimBanner').addEventListener('click', function(e) {
  var btn = e.target.closest('[data-action]');
  if (!btn) return;
  var action = btn.dataset.action;

  if (action === 'claim-eth') {
    claimETH(btn.dataset.key);
  } else if (action === 'claim-exit') {
    claimExit(btn.dataset.key);
  } else if (action === 'claim-lock') {
    claimLockMe(btn.dataset.key);
  } else if (action === 'nucypher-claim') {
    nucypherClaim(btn.dataset.key);
  } else if (action === 'nucypher-refund') {
    nucypherRefund(btn.dataset.key);
  } else if (action === 'digix-approve') {
    digixApprove(btn.dataset.key);
  } else if (action === 'digix-burn') {
    digixBurn(btn.dataset.key);
  } else if (action === 'dao-approve') {
    daoApprove(btn.dataset.key);
  } else if (action === 'dao-withdraw') {
    daoWithdrawExecute(btn.dataset.key);
  } else if (action === 'dao-msig-approve') {
    daoMsigApprove(btn.dataset.key, btn.dataset.msig);
  } else if (action === 'dao-msig-withdraw') {
    daoMsigWithdraw(btn.dataset.key, btn.dataset.msig);
  } else if (action === 'neufund-approve-and-unlock') {
    neufundApproveAndUnlock(btn.dataset.key);
  } else if (action === 'neufund-withdraw-etht') {
    neufundWithdrawEthT(btn.dataset.key);
  } else if (action === 'aave-approve') {
    aaveV1Approve(btn.dataset.key, btn.dataset.token);
  } else if (action === 'aave-repay') {
    aaveV1Repay(btn.dataset.key, btn.dataset.token);
  } else if (action === 'switcheo-announce') {
    switcheoAnnounce(btn.dataset.key);
  } else if (action === 'switcheo-withdraw') {
    switcheoWithdraw(btn.dataset.key);
  } else if (action === 'mesa-request') {
    mesaRequestWithdraw(btn.dataset.key, btn);
  } else if (action === 'mesa-withdraw') {
    mesaWithdraw(btn.dataset.key, btn);
  } else if (action === 'kyber-claim-epoch') {
    kyberClaimEpoch(btn.dataset.key, parseInt(btn.dataset.epoch), btn);
  } else if (action === 'augur-mailbox') {
    augurWithdrawMailbox(btn.dataset.key, btn.dataset.mailbox, btn);
  } else if (action === 'augur-cancel-order') {
    augurCancelOrder(btn.dataset.key, btn.dataset.orderId, btn);
  } else if (action === 'augur-claim-shares') {
    augurClaimShares(btn.dataset.key, btn.dataset.market, btn);
  } else if (action === 'kill-bounty') {
    killBounty(btn.dataset.key, parseInt(btn.dataset.bountyId), btn);
  } else if (action === 'hegic-withdraw') {
    hegicWithdrawTranche(btn.dataset.key, parseInt(btn.dataset.trancheId), btn);
  } else if (action === 'keeperdao-approve') {
    keeperdaoApprove(btn.dataset.key, parseInt(btn.dataset.itemIdx));
  } else if (action === 'keeperdao-withdraw') {
    keeperdaoWithdraw(btn.dataset.key, parseInt(btn.dataset.itemIdx));
  } else if (action === 'cancel-mooncat') {
    cancelMoonCatRequest(btn.dataset.key, btn.dataset.catId, parseInt(btn.dataset.index));
  } else if (action === 'claim-ens-deed') {
    claimENSDeed(parseInt(btn.dataset.deedIndex));
  } else if (action === 'ens-show-all') {
    var hidden = document.getElementById('ensHiddenDeeds');
    if (hidden) hidden.style.display = '';
    btn.style.display = 'none';
  } else if (action === 'ens-manual-release') {
    ensManualRelease();
  } else if (action === 'donate-confirm') {
    var input = document.getElementById('donationAmt');
    var val = input ? parseFloat(input.value) : parseFloat(btn.dataset.amt || '0');
    if (!val || val <= 0) return;
    // In test mode without wallet, connect one for the donation
    if (!walletSigner && window.ethereum) {
      (async function() {
        try {
          var provider = new ethers.BrowserProvider(window.ethereum);
          await provider.send('eth_requestAccounts', []);
          walletSigner = await provider.getSigner();
          walletAddress = await walletSigner.getAddress();
          await sendDonation(ethers.parseEther(val.toFixed(6)));
        } catch(e) {
          var errEl = btn.closest('.donation-card')?.querySelector('.donation-error');
          if (errEl) errEl.textContent = e.message || 'Wallet connection failed';
        }
      })();
      return;
    }
    sendDonation(ethers.parseEther(val.toFixed(6))).catch(function(e) {
      var errEl = btn.closest('.donation-card')?.querySelector('.donation-error');
      if (errEl) errEl.textContent = e.reason || e.message || 'Transaction failed';
    });
  } else if (action === 'donation-pct') {
    var pct = parseInt(btn.dataset.pct);
    var card = btn.closest('.donation-card');
    var claimEth = card ? parseFloat(card.dataset.claimEth) || _lastClaimEth : _lastClaimEth;
    var amt = (claimEth * pct / 100).toFixed(2);
    // Toggle active pill
    btn.closest('.donation-pct-row')?.querySelectorAll('.donation-pct-btn').forEach(function(b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');
    // Update input
    var input = document.getElementById('donationAmt');
    if (input) input.value = amt;
    // Update USD
    var usdEl = document.getElementById('donationUsd');
    if (usdEl && _ethPrice) usdEl.textContent = '(' + fmtUsd(parseFloat(amt) * _ethPrice) + ')';
    // Update the confirm button label
    var confirmBtn = card && card.querySelector('.donation-confirm-btn');
    if (confirmBtn) {
      var label = 'Donate ' + amt + ' ETH';
      if (_ethPrice) label += ' (' + fmtUsd(parseFloat(amt) * _ethPrice) + ')';
      confirmBtn.textContent = label;
      confirmBtn.dataset.label = label;
      confirmBtn.dataset.amt = amt;
    }
  } else if (action === 'copy-donation-addr') {
    navigator.clipboard.writeText(DONATION_ADDRESS).then(function() {
      btn.style.color = 'var(--green)';
      setTimeout(function() { btn.style.color = ''; }, 1500);
    });
  } else if (action === 'donation-skip') {
    var card = document.getElementById('donationCard');
    if (card) {
      card.classList.add('hiding');
      setTimeout(function() { var wrap = document.getElementById('donationCardWrap'); if (wrap) wrap.style.display = 'none'; }, 300);
    }
  } else if (action === 'share') {
    shareResult(btn.dataset.shareText || undefined);
  } else if (action === 'copy-link') {
    navigator.clipboard.writeText('https://forgotteneth.com').then(function() {
      btn.textContent = 'Copied!';
    });
  } else if (action === 'connect-for-manual') {
    connectWalletForManual();
  } else if (action === 'toggle-details') {
    var details = document.getElementById('claimDetails-' + btn.dataset.key);
    if (details) {
      details.classList.toggle('visible');
      btn.textContent = btn.textContent === 'Details' ? 'Hide' : 'Details';
    }
  } else if (action === 'watch-address') {
    var addrs = (btn.dataset.addresses || '').split(',').filter(Boolean);
    addrs.forEach(function(a) { addToWatchlist(a); });
    btn.textContent = 'Watching!';
    btn.disabled = true;
    btn.style.opacity = '0.6';
  }
});

// ─── FAQ toggle ───
document.addEventListener('click', function(e) {
  var q = e.target.closest('[data-faq-toggle]');
  if (!q) return;
  q.parentElement.classList.toggle('open');
});

// ─── Watchlist bar event delegation ───
document.getElementById('watchlistBar').addEventListener('click', function(e) {
  e.preventDefault();
  var action = e.target.dataset.action;
  if (action === 'show-watchlist') {
    var list = getWatchlist();
    var wlEl = document.getElementById('watchlistBar');
    var existing = document.getElementById('watchlistList');
    if (existing) { existing.remove(); return; }
    var div = document.createElement('div');
    div.id = 'watchlistList';
    div.style.cssText = 'font-size:11px;color:var(--text2);margin-top:6px;word-break:break-all;line-height:1.8';
    div.textContent = list.join(', ');
    wlEl.appendChild(div);
  } else if (action === 'clear-watchlist') {
    localStorage.removeItem(WATCHLIST_KEY);
    renderWatchlistBar();
  }
});

// Init watchlist on page load
renderWatchlistBar();
recheckWatchlist();

// Auto-connect if ?address= param is present (from protocol page redirect)
// Skip the wallet picker — session is already active from protocol page
(function() {
  var params = new URLSearchParams(window.location.search);
  var addr = params.get('address');
  if (!addr) return;

  var input = document.getElementById('manualAddrInput');
  if (input) input.value = addr;

  setTimeout(async function() {
    // Try direct connect without picker (wallet session should be active)
    if (window.ethereum) {
      try {
        var accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          // Session active — connect directly
          walletProvider = new ethers.BrowserProvider(window.ethereum);
          walletSigner = await walletProvider.getSigner();
          walletAddress = await walletSigner.getAddress();

          document.getElementById('walletBtn').textContent = 'Disconnect';
          document.getElementById('walletBtn').classList.add('connected');
          document.getElementById('walletAddr').textContent = truncAddr(walletAddress);
          document.getElementById('connectCta').style.display = 'none';

          try { await checkNetwork(); } catch(e) {}

          var banner = document.getElementById('claimBanner');
          var rowsEl = document.getElementById('claimRows');
          rowsEl.innerHTML = spinnerHTML('Scanning ' + Object.keys(EXCHANGES).length + ' contracts...');
          banner.classList.add('visible');
          scanStart();
          try { await checkUserBalances(); } catch(e) { console.error('Balance check failed:', e); }
          return;
        }
      } catch(e) {}
    }
    // Fallback: no active session, just check the address manually
    checkManualAddress();
  }, 300);
})();

// Copy donation address with checkmark animation
(function() {
  var copyBtn = document.getElementById('copyDonation');
  if (!copyBtn) return;
  var addr = '0xAE7d7C366F7Ebc2b58E17D0Fb3Aa9C870ea77891';
  var svgHTML = copyBtn.innerHTML; // save original SVG
  function doCopy() {
    var ta = document.createElement('textarea');
    ta.value = addr;
    ta.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    // Show "copied!" feedback
    copyBtn.textContent = 'copied!';
    copyBtn.style.color = 'var(--green)';
    copyBtn.style.opacity = '1';
    copyBtn.style.fontSize = '11px';
    setTimeout(function() {
      copyBtn.textContent = '';
      copyBtn.style.color = '';
      copyBtn.style.opacity = '';
      copyBtn.style.fontSize = '';
      // Recreate SVG via DOM (no innerHTML needed)
      var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('width', '14'); s.setAttribute('height', '14');
      s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
      s.setAttribute('stroke', 'var(--text2)'); s.setAttribute('stroke-width', '2');
      s.style.opacity = '0.6';
      var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x','9'); r.setAttribute('y','9'); r.setAttribute('width','13'); r.setAttribute('height','13'); r.setAttribute('rx','2');
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', 'M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1');
      s.appendChild(r); s.appendChild(p);
      copyBtn.appendChild(s);
    }, 1500);
  }
  copyBtn.addEventListener('click', function(e) { e.preventDefault(); doCopy(); });
})();

