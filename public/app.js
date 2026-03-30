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

// Keystore file wallet — decrypts UTC/JSON keystore files (MyEtherWallet style)
var _keystoreWallet = null;

function _showWalletPicker(providers) {
  return new Promise(function(resolve) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    var modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:28px;max-width:400px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)';

    var title = '<h3 style="font-size:18px;font-weight:800;margin-bottom:4px;text-align:center">Connect Wallet</h3>';
    title += '<p style="font-size:12px;color:var(--text2);text-align:center;margin-bottom:20px">Choose how to connect</p>';
    modal.innerHTML = title;

    // Section: Browser wallets
    if (providers.length > 0) {
      var label = document.createElement('div');
      label.style.cssText = 'font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text2);font-weight:700;margin-bottom:8px';
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
      label2.style.cssText = 'font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text2);font-weight:700;margin-bottom:8px';
      label2.textContent = 'No wallet detected — install one';
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
    sep.style.cssText = 'font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text2);font-weight:700;margin:16px 0 8px';
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
    cancel.style.cssText = 'display:block;margin:16px auto 0;padding:8px 20px;background:none;border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px;color:var(--text2);font-family:inherit;transition:all 0.15s';
    cancel.onmouseenter = function() { cancel.style.borderColor = 'var(--accent)'; cancel.style.color = 'var(--accent)'; };
    cancel.onmouseleave = function() { cancel.style.borderColor = 'var(--border)'; cancel.style.color = 'var(--text2)'; };
    cancel.addEventListener('click', function() { document.body.removeChild(overlay); resolve(null); });
    modal.appendChild(cancel);

    overlay.appendChild(modal);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) { document.body.removeChild(overlay); resolve(null); } });
    document.body.appendChild(overlay);
  });
}

function _makeWalletBtn(icon, name, subtitle, onclick) {
  var btn = document.createElement('button');
  btn.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%;padding:12px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-family:inherit;color:var(--text);margin-bottom:8px;transition:border-color 0.15s,box-shadow 0.15s;text-align:left';
  btn.onmouseenter = function() { btn.style.borderColor = 'var(--accent)'; btn.style.boxShadow = '0 2px 8px rgba(124,58,237,0.1)'; };
  btn.onmouseleave = function() { btn.style.borderColor = 'var(--border)'; btn.style.boxShadow = 'none'; };
  var img = document.createElement('img');
  img.src = icon;
  img.style.cssText = 'width:36px;height:36px;border-radius:8px;flex-shrink:0';
  img.onerror = function() { this.style.display = 'none'; };
  btn.appendChild(img);
  var text = document.createElement('div');
  var _e = function(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
  text.innerHTML = '<div style="font-size:14px;font-weight:700">' + _e(name) + '</div>' +
    (subtitle ? '<div style="font-size:11px;color:var(--text2);font-weight:400">' + _e(subtitle) + '</div>' : '');
  btn.appendChild(text);
  btn.addEventListener('click', onclick);
  return btn;
}

async function _handleKeystoreConnect() {
  return new Promise(function(resolve, reject) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    var modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:28px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3)';
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

    document.getElementById('keystoreCancel')?.remove(); // prevent duplicate
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
// Hashes wallet addresses with keccak256 before logging to preserve privacy
function logEvent(type, data) {
  try {
    const sanitized = { ...data };
    if (sanitized.address) sanitized.address = ethers.keccak256(ethers.toUtf8Bytes(sanitized.address.toLowerCase()));
    fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, ...sanitized }) }).catch(() => {});
  } catch(e) {}
}

// Report uncaught JS errors (invisible without this)
window.onerror = function(msg, src, line, col) {
  logEvent('frontend_error', { error: String(msg).slice(0, 200), source: (src || '').split('/').pop(), line: line, col: col });
};
window.onunhandledrejection = function(e) {
  logEvent('frontend_error', { error: String(e.reason?.message || e.reason || '').slice(0, 200), type: 'promise' });
};

async function fetchCheck(address) {
  return fetch(`/api/check?address=${encodeURIComponent(address)}`);
}

// ─── Test/Simulation Mode ───
// Activate ONLY via localStorage developer flag on localhost (never via URL params).
// This prevents phishing via preview deploy links with ?test=1.
const TEST_MODE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && localStorage.getItem('FORGOTTEN_ETH_DEV') === '1';
const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const TEST_BALANCES = {
  idex:       { wei: ethers.parseEther('0.5'),  eth: '0.5' },
  digixdao:   { wei: ethers.parseEther('12.5'), eth: '12.5' },
};
if (TEST_MODE) console.log('%c[TEST MODE] Simulation active — no real transactions will occur', 'color:#d946ef;font-weight:bold;font-size:14px');

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
const DONATION_ADDRESS = '0x95a708aAAB1D336bB60EF2F40212672F4cf65736';

async function sendDonation(amountWei) {
  if (!walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }

  var card = document.getElementById('donationCard');
  var sendBtn = card && card.querySelector('.donation-confirm-btn');
  var errorEl = card && card.querySelector('.donation-error');

  // Loading state
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Sending...'; sendBtn.classList.add('pending'); }
  if (errorEl) errorEl.textContent = '';

  // ── Test Mode: simulate donation ──
  if (TEST_MODE) {
    console.log('[TEST MODE] Simulated donation:', ethers.formatEther(amountWei), 'ETH');
    if (card) card.innerHTML = '<div class="donation-success"><div class="donation-success-msg">Thank you for your donation.</div><div style="font-size:11px;color:var(--yellow);margin-top:4px">[TEST MODE]</div></div>';
    return;
  }

  if (!ethers.isAddress(DONATION_ADDRESS)) {
    showInlineError('walletError', 'Donation address is not configured yet. Thank you for the thought!');
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = sendBtn.dataset.label || 'Donate'; sendBtn.classList.remove('pending'); }
    return;
  }

  try {
    var tx = await walletSigner.sendTransaction({ to: DONATION_ADDRESS, value: amountWei });
    window.va?.track?.('donation_sent', { amount_eth: ethers.formatEther(amountWei), tx_hash: tx.hash });
    if (card) card.innerHTML = '<div class="donation-success"><div class="donation-success-msg">Thank you for your donation.</div><div class="donation-success-tx"><a href="' + etherscanTx(tx.hash) + '" target="_blank" rel="noopener noreferrer">View donation on Etherscan</a></div></div>';
  } catch (e) {
    // Reset button on any error
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = sendBtn.dataset.label || 'Donate'; sendBtn.classList.remove('pending'); }
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) return; // User cancelled — silent
    console.error('Donation error:', e);
    if (errorEl) errorEl.textContent = 'Transaction failed — try again or skip.';
  }
}

let _lastClaimEth = 0;

function renderDonationCard(claimedEth) {
  _lastClaimEth = claimedEth;
  if (claimedEth < 0.01) return '';

  var defaultPct = 5;
  var defaultAmt = (claimedEth * defaultPct / 100).toFixed(2);
  var btnLabel = 'Donate ' + defaultAmt + ' ETH';
  if (_ethPrice) btnLabel += ' (' + fmtUsd(parseFloat(defaultAmt) * _ethPrice) + ')';

  function pill(pct, isActive) {
    return '<button class="donation-pct-btn' + (isActive ? ' active' : '') + '" data-action="donation-pct" data-pct="' + pct + '">' + pct + '%</button>';
  }

  var usdHint = _ethPrice ? ' <span class="donation-custom-usd" id="donationUsd">(' + fmtUsd(parseFloat(defaultAmt) * _ethPrice) + ')</span>' : '';

  return '<div id="donationCardWrap" style="display:none"><div class="donation-card" id="donationCard" data-claim-eth="' + claimedEth + '">' +
    '<div class="donation-copy">If you found this useful, consider a donation.</div>' +
    '<div class="donation-pct-row">' + pill(8, false) + pill(5, true) + pill(2, false) + '</div>' +
    '<div class="donation-custom"><input type="number" id="donationAmt" class="donation-custom-input" value="' + defaultAmt + '" step="0.001" min="0" data-claim-eth="' + claimedEth + '"><span class="donation-custom-label">ETH</span>' + usdHint + '</div>' +
    '<div><button data-action="donate-confirm" class="donation-confirm-btn">' + btnLabel + '</button></div>' +
    '<div><button data-action="donation-skip" class="donation-skip">skip</button></div>' +
    '<div class="donation-error"></div>' +
  '</div></div>';
}

