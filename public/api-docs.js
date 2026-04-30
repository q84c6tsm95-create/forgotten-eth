function colorizeJson(json) {
  var str = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
  str = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  str = str.replace(/"([^"]+)"(\s*:)/g, '<span class="json-key">"$1"</span>$2');
  str = str.replace(/:\s*"([^"]*?)"/g, function(m, v) { return ': <span class="json-string">"' + v + '"</span>'; });
  str = str.replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>');
  str = str.replace(/:\s*(true|false)/g, ': <span class="json-bool">$1</span>');
  str = str.replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
  return str;
}

function trySummary() {
  var el = document.getElementById('trySummaryResult');
  var out = document.getElementById('trySummaryOutput');
  var btn = document.getElementById('trySummaryBtn');
  el.style.display = 'block';
  btn.disabled = true;
  btn.textContent = '...';
  out.textContent = '';
  fetch('/api/summary')
    .then(function(r) { return r.json(); })
    .then(function(d) { out.innerHTML = colorizeJson(d); btn.disabled = false; btn.textContent = 'Try it'; })
    .catch(function(e) { out.textContent = 'Error: ' + e.message; btn.disabled = false; btn.textContent = 'Try it'; });
}

function tryTable() {
  var key = document.getElementById('tryExchange').value.trim().toLowerCase();
  if (!key) { alert('Enter a protocol key (e.g. etherdelta)'); return; }
  var el = document.getElementById('tryTableResult');
  var out = document.getElementById('tryTableOutput');
  var btn = document.getElementById('tryTableBtn');
  el.style.display = 'block';
  btn.disabled = true;
  btn.textContent = '...';
  out.textContent = '';
  fetch('/api/table?exchange=' + encodeURIComponent(key))
    .then(function(r) { return r.json(); })
    .then(function(d) { out.innerHTML = colorizeJson(d); btn.disabled = false; btn.textContent = 'Try it'; })
    .catch(function(e) { out.textContent = 'Error: ' + e.message; btn.disabled = false; btn.textContent = 'Try it'; });
}

function tryClaims() {
  var el = document.getElementById('tryClaimsResult');
  var out = document.getElementById('tryClaimsOutput');
  var btn = document.getElementById('tryClaimsBtn');
  el.style.display = 'block';
  btn.disabled = true;
  btn.textContent = '...';
  out.textContent = '';
  fetch('/api/claims')
    .then(function(r) { return r.json(); })
    .then(function(d) { out.innerHTML = colorizeJson(d); btn.disabled = false; btn.textContent = 'Try it'; })
    .catch(function(e) { out.textContent = 'Error: ' + e.message; btn.disabled = false; btn.textContent = 'Try it'; });
}

function switchTab(event, panelId) {
  var container = event.target.closest('.code-tabs');
  var buttons = container.querySelectorAll('.tab-btn');
  var panels = container.querySelectorAll('.tab-panel');
  for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove('active');
  for (var j = 0; j < panels.length; j++) panels[j].classList.remove('active');
  event.target.classList.add('active');
  document.getElementById(panelId).classList.add('active');
}

function copyCode(btn) {
  var block = btn.closest('.code-block');
  var pre = block ? block.querySelector('pre') : btn.parentElement;
  var text = pre.textContent || pre.innerText;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      showCopied(btn);
    }).catch(function() {
      fallbackCopy(text, btn);
    });
  } else {
    fallbackCopy(text, btn);
  }
}

function fallbackCopy(text, btn) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(ta);
  showCopied(btn);
}

function showCopied(btn) {
  btn.textContent = 'Copied';
  btn.classList.add('copied');
  setTimeout(function() {
    btn.textContent = 'Copy';
    btn.classList.remove('copied');
  }, 1500);
}

document.getElementById('trySummaryBtn').addEventListener('click', trySummary);
document.getElementById('tryTableBtn').addEventListener('click', tryTable);
document.getElementById('tryClaimsBtn').addEventListener('click', tryClaims);
document.getElementById('tryExchange').addEventListener('keydown', function(e) { if (e.key === 'Enter') tryTable(); });

document.querySelectorAll('.copy-btn').forEach(function(btn) {
  btn.addEventListener('click', function() { copyCode(btn); });
});

document.querySelectorAll('.tab-btn[data-tab]').forEach(function(btn) {
  btn.addEventListener('click', function(e) { switchTab(e, btn.dataset.tab); });
});

(function() {
  var links = document.querySelectorAll('.api-sidebar a[href^="#"]');
  if (!links.length) return;
  var sections = [];
  for (var i = 0; i < links.length; i++) {
    var id = links[i].getAttribute('href').slice(1);
    var el = document.getElementById(id);
    if (el) sections.push({ el: el, link: links[i] });
  }
  function onScroll() {
    var scrollY = window.scrollY + 80;
    var active = null;
    for (var i = sections.length - 1; i >= 0; i--) {
      if (sections[i].el.offsetTop <= scrollY) { active = sections[i]; break; }
    }
    for (var j = 0; j < sections.length; j++) sections[j].link.classList.remove('active');
    if (active) active.link.classList.add('active');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
