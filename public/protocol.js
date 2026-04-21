// Protocol subpage — theme, charts, wallet, address check
// Loaded externally to avoid 'unsafe-inline' in CSP

// Load data from JSON data blocks
var __TVL = null, __ACT = null;
try { __TVL = JSON.parse(document.getElementById('tvl-data').textContent); } catch(e) {}
try { __ACT = JSON.parse(document.getElementById('act-data').textContent); } catch(e) {}

// Theme toggle + charts (mirrors theme.js from main page)
(function() {
  var toggle = document.getElementById('themeToggle');
  var corruptBtn = document.getElementById('corruptToggle');
  var html = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch(e) {}

  // Possible themes: light, dark, corrupt-light, corrupt-dark
  var current = saved || 'light';
  var validThemes = ['light', 'dark', 'corrupt-light', 'corrupt-dark'];
  if (validThemes.indexOf(current) === -1) current = 'light';

  function applyTheme(t) {
    if (t === 'light') html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', t);
  }
  applyTheme(current);

  function isCorrupt() { return current === 'corrupt-light' || current === 'corrupt-dark'; }
  function isDark() { return current === 'dark' || current === 'corrupt-dark'; }

  function setToggleLabel() { toggle.textContent = isDark() ? '\u2600 Wake' : '\u263E Dream'; }
  setToggleLabel();

  var transitioning = false;

  // Dream/wake pixelated dissolve transition (RPG Maker 2003 style)
  function dreamTransition(toDark, callback) {
    var canvas = document.createElement('canvas');
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = w; canvas.height = h;
    canvas.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;image-rendering:pixelated;';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var timeout = setTimeout(function() {
      try { canvas.remove(); } catch(_) {}
      transitioning = false;
    }, 3000);

    var r = toDark ? 10 : 250, g = toDark ? 10 : 249, b = toDark ? 18 : 247;
    var blockSize = 72;
    var cols = Math.ceil(w / blockSize), rows = Math.ceil(h / blockSize);
    var blocks = [];
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        blocks.push([x, y]);
      }
    }
    for (var i = blocks.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = blocks[i]; blocks[i] = blocks[j]; blocks[j] = tmp;
    }

    var total = blocks.length;
    var perFrame = Math.ceil(total / 40);
    var drawn = 0;
    var switched = false;

    ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';

    function drawStep() {
      try {
        var end = Math.min(drawn + perFrame, total);
        for (var i = drawn; i < end; i++) {
          ctx.fillRect(blocks[i][0] * blockSize, blocks[i][1] * blockSize, blockSize, blockSize);
        }
        drawn = end;
        if (!switched && drawn >= total * 0.6) {
          switched = true;
          callback();
        }
        if (drawn < total) {
          requestAnimationFrame(drawStep);
        } else {
          setTimeout(function() {
            var cleared = 0;
            function clearStep() {
              try {
                var end2 = Math.min(cleared + perFrame, total);
                for (var i = cleared; i < end2; i++) {
                  ctx.clearRect(blocks[i][0] * blockSize, blocks[i][1] * blockSize, blockSize, blockSize);
                }
                cleared = end2;
                if (cleared < total) requestAnimationFrame(clearStep);
                else { clearTimeout(timeout); canvas.remove(); transitioning = false; }
              } catch(_) { clearTimeout(timeout); try { canvas.remove(); } catch(_) {} transitioning = false; }
            }
            clearStep();
          }, 80);
        }
      } catch(_) { clearTimeout(timeout); if (!switched) callback(); try { canvas.remove(); } catch(_) {} transitioning = false; }
    }
    requestAnimationFrame(drawStep);
  }

  // Corruption transition — signal breakup with RGB tears and noise
  function corruptTransition(callback) {
    var canvas = document.createElement('canvas');
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = w; canvas.height = h;
    canvas.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;image-rendering:pixelated;';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var timeout = setTimeout(function() {
      try { canvas.remove(); } catch(_) {}
      transitioning = false;
    }, 2000);

    var frame = 0;
    var totalFrames = 35;
    var switched = false;

    function glitchFrame() {
      try {
        ctx.clearRect(0, 0, w, h);
        var intensity = frame / totalFrames;

        var strips = Math.floor(3 + intensity * 20);
        for (var i = 0; i < strips; i++) {
          var y = Math.random() * h;
          var stripH = 1 + Math.random() * (4 + intensity * 30);
          var offset = (Math.random() - 0.5) * intensity * 60;
          ctx.globalAlpha = 0.3 + intensity * 0.5;
          ctx.fillStyle = '#ff0066';
          ctx.fillRect(offset - 2, y, w, stripH);
          ctx.fillStyle = '#00ffff';
          ctx.fillRect(offset + 2, y + 1, w, stripH);
          ctx.fillStyle = '#00ff41';
          ctx.fillRect(offset, y - 1, w, stripH * 0.5);
        }

        var noiseBlocks = Math.floor(intensity * 40);
        for (var j = 0; j < noiseBlocks; j++) {
          var bx = Math.random() * w;
          var by = Math.random() * h;
          var bw = 4 + Math.random() * (20 + intensity * 80);
          var bh = 2 + Math.random() * (8 + intensity * 20);
          ctx.globalAlpha = 0.2 + Math.random() * 0.6;
          var colors = ['#ff0066', '#00ffff', '#00ff41', '#000', '#fff'];
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          ctx.fillRect(bx, by, bw, bh);
        }

        if (frame > totalFrames * 0.4 && frame < totalFrames * 0.6 && Math.random() > 0.5) {
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = Math.random() > 0.5 ? '#ff0066' : '#00ffff';
          ctx.fillRect(0, 0, w, h);
        }

        ctx.globalAlpha = 1;

        if (!switched && frame >= totalFrames * 0.5) {
          switched = true;
          callback();
        }

        frame++;
        if (frame < totalFrames) {
          requestAnimationFrame(glitchFrame);
        } else {
          var fadeFrame = 0;
          function fadeOut() {
            ctx.clearRect(0, 0, w, h);
            fadeFrame++;
            if (fadeFrame < 8) {
              var remaining = Math.floor((8 - fadeFrame) * 3);
              for (var k = 0; k < remaining; k++) {
                ctx.globalAlpha = (8 - fadeFrame) / 16;
                ctx.fillStyle = ['#ff0066', '#00ffff', '#00ff41'][Math.floor(Math.random() * 3)];
                ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 40, 1 + Math.random() * 4);
              }
              ctx.globalAlpha = 1;
              requestAnimationFrame(fadeOut);
            } else {
              clearTimeout(timeout);
              canvas.remove();
              transitioning = false;
            }
          }
          fadeOut();
        }
      } catch(_) {
        clearTimeout(timeout);
        if (!switched) callback();
        try { canvas.remove(); } catch(_) {}
        transitioning = false;
      }
    }
    requestAnimationFrame(glitchFrame);
  }

  // Dream/Wake toggle — switches base theme, preserves corrupt state
  toggle.addEventListener('click', function() {
    if (transitioning) return;
    transitioning = true;
    var goingDark = !isDark();
    dreamTransition(goingDark, function() {
      if (isCorrupt()) {
        current = goingDark ? 'corrupt-dark' : 'corrupt-light';
      } else {
        current = goingDark ? 'dark' : 'light';
      }
      applyTheme(current);
      try { localStorage.setItem('theme', current); } catch(e) {}
      setToggleLabel();
      renderCharts();
    });
  });

  // Corrupt toggle — switches between clean and corrupt variant
  // Text corruption engine lives in /corrupt.js (shared across all pages)
  if (corruptBtn) {
    corruptBtn.addEventListener('click', function() {
      if (transitioning) return;
      transitioning = true;
      var wasCorrupt = isCorrupt();
      corruptTransition(function() {
        if (wasCorrupt) {
          current = isDark() ? 'dark' : 'light';
          if (window.stopCorruptCycle) window.stopCorruptCycle();
        } else {
          current = isDark() ? 'corrupt-dark' : 'corrupt-light';
          if (window.startCorruptCycle) setTimeout(window.startCorruptCycle, 300);
        }
        applyTheme(current);
        try { localStorage.setItem('theme', current); } catch(e) {}
        setToggleLabel();
        renderCharts();
      });
    });
  }

  function renderCharts() {
    var theme = html.getAttribute('data-theme') || 'light';
    var isDarkMode = theme === 'dark' || theme === 'corrupt-dark';
    var gridColor = isDarkMode ? '#2d2a3a' : '#e5e2db';
    var textColor = isDarkMode ? '#7d7890' : '#6b6560';

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
      var yr = 2016, mo = 1;
      while (true) {
        var k = yr + '-' + String(mo).padStart(2, '0');
        activity.push({ month: k, tx_count: actMap[k] || 0 });
        var _now = new Date(); if (k === _now.getFullYear() + '-' + String(_now.getMonth() + 1).padStart(2, '0')) break;
        mo++; if (mo > 12) { mo = 1; yr++; }
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

// FAQ toggle (keyboard + ARIA state)
document.querySelectorAll('[data-faq-toggle]').forEach(function(el) {
  function toggle() {
    var isOpen = el.closest('.faq-item').classList.toggle('open');
    el.setAttribute('aria-expanded', String(isOpen));
  }
  el.addEventListener('click', toggle);
  el.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });
});