// Show donation card after a delay (called after claim success renders)
function showDonationCardDelayed() {
  var wrap = document.getElementById('donationCardWrap');
  if (wrap) setTimeout(function() { wrap.style.display = ''; }, 2500);
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
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
  }
  renderWatchlistBar();
}
function removeFromWatchlist(addr) {
  const list = getWatchlist().filter(a => a.toLowerCase() !== addr.toLowerCase());
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
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
      if (resp.ok) {
        const data = await resp.json();
        const balances = data.balances || {};
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
    // Try each public RPC until one works
    let balance = null;
    for (let attempt = 0; attempt < PUBLIC_RPCS.length; attempt++) {
      try {
        const provider = getPublicProvider();
        const contract = new ethers.Contract(contractAddr, [cfg.balanceAbi], provider);
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
    desc: 'EtherDelta launched July 12, 2016 as the first widely-used DEX for ERC-20 tokens. It became the go-to venue for ICO token trading in 2017, peaking at ~$10M daily volume. On December 20, 2017, attackers hijacked its DNS to steal $1.4M from users. In November 2018, the SEC charged its creator with operating an unregistered exchange — the first such action against a DEX.',
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
    desc: 'An unverified EtherDelta-style DEX contract from September 2017. The protocol behind this contract has not been identified — the source code is not published on Etherscan but follows the standard deposit/withdraw pattern.',
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
    desc: 'An EtherDelta-fork DEX that was notably served directly from GitHub Pages (circa 2017). Minimal presence online — one of many EtherDelta forks from the 2017-2018 era that attracted small trading communities.',
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
    desc: 'A collaborative digital art platform. Deployed its "Creeps &amp; Weirdos" NFT collection on October 5, 2017 — after CryptoPunks but before CryptoKitties. Featured 108 unique pieces by 30 artists and was the first NFT project to implement artist royalties coded directly into the smart contract, using a modified CryptoPunks contract.',
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
    desc: 'Deployed August 9, 2017, one of the earliest NFTs on Ethereum — before the term "NFT" or ERC-721 existed. Features 25,440 generative pixel art cats with a proof-of-work minting mechanism. Only 3,365 cats were rescued in 2017; on March 12, 2021 crypto-archaeologists rediscovered it and all remaining 19,000+ cats were rescued within hours. Note: ~100 ETH from the genesis cat is permanently stuck at address(0) due to a contract bug. Users with pending adoption requests must cancel them to reclaim escrowed ETH.',
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
    desc: 'Players buy keys that reset a countdown timer; the last buyer wins the jackpot. Round 1 ended August 2018 paying 10,469 ETH (~$2.8M), won via a block-stuffing attack that prevented competing transactions. At peak, the contract held over $43M. Note: the isHuman modifier means smart contract wallets cannot withdraw — only EOAs.',
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
    desc: 'A faster-round variant of Fomo3D (2018) with shorter countdown durations. Same key-purchase mechanic and dividend system as Fomo3D Long. Note: isHuman modifier — smart contract wallets cannot withdraw.',
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
    desc: 'Another variant of Fomo3D (2018). Same core mechanics — key purchases, countdown timer, dividend distribution. Note: isHuman modifier — smart contract wallets cannot withdraw.',
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
    desc: 'The earliest EtherDelta contract, deployed around August 2016 using Solidity v0.3.6 — one of the very first DEX contracts on Ethereum, deployed just months after the DAO hack. The team iterated through multiple versions (Oct 2016, Feb 2017) before the well-known v2; each upgrade required manual migration.',
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
    desc: 'NuCypher launched a WorkLock distribution in September 2020, where participants deposited ETH to receive NU tokens. ETH was refundable after completing staking work. NuCypher merged with Keep Network to form Threshold Network in 2022, and the staking requirement was removed — all participants now qualify for a full refund regardless of work completed.',
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
    desc: 'An EtherDelta-fork DEX by Switch.ag (2019), notable for being active from 2019-2024 with 8,000+ trades — unusually long-lived for an order-book DEX in the AMM era.',
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
    desc: 'A whitelisted EtherDelta-fork DEX (2018). Unusual in that deposits required whitelist approval, but the withdraw function is permissionless — anyone with a balance can withdraw.',
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
    desc: 'An unverified EtherDelta v2 fork — source code not published on Etherscan but bytecode matches the standard pattern.',
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
    desc: 'Deployed July 2018, a Fomo3D fork named after the Ernest Cline novel and Spielberg film. Same key-purchase countdown mechanic where the last buyer before the timer expires wins the pot. Note: isHuman modifier — smart contract wallets cannot withdraw.',
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
    desc: 'A Fomo3D-style gambling game deployed in 2018, also known as "Last Winner" — one of the largest Fomo3D clones by total ETH volume. Players purchase keys that extend a countdown timer; when the timer runs out, the last buyer wins the pot. Unclaimed dividends and affiliate earnings remain withdrawable. Note: isHuman modifier — smart contract wallets cannot withdraw.',
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
    desc: 'One of the earliest Fomo3D clones, deployed July 2018 within weeks of the original. A speed-round variant of the countdown-timer game where rounds resolved faster than standard Fomo3D. Note: isHuman modifier — smart contract wallets cannot withdraw.',
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
    withdrawAbi: 'function withdraw()',
    withdrawArgs: () => [],
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
  lynia: { name: 'LYNIA', desc: 'A gaming and gambling platform deployed August 2018 that combined PoWH3D-style dividend tokens with provably fair on-chain games. Has an isHuman modifier — smart contract wallets cannot withdraw.', category: 'gambling', color: '#86198f', contract: '0xecfae6f958f7ab15bdf171eeefa568e41eabf641', deployed: 'August 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  blackgold: { name: 'BlackGoldEthereum', desc: 'was a dividend-based PoWH3D clone (July 2020) designed to provide passive income to token holders through a buy/sell/reinvestment mechanism. The project website blackgoldethereum.club is no longer accessible.', category: 'gambling', color: '#374151', contract: '0xf72b0b36723f60402cccad7f4358acf2ad474c17', deployed: 'July 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  proofofcraiggrant: { name: 'ProofOfCraigGrant', desc: 'Deployed April 2018, a meme-themed PoWH3D fork named after Craig Grant, one of BitConnect\'s most prominent YouTube promoters. Part of a series of personality-themed P3D clones alongside Proof of Trevon James.', category: 'gambling', color: '#78350f', contract: '0xea61319f55b6543962fe1d7bd990ef74849fc54f', deployed: 'April 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  sportcrypt: { name: 'SportCrypt', desc: 'was a peer-to-peer decentralized sports betting exchange (January 2018) with zero fees and no KYC requirements. Later rebranded to Degens and received a MakerDAO community grant to accept DAI alongside ETH.', category: 'gambling', color: '#166534', contract: '0x37304b0ab297f13f5520c523102797121182fb5b', deployed: 'January 2018', balanceAbi: 'function getBalance(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'getBalance', withdrawAbi: 'function withdraw(uint256 amount)', withdrawArgs: (amount) => [amount], withdrawCall: 'withdraw' },
  dailydivs: { name: 'DailyDivs', desc: 'was a PoWH3D clone (October 2018) offering daily dividend distributions to token holders through a 10% buy/sell fee. Has an isHuman modifier — smart contract wallets cannot withdraw.', category: 'gambling', color: '#92400e', contract: '0xd2bfceeab8ffa24cdf94faa2683df63df4bcbdc8', deployed: 'October 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  proofofcommunity: { name: 'ProofOfCommunity', desc: 'A May 2018 PoWH3D fork that rebranded the dividend token concept around community ownership. Same underlying Hourglass mechanics where all transaction fees are split among existing holders.', category: 'gambling', color: '#1e3a5f', contract: '0x1739e311ddbf1efdfbc39b74526fd8b600755ada', deployed: 'May 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  bitconnect_powh: { name: 'BitConnect Token', desc: 'Deployed June 2019, a PoWH3D clone that borrowed the BitConnect name a year and a half after the original lending platform collapsed. Standard dividend token mechanics; unrelated to the actual BitConnect project.', category: 'gambling', color: '#581c87', contract: '0xfcd3a0f5f416e407647a7518b90354946d316059', deployed: 'June 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  eightherbank: { name: 'Eightherbank', desc: 'A November 2019 PoWH3D fork with a banking theme. Uses the Hourglass dividend model with an isHuman modifier — smart contract wallets cannot withdraw.', category: 'gambling', color: '#581c87', contract: '0xc6e5e9c6f4f3d1667df6086e91637cc7c64a13eb', deployed: 'November 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  nexgen: { name: 'Nexgen', desc: 'Deployed June 2019, a PoWH3D clone that positioned itself as a next-generation dividend token. Identical Hourglass mechanics to P3D with 10% fees on buys and sells.', category: 'gambling', color: '#581c87', contract: '0xffd31e68bf7af89df862435a138615bd60abf574', deployed: 'June 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  diamonddividend: { name: 'DiamondDividend', desc: 'A November 2019 PoWH3D fork using diamond-themed branding for the standard Hourglass dividend model. Holders earn ETH from all future transaction fees proportional to their token balance.', category: 'gambling', color: '#581c87', contract: '0x84cc06eddb26575a7f0afd7ec2e3e98d31321397', deployed: 'November 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  e25: { name: 'E25 Booster', desc: 'Deployed February 2019, a PoWH3D clone with a modified fee structure hinted at by its "25" branding. Has an isHuman modifier — smart contract wallets cannot withdraw.', category: 'gambling', color: '#581c87', contract: '0xc3ad35d351b33783f27777e2ee1a4b6f96e4ee34', deployed: 'February 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  bitconnect2: { name: 'BitConnect v2', desc: 'The second in a series of BitConnect-themed PoWH3D clones, deployed June 2019. Reused the infamous brand name purely for attention; standard P3D dividend token under the hood.', category: 'gambling', color: '#581c87', contract: '0x568a693e1094b1e51e8053b2fc642da7161603f5', deployed: 'June 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  ethplatinum: { name: 'ETHPlatinum', desc: 'Deployed November 2021, one of the last PoWH3D clones ever created on Ethereum mainnet. By this point gas fees made the P3D dividend model largely impractical for small deposits.', category: 'gambling', color: '#581c87', contract: '0x510f9a9642ac14ded91629a1aad552be4b24b5f0', deployed: 'November 2021', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  divsnetwork: { name: 'DivsNetwork', desc: 'A July 2020 PoWH3D fork that framed itself as a dividend distribution network. Fully autonomous contract with no owner, running the same Hourglass token model as every other P3D clone.', category: 'gambling', color: '#581c87', contract: '0x26e6c899b5a5dc1d4874d828fda515a7eb7baf00', deployed: 'July 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  ethercenter: { name: 'EtherCenter', desc: 'Deployed July 2019, EtherCenter was a PoWH3D fork that added no meaningful features over the original. Standard 10% fee on every transaction, distributed pro rata to all token holders.', category: 'gambling', color: '#581c87', contract: '0x0e7c28fb8ed4f5f63aabd022deaeeba40ecc335c', deployed: 'July 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  redchip: { name: 'RedChip', desc: 'An October 2019 PoWH3D clone that borrowed stock market terminology — "red chip" refers to mainland China companies listed in Hong Kong. Standard Hourglass dividend mechanics beneath the branding.', category: 'gambling', color: '#581c87', contract: '0xcd2de0bd5347f617f832442ebcc1c23a4d618847', deployed: 'October 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  cxxmain: { name: 'CxxMain', desc: 'Deployed November 2019 with a cryptic name that may reference C++ programming. A PoWH3D fork with unmodified Hourglass contract code and the same fee-redistribution mechanics.', category: 'gambling', color: '#581c87', contract: '0xa4dce3845cb88a6fca0291d4eca9e5a96e75e2b4', deployed: 'November 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  familyonly: { name: 'FamilyOnlyToken', desc: 'An August 2020 PoWH3D fork with an invitation-only theme suggested by its name. Same Hourglass dividend model where ETH deposits mint tokens and every trade generates passive income for all holders.', category: 'gambling', color: '#581c87', contract: '0xbedde30d3532165843f07b1b0e3e90fddbb75918', deployed: 'August 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  spw: { name: 'SPW', desc: 'Deployed June 2020, SPW was a minimal PoWH3D clone with no discernible branding or website. Pure Hourglass dividend contract mechanics.', category: 'gambling', color: '#581c87', contract: '0x586f3d9e3524eb02448691b158fdcf5ffc2c57b0', deployed: 'June 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  ethdiamond: { name: 'ETHDIAMOND', desc: 'A July 2020 PoWH3D clone using diamond-hands imagery. Identical dividend token contract to P3D — buy and sell fees are pooled and shared among all token holders automatically.', category: 'gambling', color: '#581c87', contract: '0xca1cc76be1f5e5ee492859d8463653cb231991bc', deployed: 'July 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  ethershares: { name: 'Ethershares', desc: 'Deployed December 2018, Ethershares framed P3D-style token ownership as "shares" in an ETH revenue pool. Standard Hourglass mechanics with no technical differences from the original.', category: 'gambling', color: '#581c87', contract: '0x2c984ec9bb20b33deb84fbeedf20effda481fdc4', deployed: 'December 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  twelvehour: { name: 'TwelveHourToken', desc: 'An October 2018 PoWH3D fork, possibly named to suggest rapid dividend accumulation. Uses the same Hourglass contract where transaction fees are continuously redistributed to token holders.', category: 'gambling', color: '#581c87', contract: '0x8f6015289a64c48ccf258c21a999809fc553c3c4', deployed: 'October 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  neutrino81: { name: 'Neutrino81', desc: 'Deployed March 2019 with a physics-inspired name. A PoWH3D fork using the same autonomous dividend token contract — no owner, no admin keys, just the Hourglass buy/sell fee loop.', category: 'gambling', color: '#581c87', contract: '0x897d6c6772b85bf25b46c6f6da454133478ea6ab', deployed: 'March 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  hourglassx: { name: 'HourglassX', desc: 'A December 2018 PoWH3D fork that wore the "Hourglass" name openly — the original P3D contract was called Hourglass internally. Standard dividend mechanics with 10% transaction fees.', category: 'gambling', color: '#581c87', contract: '0x058a144951e062fc14f310057d2fd9ef0cf5095b', deployed: 'December 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  fairexchange: { name: 'FairExchange', desc: 'Deployed October 2018, FairExchange pitched the PoWH3D dividend model as a "fair" alternative to centralized exchanges. Under the surface, identical Hourglass contract code.', category: 'gambling', color: '#581c87', contract: '0xde2b11b71ad892ac3e47ce99d107788d65fe764e', deployed: 'October 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  pomda: { name: 'POMDA', desc: 'A June 2018 PoWH3D fork whose name likely riffs on "Proof of Mass Dividend Accumulation" or similar. Vanilla Hourglass contract — ETH in, tokens out, dividends from all activity.', category: 'gambling', color: '#581c87', contract: '0x0be5e8f107279cc2d9c3a537ed4ea669b45e443d', deployed: 'June 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  decentether: { name: 'DecentEther', desc: 'Deployed August 2020 during DeFi Summer, though it had nothing to do with DeFi — just another PoWH3D clone running the old Hourglass dividend model on a chain now dominated by Uniswap and Compound.', category: 'gambling', color: '#581c87', contract: '0x7d2d58d7add0b2d6e06fa85590b60da7741c18c9', deployed: 'August 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  bitconnect3: { name: 'BitConnect v3', desc: 'The third BitConnect-branded PoWH3D fork, deployed October 2019. By this point the BitConnect name was the subject of SEC enforcement actions, but clone deployers kept reusing it.', category: 'gambling', color: '#581c87', contract: '0x38e219ee67a5e1536c5a89fec2da0d69c254cac4', deployed: 'October 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  furious: { name: 'Furious', desc: 'A July 2020 PoWH3D clone with an aggressive name but stock-standard mechanics. Same autonomous Hourglass contract where buy/sell fees are distributed to all token holders in perpetuity.', category: 'gambling', color: '#581c87', contract: '0xb0c4382d4355cdfe94a132fadf92a509b1e25939', deployed: 'July 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  etherdiamond: { name: 'EtherDiamond', desc: 'Deployed July 2020, a sibling to ETHDIAMOND with nearly identical branding. Both are straight PoWH3D forks where token holders earn a cut of every future transaction.', category: 'gambling', color: '#581c87', contract: '0x4af078e47490c0e761a3de260952d9eb4a6ad693', deployed: 'July 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  powh_clone5: { name: 'Hourglass Clone E', desc: 'An October 2019 unnamed Hourglass fork — one of several unbranded P3D copies that were deployed with no website or community, just the raw contract on Ethereum.', category: 'gambling', color: '#581c87', contract: '0x12528042299e0fca4d44ae4f42359319b8901fa2', deployed: 'October 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  cryptosurge: { name: 'CryptoSurge', desc: 'Deployed October 2019 with a name evoking price surges. A PoWH3D fork using the proven Hourglass mechanics where buying tokens costs a 10% fee that goes straight to existing holders.', category: 'gambling', color: '#581c87', contract: '0x11e165dd03c63771004f929d58b75e4aaf2d1a23', deployed: 'October 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  hourglass_clone6: { name: 'Hourglass Clone F', desc: 'A November 2018 unbranded Hourglass contract. Deployed during the crypto winter bear market when ETH had fallen over 90% from its peak, yet P3D clones were still appearing.', category: 'gambling', color: '#581c87', contract: '0x77b541f90ecfa09f854209eefeca24c295050e2e', deployed: 'November 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  upower: { name: 'UPower', desc: 'Deployed July 2018, UPower was a PoWH3D fork from the summer of the P3D craze. Standard dividend token — deposit ETH, receive tokens, earn from every future transaction on the contract.', category: 'gambling', color: '#581c87', contract: '0x5044ac8da9601edf970dcc91a10c5f41c5c548c0', deployed: 'July 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  hourglass_clone7: { name: 'Hourglass Clone G', desc: 'A May 2018 unbranded Hourglass fork, one of the earliest nameless P3D copies. Deployed during the peak month of clone activity when dozens of identical contracts appeared on Ethereum.', category: 'gambling', color: '#581c87', contract: '0xaa4ec8484e89bed69570825688789589d38eea5e', deployed: 'May 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  redchip2: { name: 'RedChip v2', desc: 'The second iteration of RedChip, deployed October 2019 alongside its predecessor. Another PoWH3D fork with the same dividend token mechanics repackaged under a stock-market-inspired name.', category: 'gambling', color: '#581c87', contract: '0xae384c6e68f5d697d65ed43fd53ef5ea3288f536', deployed: 'October 2019', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  omnidex: { name: 'OmniDex', desc: 'Deployed August 2018, OmniDex distinguished itself with 18% dividends, masternodes, and 0% transfer fees — tweaking the standard P3D formula. Despite the "DEX" name, it was a dividend token, not an exchange.', category: 'gambling', color: '#581c87', contract: '0x433e631ac0c03e49ca034dbf5543964c80c6b391', deployed: 'August 2018', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  spw2: { name: 'SPW v2', desc: 'The second SPW contract, deployed September 2020. A relaunch of the original SPW using the same PoWH3D Hourglass mechanics with no apparent changes.', category: 'gambling', color: '#581c87', contract: '0xd446a13f9b9f8bcbc3ded73764d08735561b1638', deployed: 'September 2020', balanceAbi: 'function dividendsOf(address) view returns (uint256)', balanceArgs: (user) => [user], balanceCall: 'dividendsOf', withdrawAbi: 'function withdraw()', withdrawArgs: () => [], withdrawCall: 'withdraw', exitAbi: 'function exit()', exitArgs: () => [], exitCall: 'exit' },
  bounties: { name: 'Bounties Network', desc: 'was a decentralized bounty platform (December 2017) built by ConsenSys for open-source work and freelance tasks on Ethereum. Bounty issuers who never killed or fulfilled their bounties still have ETH locked in the StandardBounties v1 contract.', category: 'other', color: '#0369a1', contract: '0x2af47a65da8cd66729b4209c22017d6a5c2d2400', deployed: 'December 2017', balanceAbi: 'function getBounty(uint256) view returns (address, uint256, uint256, bool, uint256, uint256)', balanceArgs: (user) => [0], balanceCall: 'getBounty', balanceTransform: () => 0n, withdrawAbi: 'function killBounty(uint256 _bountyId)', withdrawArgs: (amount) => [0], withdrawCall: 'killBounty', noLiveBalance: true },
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
      + '<p class="project-desc"><b>' + esc(cfg.name) + '</b> ' + (cfg.desc || '') + '</p>'
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
function etherscanAddr(a) { return `https://etherscan.io/address/${a}`; }
function etherscanTx(h) { return `https://etherscan.io/tx/${h}`; }

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

  // ── Test Mode: simulate wallet connection without MetaMask ──
  if (TEST_MODE) {
    walletAddress = TEST_ADDRESS;
    walletProvider = 'test';
    walletSigner = 'test';

    document.getElementById('walletBtn').textContent = 'Disconnect';
    document.getElementById('walletBtn').classList.add('connected');
    document.getElementById('walletAddr').textContent = truncAddr(walletAddress) + ' [TEST]';
    document.getElementById('connectCta').style.display = 'none';

    const banner = document.getElementById('claimBanner');
    const rowsEl = document.getElementById('claimRows');
    rowsEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text2)"><div class="spinner" style="display:inline-block;width:24px;height:24px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:8px"></div><div id="scanProgress">Checking contracts... 0/' + Object.keys(EXCHANGES).length + '</div></div>';
    banner.classList.add('visible');

    try { await checkUserBalances(); } catch(e) { console.error('Balance check failed:', e); }
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
      rowsEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text2)"><div class="spinner" style="display:inline-block;width:24px;height:24px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:8px"></div><div id="scanProgress">Checking contracts... 0/' + Object.keys(EXCHANGES).length + '</div></div>';
      banner.classList.add('visible');
      try { await checkUserBalances(walletAddress); } catch(e) { console.error('Balance check failed:', e); }
    } else {
      // Show loading state while checking balances
      const banner = document.getElementById('claimBanner');
      const rowsEl = document.getElementById('claimRows');
      rowsEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text2)"><div class="spinner" style="display:inline-block;width:24px;height:24px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:8px"></div><div id="scanProgress">Checking contracts... 0/' + Object.keys(EXCHANGES).length + '</div></div>';
      banner.classList.add('visible');

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

  // ── Test Mode: return fake balances instantly ──
  if (TEST_MODE) {
    await _testCheckBalances();
    return;
  }

  window.va?.track?.('address_checked', { method: 'wallet' });
  logEvent('check', { address: walletAddress });

  const banner = document.getElementById('claimBanner');
  const rowsEl = document.getElementById('claimRows');
  let html = '';
  let hasBalance = false;

  // Fetch pre-computed balances from API (avoids loading full JSON)
  let apiBalances = {};
  let apiCoverage = {};
  try {
    const apiResp = await fetchCheck(checkAddr);
    if (apiResp.ok) {
      const apiData = await apiResp.json();
      apiBalances = apiData.balances || {};
      apiCoverage = apiData.coverage || {};
    }
  } catch (e) { console.warn('API check failed, falling back to RPC', e); }

  // Smart balance checking: trust API for high-coverage contracts, RPC only when needed
  // Coverage >= 95%: trust API result (skip RPC if no balance, verify onchain if balance > 0)
  // Coverage < 95% or missing: always check onchain via RPC
  const HIGH_COVERAGE_THRESHOLD = 95;
  let _checkedCount = 0;
  const _totalContracts = Object.keys(EXCHANGES).length;
  const _scanProgressEl = document.getElementById('scanProgress');
  const rpcChecks = Object.entries(EXCHANGES).map(async ([key, cfg]) => {
    try {
      const covPct = apiCoverage[key]?.coverage_pct ?? 0;
      const apiEntry = apiBalances[key];

      // noWalletCheck contracts (e.g. ENS): always use API only
      if (cfg.noWalletCheck) {
        if (apiEntry) {
          if (apiEntry.deeds) window._apiDeeds = apiEntry.deeds;
          return { key, balance: BigInt(apiEntry.balance_wei) };
        }
        return { key, balance: 0n };
      }

      // No API balance: skip RPC entirely (trust API as the source of truth)
      // This reduces RPC calls from ~110 to only the contracts with balance
      if (!apiEntry) {
        return { key, balance: 0n };
      }

      // HAS API balance: verify onchain to confirm it's still claimable
      try {
        const contract = new ethers.Contract(cfg.contract, [cfg.balanceAbi], walletProvider);
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
      if (_scanProgressEl) _scanProgressEl.textContent = 'Checking contracts... ' + _checkedCount + '/' + _totalContracts;
    }
  });
  const balanceResults = await Promise.all(rpcChecks);

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
                <span class="claim-card-tag" id="ensLookupStatus">${preDeeds ? 'Claimable' : 'Looking up...'}</span>
              </div>
              <div class="claim-card-meta">
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr('0x6090A6e47849629b7245Dfa1Ca21D94cd15878Ef')}" target="_blank" rel="noopener noreferrer">0x6090A6e47849629b7245Dfa1Ca21D94cd15878Ef</a></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Function</span><span class="claim-card-meta-value"><span style="color:var(--text1)">releaseDeed(bytes32 _hash)</span> <span style="opacity:0.5">—</span> returns deed ETH to owner</span></div>
              </div>
              <div id="ensDeedRows" style="padding:0 16px 14px"></div>
            </div>`;

          const renderDeeds = (deeds) => {
            const statusEl = document.getElementById('ensLookupStatus');
            const rowsEl = document.getElementById('ensDeedRows');
            if (!deeds || deeds.length === 0) {
              statusEl.textContent = '';
              rowsEl.innerHTML = `<div class="claim-details visible" style="margin-top:6px">
                No deeds found. Try <a href="https://reclaim.ens.domains" target="_blank" rel="noopener noreferrer">reclaim.ens.domains</a> or enter manually:
                <div style="margin-top:8px;display:flex;gap:6px;align-items:center">
                  <input type="text" id="ensManualHash" placeholder="Label or hash (e.g. vitalik)" style="flex:1;padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-family:inherit;background:var(--bg)">
                  <button class="claim-btn" data-action="ens-manual-release">Release</button>
                </div>
              </div>`;
              return;
            }
            statusEl.textContent = deeds.length + ' deed' + (deeds.length > 1 ? 's' : '');
            deeds.sort((a, b) => parseFloat(b.value_eth || ethers.formatEther(b.value)) - parseFloat(a.value_eth || ethers.formatEther(a.value)));
            window._ensDeeds = deeds;
            var SHOW_INITIAL = 10;
            var renderDeed = function(d, i) {
              var ethVal = d.value_eth || ethers.formatEther(d.value);
              var deedLabel = d.name ? esc(d.name) + '.eth' : 'Deed ' + (i+1);
              return '<div class="claim-row" style="margin-left:16px;border-left:2px solid var(--green)">' +
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
            deedHtml += '<div style="margin-top:8px;margin-left:16px;display:flex;gap:6px;align-items:center">' +
              '<input type="text" id="ensManualHash" placeholder="Another label or hash..." style="flex:1;padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-family:inherit;background:var(--bg)">' +
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
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 1</span><span class="claim-card-meta-value"><span style="color:var(--text1)">claim()</span> <span style="opacity:0.5">—</span> stakes NU tokens into escrow</span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 2</span><span class="claim-card-meta-value"><span style="color:var(--text1)">refund()</span> <span style="opacity:0.5">—</span> returns your deposited ETH</span></div>
              </div>
              ${stepInfo}
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
            stepInfo = `<div style="font-size:11px;color:var(--red);margin-top:4px">DGD tokens required to claim. Balance shows value from pre-computed data.</div>`;
          } else if (needsApproval) {
            actionBtn = `<button class="claim-btn" id="claimBtn-${key}" data-action="digix-approve" data-key="${key}">Step 1: Approve DGD</button><button class="claim-btn" disabled style="opacity:0.35">Step 2: Claim ETH</button>`;
            stepInfo = `<div style="font-size:11px;color:var(--text2);margin-top:4px">Burns ALL DGD at once.</div>`;
          } else {
            actionBtn = `<button class="claim-btn" disabled style="opacity:0.35">Step 1: Approved</button><button class="claim-btn" id="claimBtn-${key}" data-action="digix-burn" data-key="${key}">Step 2: Claim ETH</button>`;
            stepInfo = `<div style="font-size:11px;color:var(--green);margin-top:4px">DGD approved. Burns ALL DGD at once.</div>`;
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
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 1</span><span class="claim-card-meta-value"><span style="color:var(--text1)">approve(Acid, balance)</span> <span style="opacity:0.5">—</span> allow Acid contract to burn your DGD</span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 2</span><span class="claim-card-meta-value"><span style="color:var(--text1)">burn()</span> <span style="opacity:0.5">—</span> burns all DGD, returns ETH at 0.193 ETH/DGD</span></div>
              </div>
              ${stepInfo}
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
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 1</span><span class="claim-card-meta-value"><span style="color:var(--text1)">approveAndCall(NEU)</span> <span style="opacity:0.5">—</span> burns NEU, returns ETH-T in one tx</span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 2</span><span class="claim-card-meta-value"><span style="color:var(--text1)">withdraw(amount)</span> <span style="opacity:0.5">—</span> converts ETH-T to raw ETH</span></div>
                ${stepInfo}
              </div>
              <div class="claim-card-actions">
                ${actionBtn}
              </div>
              <div class="claim-card-status" id="claimStatus-${key}"></div>
            </div>`;
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
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 1</span><span class="claim-card-meta-value"><span style="color:var(--text1)">lockMe()</span> <span style="opacity:0.5">—</span> starts ${cfg.twoStep.lockDays}-day unlock timer</span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 2</span><span class="claim-card-meta-value"><span style="color:var(--text1)">withdraw(0x0, amount)</span> <span style="opacity:0.5">—</span> after timer expires</span></div>
              </div>
              ${stepInfo}
              <div class="claim-card-actions">
                ${actionBtn}
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
          html += `
            <div class="claim-card">
              <div class="claim-card-header">
                <span class="claim-card-name">${esc(cfg.name)}</span>
                <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
              </div>
              <div class="claim-card-meta" id="claimDetails-${key}">
                ${lastTx ? `<div class="claim-card-meta-row"><span class="claim-card-meta-label">Last tx</span><span class="claim-card-meta-value">${esc(lastTx.last_tx_date)} · <a href="${etherscanTx(lastTx.last_tx_hash)}" target="_blank" rel="noopener noreferrer">view tx</a></span></div>` : ''}
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr(cfg.contract)}" target="_blank" rel="noopener noreferrer">${cfg.contract}</a></span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Function</span><span class="claim-card-meta-value">${esc(funcSig)}${cfg.exitAbi ? ' / ' + cfg.exitAbi.replace('function ', '') : ''}${adoptionReqs ? ' / cancelAdoptionRequest(bytes5)' : ''}</span></div>
                <div class="claim-card-meta-row"><span class="claim-card-meta-label">Args</span><span class="claim-card-meta-value">${esc(argsDisplay)}</span></div>
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
  if (!hasBalance) {
    html = `<div class="no-balance-state">
      <div class="no-balance-check">&#10003;</div>
      <div class="no-balance-title">No unclaimed ETH found</div>
      <div class="no-balance-addr">${esc(checkAddr)}</div>
      <p style="font-size:12px">Checked ${Object.keys(EXCHANGES).length} contracts. Try other wallets from 2015-2020.</p>
    </div>`;
    document.getElementById('claimBannerTitle').textContent = 'Scan Complete';
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
    html = prefix + '<div class="claim-rows-list">' + html + '</div>' + mismatchNote;
    document.getElementById('claimBannerTitle').textContent = 'Claimable ETH Found';
    banner.classList.add('celebrate');
  }

  rowsEl.innerHTML = html;
  banner.classList.add('visible');

  // Disable withdraw buttons if address mismatch
  const isMismatchFinal = overrideAddress && overrideAddress.toLowerCase() !== walletAddress.toLowerCase();
  if (isMismatchFinal) {
    rowsEl.querySelectorAll('.claim-btn').forEach(btn => {
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
  btn.textContent = 'Confirming...';
  btn.classList.add('pending');
  statusEl.textContent = 'Confirm in wallet...';

  let tx = null;
  try {
    const contract = new ethers.Contract(cfg.contract, [cfg.withdrawAbi], walletSigner);
    const args = cfg.withdrawArgs(balance, walletAddress);
    const ethAmount = ethers.formatEther(balance);

    window.va?.track?.('claim_initiated', { exchange: cfg.name, amount_eth: ethAmount });

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
      </div>
      ${renderDonationCard(claimedEthNum)}`;
    showDonationCardDelayed();
    userBalances[key] = 0n;
  } catch (e) {
    if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
      btn.disabled = false;
      btn.textContent = 'Withdraw';
      btn.classList.remove('pending');
      statusEl.textContent = 'Rejected';
    } else if (tx && tx.hash) {
      // Tx was submitted but confirmation polling failed (e.g. RPC rate limit)
      btn.textContent = 'Submitted';
      btn.classList.remove('pending');
      btn.style.opacity = '0.7';
      statusEl.innerHTML = `Tx sent but confirmation timed out. Check status: <a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">${tx.hash.slice(0, 18)}...</a>`;
    } else {
      btn.disabled = false;
      btn.textContent = 'Withdraw';
      btn.classList.remove('pending');
      console.error('Claim error:', e);
      statusEl.textContent = 'Failed. Try again.';
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
    statusEl.innerHTML = `<div class="claim-recovered"><div class="claim-recovered-label">Recovered</div><div class="claim-recovered-amount">${fmtEth(ethAmount)} ETH${claimUsd}</div><div class="claim-recovered-tx"><a href="${etherscanTx(fakeTxHash)}" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div><div style="font-size:10px;color:var(--yellow);margin-top:2px">[TEST MODE]</div></div>${renderDonationCard(claimedEthNum)}`;
    showDonationCardDelayed();
    userBalances[key] = 0n;
    return;
  }

  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }
  if (!walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }

  btn.disabled = true; btn.textContent = 'Refunding...'; btn.classList.add('pending');
  try {
    const wc = new ethers.Contract(cfg.contract, ['function refund()'], walletSigner);
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
    statusEl.innerHTML = `<div class="claim-recovered"><div class="claim-recovered-label">Recovered</div><div class="claim-recovered-amount">${fmtEth(ethAmount)} ETH${claimUsd}</div><div class="claim-recovered-tx"><a href="${etherscanTx(tx.hash)}" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div></div>${renderDonationCard(claimedEthNum)}`;
    showDonationCardDelayed();
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

  // Test mode: simulate approval
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
      step2Btn.dataset.action = 'digix-burn';
      step2Btn.dataset.key = key;
    }
    statusEl.innerHTML = '<span style="color:var(--green)">Approved. Click Step 2 to burn DGD and claim ETH.</span>';
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

  // Test mode: simulate burn
  if (TEST_MODE) {
    btn.disabled = true;
    btn.textContent = 'Burning DGD...';
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
    ${renderDonationCard(claimedEthNum)}`;
    showDonationCardDelayed();
    userBalances[key] = 0n;
    return;
  }

  if (!await checkNetwork()) { showInlineError('networkWarn', 'Please switch to Ethereum Mainnet.', 0); document.getElementById('networkWarn').classList.add('visible'); return; }
  if (!walletSigner) { showInlineError('walletError', 'Please connect your wallet first.'); return; }

  btn.disabled = true;
  btn.textContent = 'Burning DGD...';
  btn.classList.add('pending');

  try {
    const acidContract = new ethers.Contract(cfg.digixBurn.acidContract, ['function burn()'], walletSigner);
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
      ${renderDonationCard(claimedEthNum)}`;
    showDonationCardDelayed();
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
      ${renderDonationCard(claimedEthNum)}`;
    showDonationCardDelayed();
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
    logEvent('claim_confirmed', { address: walletAddress, contract: key, tx_hash: tx.hash });
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
    logEvent('claim_confirmed', { address: walletAddress, contract: 'ens_old', amount_eth: parseFloat(ethAmount), tx_hash: tx.hash, block_num: receipt.blockNumber });

    btn.textContent = 'Done';
    btn.classList.remove('pending');
    btn.style.background = 'var(--green)';
    btn.style.opacity = '0.7';
    const claimUsd = _ethPrice ? ' (' + fmtUsd(claimedEthNum * _ethPrice) + ')' : '';
    statusEl.innerHTML = '<div class="claim-recovered">' +
      '<div class="claim-recovered-label">Released</div>' +
      '<div class="claim-recovered-amount">' + fmtEth(ethAmount) + ' ETH' + claimUsd + '</div>' +
      '<div class="claim-recovered-tx"><a href="' + etherscanTx(tx.hash) + '" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div>' +
    '</div>';
    // Track cumulative ENS claims — show donation only after all deeds or a large amount
    window._ensCumulativeEth = (window._ensCumulativeEth || 0) + claimedEthNum;
    var remainingDeeds = document.querySelectorAll('[data-action="claim-ens-deed"]:not([disabled])').length;
    if (remainingDeeds === 0 || window._ensCumulativeEth >= 10) {
      statusEl.innerHTML += renderDonationCard(window._ensCumulativeEth);
      showDonationCardDelayed();
      window._ensCumulativeEth = 0;
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
  } catch (e) {
    console.error('Deed verification failed:', e);
  }

  try {
    const sRegistrar = new ethers.Contract(ENS_REGISTRAR, ENS_REGISTRAR_ABI, walletSigner);
    const tx = await sRegistrar.releaseDeed(labelHash);
    window.va?.track?.('claim_submitted', { exchange: 'ENS Old Registrar', tx_hash: tx.hash });
    showInlineError('addrError', 'Transaction submitted: ' + tx.hash.slice(0, 22) + '... Waiting for confirmation...');
    var _addrEl = document.getElementById('addrError'); if (_addrEl) _addrEl.style.color = 'var(--text2)';
    await tx.wait();
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
if (window.ethereum) {
  window.ethereum.on('accountsChanged', async (accounts) => {
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
      walletSigner = await walletProvider.getSigner();
      walletAddress = await walletSigner.getAddress();
      document.getElementById('walletAddr').textContent = truncAddr(walletAddress);
      try { await checkUserBalances(); } catch(e) {}
    }
  });
  window.ethereum.on('chainChanged', () => {
    if (walletAddress) checkNetwork();
  });
}

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
  try {
    const result = await fetchTable(key);
    tabState[key].meta = result.meta;
    tabState[key].rows = result.rows;
    tabState[key].pagination = result.pagination;
  } catch(e) {
    document.getElementById('loading-' + key).innerHTML =
      `<p style="color:var(--text2)">Data not available yet for ${esc(cfg.name)}.<br>Run the scanner first, then reload.</p>`;
    return;
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
  const d = tabState[key].meta;
  if (!d) return;
  // Destroy previous chart instances to prevent memory leaks
  if (chartInstances['activity-' + key]) { chartInstances['activity-' + key].destroy(); delete chartInstances['activity-' + key]; }
  if (chartInstances['tvl-' + key]) { chartInstances['tvl-' + key].destroy(); delete chartInstances['tvl-' + key]; }
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? '#2e2b38' : '#edeae4';
  const textColor = isDark ? '#9590a6' : '#78716c';

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
    const endMonth = '2026-03';
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
          backgroundColor: '#7c3aed80',
          borderColor: '#7c3aed',
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
          backgroundColor: '#7c3aed80',
          borderColor: '#7c3aed',
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
    if (apiResp.ok) {
      const apiData = await apiResp.json();
      apiBalances = apiData.balances || {};
      apiCoverage = apiData.coverage || {};
    }
  } catch (e) { console.warn('API check failed, falling back to RPC', e); }

  const HIGH_COVERAGE_THRESHOLD = 95;
  let provider = null;
  let _manualChecked = 0;
  const _manualTotal = Object.keys(EXCHANGES).length;
  const _manualProgressEl = document.getElementById('scanProgress');

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
      const contract = new ethers.Contract(cfg.contract, [cfg.balanceAbi], provider);
      const result = await contract[cfg.balanceCall](...cfg.balanceArgs(addr));
      const balance = cfg.balanceTransform ? cfg.balanceTransform(result) : result;
      return { key, balance };
    } catch (e) {
      const apiEntry = apiBalances[key];
      if (apiEntry) return { key, balance: BigInt(apiEntry.balance_wei) };
      return { key, balance: 0n };
    } finally {
      _manualChecked++;
      if (_manualProgressEl) _manualProgressEl.textContent = 'Checking contracts... ' + _manualChecked + '/' + _manualTotal;
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
      html += '<div class="claim-card"><div class="claim-card-header"><span class="claim-card-name">' + esc(cfg.name) + mLastTxHtml + '</span><span class="claim-card-amount">' + fmtEth(ethAmount) + ' ETH</span><span class="claim-card-tag">Claimable</span></div></div>';
    }
  }

  return { found, totalEth, html, apiBalances };
}

async function checkManualAddress() {
  const rawInput = document.getElementById('manualAddrInput').value.trim();
  if (!rawInput) { showInlineError('addrError', 'Please enter an Ethereum address or ENS name.'); return; }

  // ── Test Mode: show fake results for any address ──
  if (TEST_MODE) {
    await _testCheckManualAddress(rawInput);
    return;
  }

  const banner = document.getElementById('claimBanner');
  const rowsEl = document.getElementById('claimRows');
  const ensResolvedEl = document.getElementById('ensResolved');

  rowsEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text2)"><div class="spinner" style="display:inline-block;width:24px;height:24px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:8px"></div><div>Resolving address...</div></div>';
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

  const resolvedAddrs = [addr];

  rowsEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text2)"><div class="spinner" style="display:inline-block;width:24px;height:24px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:8px"></div><div id="scanProgress">Checking contracts... 0/' + Object.keys(EXCHANGES).length + '</div></div>';

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
    finalHtml = '<div class="no-balance-state"><div class="no-balance-check">&#10003;</div><div class="no-balance-title">No unclaimed ETH found</div><div class="no-balance-addr">' + addrDisplay + '</div><p>Checked ' + Object.keys(EXCHANGES).length + ' contracts.</p><div class="no-balance-hint">Try other wallets from 2015-2020.</div></div>';
    document.getElementById('claimBannerTitle').textContent = 'Scan Complete';
  } else {
    const usdStr = ethPrice ? fmtUsd(grandTotalEth * ethPrice) : '';
    finalHtml = '<div class="claim-hero"><div class="claim-hero-amount">' + fmtEth(grandTotalEth) + ' ETH</div>' +
      (usdStr ? '<div class="claim-hero-usd">' + usdStr + '</div>' : '') +
      '<div class="claim-hero-contracts">' + grandFound + ' contract' + (grandFound > 1 ? 's' : '') + (resolvedAddrs.length > 1 ? ' across ' + resolvedAddrs.length + ' addresses' : '') + '</div></div>' +
      '<div class="claim-rows-list">' + allHtml + '</div>' +
      '<div style="text-align:center;margin-top:16px">' +
        '<button class="wallet-btn" data-action="connect-for-manual" style="padding:8px 18px;font-size:14px">Connect Wallet to Claim</button>' +
      '</div>';
    document.getElementById('claimBannerTitle').textContent = 'Claimable ETH Found';
    banner.classList.add('celebrate');
    logEvent('found', { address: resolvedAddrs[0], contracts_found: grandFound, total_eth: grandTotalEth });
    pendingManualAddress = resolvedAddrs[0];
  }

  // (watch button removed)

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
    await checkUserBalances(addrToCheck);
  } catch (e) {
    console.error('Wallet connection failed:', e);
    showInlineError('walletError', 'Failed to connect wallet: ' + (e.message || e.code || 'Unknown error'));
  }
}

// ─── Test Mode Helper Functions ───

function _testFakeTxHash() {
  const hex = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) hash += hex[Math.floor(Math.random() * 16)];
  return hash;
}

async function _testCheckBalances() {
  const banner = document.getElementById('claimBanner');
  const rowsEl = document.getElementById('claimRows');

  // Simulate a brief loading delay (feels realistic)
  await new Promise(r => setTimeout(r, 800));

  let html = '';
  let hasBalance = false;

  for (const [key, cfg] of Object.entries(EXCHANGES)) {
    const testData = TEST_BALANCES[key];
    const balance = testData ? testData.wei : 0n;
    userBalances[key] = balance;

    if (balance > 0n) {
      hasBalance = true;
      const ethAmount = ethers.formatEther(balance);

      if (cfg.digixBurn) {
        // 2-step: approve DGD → burn
        window._digixState = window._digixState || {};
        window._digixState[key] = { dgdBal: balance, dgdAllowance: 0n };
        html += `
          <div class="claim-card">
            <div class="claim-card-header">
              <span class="claim-card-name">${esc(cfg.name)}</span>
              <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
            </div>
            <div class="claim-card-meta" id="claimDetails-${key}">
              <div class="claim-card-meta-row"><span class="claim-card-meta-label">Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr(cfg.digixBurn.acidContract)}" target="_blank" rel="noopener noreferrer">${cfg.digixBurn.acidContract}</a></span></div>
              <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 1</span><span class="claim-card-meta-value"><span style="color:var(--text1)">approve(Acid, balance)</span> <span style="opacity:0.5">—</span> allow Acid contract to burn your DGD</span></div>
              <div class="claim-card-meta-row"><span class="claim-card-meta-label">Step 2</span><span class="claim-card-meta-value"><span style="color:var(--text1)">burn()</span> <span style="opacity:0.5">—</span> burns all DGD, returns ETH at 0.193 ETH/DGD</span></div>
            </div>
            <div style="font-size:11px;color:var(--text2);margin:4px 16px 0">Burns ALL DGD at once.</div>
            <div class="claim-card-actions">
              <button class="claim-btn" id="claimBtn-${key}" data-action="digix-approve" data-key="${key}">Step 1: Approve DGD</button><button class="claim-btn" disabled style="opacity:0.35">Step 2: Claim ETH</button>
            </div>
            <div class="claim-card-status" id="claimStatus-${key}"></div>
          </div>`;
      } else {
        const wArgs = cfg.withdrawArgs ? cfg.withdrawArgs(balance, walletAddress) : [];
        const argsDisplay = wArgs.length > 0 ? wArgs.map(a => typeof a === 'bigint' ? a.toString() + ' wei (' + ethers.formatEther(a) + ' ETH)' : String(a)).join(', ') : 'none';
        const funcSig = cfg.withdrawAbi ? cfg.withdrawAbi.replace('function ', '') : '';
        const exitBtn2 = cfg.exitAbi ? `<button class="claim-btn" id="exitBtn-${key}" data-action="claim-exit" data-key="${key}" style="background:var(--text2)">Exit (sell + withdraw)</button>` : '';
        html += `
          <div class="claim-card">
            <div class="claim-card-header">
              <span class="claim-card-name">${esc(cfg.name)}</span>
              <span class="claim-card-amount">${fmtEth(ethAmount)} ETH</span>
            </div>
            <div class="claim-card-meta" id="claimDetails-${key}">
              <div class="claim-card-meta-row"><span class="claim-card-meta-label">Contract</span><span class="claim-card-meta-value"><a href="${etherscanAddr(cfg.contract)}" target="_blank" rel="noopener noreferrer">${cfg.contract}</a></span></div>
              <div class="claim-card-meta-row"><span class="claim-card-meta-label">Function</span><span class="claim-card-meta-value">${esc(funcSig)}${cfg.exitAbi ? ' / ' + cfg.exitAbi.replace('function ', '') : ''}</span></div>
              <div class="claim-card-meta-row"><span class="claim-card-meta-label">Args</span><span class="claim-card-meta-value">${esc(argsDisplay)}</span></div>
            </div>
            <div class="claim-card-actions">
              <button class="claim-btn" id="claimBtn-${key}" data-action="claim-eth" data-key="${key}">Withdraw</button>${exitBtn2}
            </div>
            <div class="claim-card-status" id="claimStatus-${key}"></div>
          </div>`;
      }
    }
  }

  const ethPrice = await getEthPrice();
  if (hasBalance) {
    let totalEth = 0;
    for (const b of Object.values(userBalances)) { if (b > 0n) totalEth += parseFloat(ethers.formatEther(b)); }
    const usdStr = ethPrice ? fmtUsd(totalEth * ethPrice) : '';
    const claimCount = Object.values(userBalances).filter(b => b > 0n).length;
    const prefix = `<div class="claim-hero">
      <div class="claim-hero-amount">${fmtEth(totalEth)} ETH</div>
      ${usdStr ? '<div class="claim-hero-usd">' + usdStr + '</div>' : ''}
      <div class="claim-hero-contracts">${claimCount} contract${claimCount > 1 ? 's' : ''}</div>
    </div>`;
    html = prefix + '<div class="claim-rows-list">' + html + '</div>';
    document.getElementById('claimBannerTitle').textContent = 'Claimable ETH Found';
    banner.classList.add('celebrate');
  }

  rowsEl.innerHTML = html;
  banner.classList.add('visible');
}

async function _testClaimETH(key, cfg, btn, statusEl, balance) {
  const ethAmount = ethers.formatEther(balance);
  const fakeTxHash = _testFakeTxHash();

  btn.disabled = true;
  btn.textContent = 'Confirming...';
  btn.classList.add('pending');
  statusEl.textContent = 'Confirm in wallet...';

  // Simulate wallet confirmation delay
  await new Promise(r => setTimeout(r, 1200));

  btn.textContent = 'Pending...';
  statusEl.innerHTML = `Tx submitted: <a href="${etherscanTx(fakeTxHash)}" target="_blank" rel="noopener noreferrer">${fakeTxHash.slice(0, 18)}...</a>`;

  // Simulate block confirmation delay
  await new Promise(r => setTimeout(r, 2000));

  const fakeBlock = 19000000 + Math.floor(Math.random() * 500000);
  btn.textContent = 'Done';
  btn.classList.remove('pending');
  btn.style.background = 'var(--green)';
  btn.style.opacity = '0.7';
  const claimedEthNum = parseFloat(ethAmount);
  const claimUsd = _ethPrice ? ' (' + fmtUsd(claimedEthNum * _ethPrice) + ')' : '';
  statusEl.innerHTML = `<div class="claim-recovered">
      <div class="claim-recovered-label">Recovered</div>
      <div class="claim-recovered-amount">${fmtEth(ethAmount)} ETH${claimUsd}</div>
      <div class="claim-recovered-tx"><a href="${etherscanTx(fakeTxHash)}" target="_blank" rel="noopener noreferrer">View transaction on Etherscan</a></div>
      <div style="font-size:10px;color:var(--yellow);margin-top:2px">[TEST MODE]</div>
    </div>
    ${renderDonationCard(claimedEthNum)}`;
  showDonationCardDelayed();
  userBalances[key] = 0n;

  console.log('[TEST MODE] Simulated claim:', cfg.name, ethAmount, 'ETH, fake tx:', fakeTxHash);
}

async function _testCheckManualAddress(input) {
  const banner = document.getElementById('claimBanner');
  const rowsEl = document.getElementById('claimRows');
  rowsEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text2)"><div class="spinner" style="display:inline-block;width:24px;height:24px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:8px"></div><div>Scanning ' + Object.keys(EXCHANGES).length + ' contracts...</div></div>';
  banner.classList.add('visible');

  // Simulate loading delay
  await new Promise(r => setTimeout(r, 800));

  let html = '';
  let found = 0;

  for (const [key, cfg] of Object.entries(EXCHANGES)) {
    const testData = TEST_BALANCES[key];
    if (testData) {
      found++;
      html += '<div class="claim-card"><div class="claim-card-header"><span class="claim-card-name">' + esc(cfg.name) + '</span><span class="claim-card-amount">' + fmtEth(testData.eth) + ' ETH</span><span class="claim-card-tag">Claimable</span></div></div>';
    }
  }

  const ethPrice = await getEthPrice();
  let totalEth = Object.values(TEST_BALANCES).reduce((s, v) => s + parseFloat(v.eth), 0);
  const usdStr = ethPrice ? fmtUsd(totalEth * ethPrice) : '';
  html = '<div class="claim-hero"><div class="claim-hero-amount">' + fmtEth(totalEth) + ' ETH</div>' +
    (usdStr ? '<div class="claim-hero-usd">' + usdStr + '</div>' : '') +
    '<div class="claim-hero-contracts">' + found + ' contract' + (found > 1 ? 's' : '') + ' · Connect wallet to withdraw</div></div>' +
    '<div class="claim-rows-list">' + html + '</div>';
  document.getElementById('claimBannerTitle').textContent = 'Claimable ETH Found';
  banner.classList.add('celebrate');
  rowsEl.innerHTML = html;
}

// Lightweight init: fetch total first, then badge data for all tabs
(async () => {
  // Fetch pre-computed total immediately (single fast request)
  try {
    const totalResp = await fetch('/api/total');
    if (totalResp.ok) {
      const totalData = await totalResp.json();
      const totalEthVal = Math.round(totalData.total_eth);
      const contractCount = totalData.contract_count || Object.keys(EXCHANGES).length;
      // Counting animation for hero numbers
      const addressCount = totalData.address_count || 0;
      animateCount('totalAllEth', totalEthVal, '.hero-eth-value');
      animateCount('totalContracts', contractCount);
      if (addressCount) animateCount('totalAddresses', addressCount);
      getEthPrice(); // preload price for claim flow
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
  } else if (action === 'neufund-approve-and-unlock') {
    neufundApproveAndUnlock(btn.dataset.key);
  } else if (action === 'neufund-withdraw-etht') {
    neufundWithdrawEthT(btn.dataset.key);
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
    sendDonation(ethers.parseEther(val.toFixed(6)));
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
          rowsEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text2)"><div class="spinner" style="display:inline-block;width:24px;height:24px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:8px"></div><div>Scanning ' + Object.keys(EXCHANGES).length + ' contracts...</div></div>';
          banner.classList.add('visible');

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
document.getElementById('copyDonationBtn')?.addEventListener('click', function() {
  const addr = document.getElementById('footerDonationAddr')?.textContent;
  if (!addr) return;
  navigator.clipboard.writeText(addr).then(() => {
    const btn = this;
    btn.textContent = '✓ Copied!';
    btn.style.color = '#22c55e';
    btn.style.borderColor = '#22c55e';
    setTimeout(() => { btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'; btn.style.color = ''; btn.style.borderColor = ''; }, 2000);
  });
});
document.getElementById('footerDonationAddr')?.addEventListener('click', function() {
  document.getElementById('copyDonationBtn')?.click();
});

