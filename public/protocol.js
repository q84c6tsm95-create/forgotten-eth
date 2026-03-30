// Protocol subpage — theme, charts, wallet, address check
// Loaded externally to avoid 'unsafe-inline' in CSP

// Theme init (runs immediately)
(function(){var s=localStorage.getItem('theme');var d=s?s==='dark':true;if(d)document.documentElement.setAttribute('data-theme','dark')})();

// Load data from JSON data blocks
var __TVL = null, __ACT = null;
try { __TVL = JSON.parse(document.getElementById('tvl-data').textContent); } catch(e) {}
try { __ACT = JSON.parse(document.getElementById('act-data').textContent); } catch(e) {}

// Theme toggle + charts
(function() {
  var toggle = document.getElementById('themeToggle');
  var html = document.documentElement;
  var saved = localStorage.getItem('theme');
  var dark = saved ? saved === 'dark' : true;
  if (dark) html.setAttribute('data-theme', 'dark');
  function setLabel(d) { toggle.innerHTML = d ? '<span style="font-size:18px">&#9728;</span> Light' : '<span style="font-size:18px">&#9789;</span> Dark'; }
  setLabel(dark);
  toggle.addEventListener('click', function() {
    dark = !dark;
    if (dark) { html.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark'); }
    else { html.removeAttribute('data-theme'); localStorage.setItem('theme', 'light'); }
    setLabel(dark);
    renderCharts();
  });

  function renderCharts() {
    var isDark = html.getAttribute('data-theme') === 'dark';
    var gridColor = isDark ? '#2d2a3a' : '#e5e2db';
    var textColor = isDark ? '#7d7890' : '#6b6560';

    if (window._tvlChart) { window._tvlChart.destroy(); window._tvlChart = null; }
    if (window._actChart) { window._actChart.destroy(); window._actChart = null; }

    var xTickCallback = function(val, idx) {
      var label = this.getLabelForValue(idx);
      if (label.slice(5, 7) === '01') return label.slice(0, 4);
      return '';
    };

    if (__TVL && document.getElementById('tvlChart')) {
      var tvl = __TVL;
      var firstNonZero = tvl.findIndex(function(t){return t.balance_eth > 0});
      if (firstNonZero > 0) tvl = tvl.slice(firstNonZero - 1);

      window._tvlChart = new Chart(document.getElementById('tvlChart'), {
        type: 'bar',
        data: {
          labels: tvl.map(function(d){return d.month}),
          datasets: [{
            data: tvl.map(function(d){return d.balance_eth}),
            backgroundColor: '#0f766e80',
            borderColor: '#0f766e',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return ctx.raw.toLocaleString(undefined, {maximumFractionDigits:1}) + ' ETH'; } } } },
          scales: {
            x: { ticks: { color: textColor, font: { size: 11, weight: 'bold', family: "'JetBrains Mono', monospace" }, maxRotation: 0, callback: xTickCallback, autoSkip: false }, grid: { display: false } },
            y: { title: { display: true, text: 'ETH', color: textColor, font: { size: 11, weight: 'bold' } }, ticks: { color: textColor, font: { size: 10 }, callback: function(v) { return v >= 1000 ? (v/1000).toFixed(0) + 'k' : v; } }, grid: { color: gridColor } }
          }
        }
      });
    }
    if (__ACT && document.getElementById('actChart')) {
      var actMap = {};
      __ACT.forEach(function(a){ actMap[a.month] = a.tx_count; });
      var activity = [];
      var y = 2016, m = 1;
      while (true) {
        var k = y + '-' + String(m).padStart(2, '0');
        activity.push({ month: k, tx_count: actMap[k] || 0 });
        if (k === '2026-03') break;
        m++; if (m > 12) { m = 1; y++; }
      }

      window._actChart = new Chart(document.getElementById('actChart'), {
        type: 'bar',
        data: {
          labels: activity.map(function(d){return d.month}),
          datasets: [{
            data: activity.map(function(d){return d.tx_count}),
            backgroundColor: '#0f766e80',
            borderColor: '#0f766e',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return ctx.raw.toLocaleString() + ' transactions'; } } } },
          scales: {
            x: { ticks: { color: textColor, font: { size: 11, weight: 'bold', family: "'JetBrains Mono', monospace" }, maxRotation: 0, callback: xTickCallback, autoSkip: false }, grid: { display: false } },
            y: { title: { display: true, text: 'Transactions', color: textColor, font: { size: 11, weight: 'bold' } }, ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } }
          }
        }
      });
    }
  }

  if (typeof Chart !== 'undefined') renderCharts();
  else window.addEventListener('load', renderCharts);
})();