// Address check — builds result HTML from validated, API-returned data only
function checkAddress() {
  var input = document.getElementById('checkAddr');
  var addr = (input.value || '').trim().toLowerCase();
  var result = document.getElementById('checkResult');
  var btn = document.getElementById('checkBtn');

  // Strict hex address validation — only 0x + 40 hex chars allowed
  if (!/^0x[0-9a-f]{40}$/.test(addr)) {
    result.textContent = 'Please enter a valid Ethereum address.';
    result.className = 'check-result';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Checking...';
  result.textContent = '';

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

      // Build result DOM safely
      while (result.firstChild) result.removeChild(result.firstChild);

      if (thisBalance && thisBalance > 0.0001) {
        var foundDiv = document.createElement('div');
        foundDiv.className = 'found';
        var strong = document.createElement('strong');
        strong.style.color = 'var(--gold)';
        strong.textContent = thisBalance.toFixed(4) + ' ETH';
        foundDiv.appendChild(strong);
        var protoName = document.body.dataset.protocolName || 'this contract';
        foundDiv.appendChild(document.createTextNode(' found in ' + protoName + '!'));
        foundDiv.appendChild(document.createElement('br'));
        var claimLink = document.createElement('a');
        claimLink.href = '/?address=' + encodeURIComponent(addr) + '#' + thisKey;
        claimLink.className = 'claim-cta';
        claimLink.textContent = 'Claim now \u2192';
        foundDiv.appendChild(claimLink);
        result.appendChild(foundDiv);
      } else {
        var notFound = document.createElement('span');
        notFound.className = 'not-found';
        var protoName2 = document.body.dataset.protocolName || 'this contract';
        notFound.textContent = 'No balance found in ' + protoName2 + ' for this address.';
        result.appendChild(notFound);
      }

      if (otherCount > 0) {
        var othersDiv = document.createElement('div');
        othersDiv.className = 'others';
        var otherStrong = document.createElement('strong');
        otherStrong.style.color = 'var(--accent-text)';
        otherStrong.textContent = otherEth.toFixed(4) + ' ETH';
        othersDiv.appendChild(document.createTextNode('You also have '));
        othersDiv.appendChild(otherStrong);
        var countStrong = document.createElement('strong');
        countStrong.textContent = String(otherCount);
        othersDiv.appendChild(document.createTextNode(' stuck in '));
        othersDiv.appendChild(countStrong);
        othersDiv.appendChild(document.createTextNode(' other contract' + (otherCount > 1 ? 's' : '') + '.'));
        othersDiv.appendChild(document.createElement('br'));
        var otherLink = document.createElement('a');
        otherLink.href = '/?address=' + encodeURIComponent(addr);
        otherLink.className = 'others-cta';
        otherLink.textContent = 'Check all contracts \u2192';
        othersDiv.appendChild(otherLink);
        result.appendChild(othersDiv);
      } else if (!thisBalance || thisBalance <= 0.0001) {
        var elseDiv = document.createElement('div');
        elseDiv.className = 'others';
        elseDiv.appendChild(document.createTextNode('No balance here, but you might have ETH elsewhere.'));
        elseDiv.appendChild(document.createElement('br'));
        var elseLink = document.createElement('a');
        elseLink.href = '/?address=' + encodeURIComponent(addr);
        elseLink.className = 'others-cta';
        elseLink.textContent = 'Check all contracts \u2192';
        elseDiv.appendChild(elseLink);
        result.appendChild(elseDiv);
      }
    })
    .catch(function() {
      btn.disabled = false;
      btn.textContent = 'Check';
      result.textContent = 'Error checking address. Try again.';
    });
}

document.getElementById('checkAddr').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') checkAddress();
});
document.getElementById('checkBtn').addEventListener('click', checkAddress);