// Wallet connection
var walletAddress = null;
async function connectWallet() {
  if (!window.ethereum) { alert('No wallet detected. Install MetaMask or another Ethereum wallet.'); return; }
  var btn = document.getElementById('walletBtn');
  var addrEl = document.getElementById('walletAddr');
  try {
    var accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || !accounts.length) return;
    walletAddress = accounts[0].toLowerCase();
    addrEl.textContent = walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4);
    addrEl.style.display = '';
    btn.textContent = 'Disconnect';
    btn.classList.add('connected');
    btn.onclick = disconnectWallet;
    document.getElementById('checkAddr').value = walletAddress;
    checkAddress();
  } catch (e) {
    if (e.code !== 4001) console.error('Wallet connect error:', e);
  }
}

function disconnectWallet() {
  walletAddress = null;
  var btn = document.getElementById('walletBtn');
  var addrEl = document.getElementById('walletAddr');
  addrEl.style.display = 'none';
  btn.textContent = 'Connect Wallet';
  btn.classList.remove('connected');
  btn.onclick = connectWallet;
  document.getElementById('checkResult').innerHTML = '';
}

document.getElementById('walletBtn').addEventListener('click', function() {
  if (walletAddress) disconnectWallet(); else connectWallet();
});

// FAQ toggle
document.querySelectorAll('[data-faq-toggle]').forEach(function(el) {
  el.addEventListener('click', function() {
    this.closest('.faq-item').classList.toggle('open');
  });
});

// Address check
function checkAddress() {
  var input = document.getElementById('checkAddr');
  var addr = (input.value || '').trim().toLowerCase();
  var result = document.getElementById('checkResult');
  var btn = document.getElementById('checkBtn');

  if (!/^0x[0-9a-f]{40}$/.test(addr)) {
    result.innerHTML = '<span class="not-found">Please enter a valid Ethereum address.</span>';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Checking...';
  result.innerHTML = '';

  var thisKey = document.body.dataset.protocolKey;

  fetch('/api/check?address=' + addr)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      btn.disabled = false;
      btn.textContent = 'Check';

      var thisBalance = null;
      var otherCount = 0;
      var otherEth = 0;

      if (data.balances) {
        for (var k in data.balances) {
          var bal = parseFloat(data.balances[k].balance_eth || data.balances[k]);
          if (k === thisKey) {
            thisBalance = bal;
          } else if (bal > 0) {
            otherCount++;
            otherEth += bal;
          }
        }
      }

      var html = '';
      if (thisBalance && thisBalance > 0.0001) {
        html += '<div class="found">';
        html += '<strong style="color:var(--gold)">' + thisBalance.toFixed(4) + ' ETH</strong> found in this contract!';
        html += '<br><a href="/?address=' + encodeURIComponent(addr) + '" class="claim-cta">Go to claim page &rarr;</a>';
        html += '</div>';
      } else {
        html += '<span class="not-found">No balance found in this contract for this address.</span>';
      }

      if (otherCount > 0) {
        html += '<div class="others">';
        html += 'You also have <strong style="color:var(--accent-text)">' + otherEth.toFixed(4) + ' ETH</strong> stuck in <strong>' + otherCount + '</strong> other contract' + (otherCount > 1 ? 's' : '') + '.';
        html += '<br><a href="/?address=' + encodeURIComponent(addr) + '" class="others-cta">Check all contracts &rarr;</a>';
        html += '</div>';
      } else if (!thisBalance || thisBalance <= 0.0001) {
        html += '<div class="others">No balance here, but you might have ETH elsewhere.<br><a href="/?address=' + encodeURIComponent(addr) + '" class="others-cta">Check all contracts &rarr;</a></div>';
      }

      result.innerHTML = html;
    })
    .catch(function() {
      btn.disabled = false;
      btn.textContent = 'Check';
      result.innerHTML = '<span class="not-found">Error checking address. Try again.</span>';
    });
}

document.getElementById('checkAddr').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') checkAddress();
});
