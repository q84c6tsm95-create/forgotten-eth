// Inline text corruption engine — shared across all pages.
// Corrupts random visible words when a corrupt-* theme is active.
// Re-rolls every few seconds for a living glitch feel.
//
// API (global):
//   window.startCorruptCycle()  — begin corrupting text
//   window.stopCorruptCycle()   — restore all text, stop timer
//
// Self-starts on load if data-theme is already corrupt-*.
//
// Security note: innerHTML usage below is safe — all text values
// come from the page's own text nodes, escaped via esc(). Style
// attributes use only hardcoded color/font values. No user input
// enters this pipeline.

(function() {
  var _corrupted = []; // [{span, original, parent}]

  // Unicode lookalikes
  var _u = {
    a:'\u0430',e:'\u0435',o:'\u043e',c:'\u0441',p:'\u0440',
    x:'\u0445',y:'\u0443',A:'\u0410',E:'\u0415',O:'\u041e',
    C:'\u0421',T:'\u0422',H:'\u041d',B:'\u0412',M:'\u041c',
    K:'\u041a',P:'\u0420',i:'\u0456',s:'\u0455',d:'\u0501',
    n:'\u0578',r:'\u0433',t:'\u03c4',g:'\u0581',h:'\u04bb',
    w:'\u0461',u:'\u057d',f:'\u0192'
  };

  // Zalgo combining chars
  var _zU = ['\u0300','\u0301','\u0302','\u0303','\u0304','\u0306','\u0307','\u0308','\u030b','\u030c','\u030f','\u0311','\u0313','\u0314','\u033d','\u033e','\u033f','\u0342','\u0344','\u034a','\u034b','\u034c'];
  var _zD = ['\u0316','\u0317','\u0318','\u0319','\u031c','\u031d','\u031e','\u0320','\u0323','\u0324','\u0325','\u0326','\u0327','\u0328','\u0329','\u032d','\u032e','\u0330','\u0331','\u0332','\u0339','\u033a','\u033b','\u033c'];

  // Block glyphs
  var _gl = [
    '\u2591\u2592\u2593\u2588','\u2580\u2584\u2588\u2591','\u2596\u2597\u2598\u2599',
    '\u25a0\u25a1\u25aa\u25ab','\u2560\u2563\u2566\u2569','\u256c\u2551\u2550\u256b'
  ];

  var _fonts = [
    "'Courier New',monospace","'Times New Roman',serif","cursive",
    "'Papyrus',fantasy","'Impact',sans-serif","Georgia,serif"
  ];
  var _colors = ['#ff0066','#00ffff','#00ff41','#ffcc00','#ff3333','#ff8833','#cc00ff'];

  function rng(n) { return Math.floor(Math.random() * n); }
  function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function zalgo(w) {
    var o = '';
    for (var i = 0; i < w.length; i++) {
      o += w[i];
      for (var j = 0, u = 1+rng(3); j < u; j++) o += _zU[rng(_zU.length)];
      for (var k = 0, d = 1+rng(2); k < d; k++) o += _zD[rng(_zD.length)];
    }
    return o;
  }
  function uniSwap(w) {
    var o = '';
    for (var i = 0; i < w.length; i++) o += _u[w[i]] || w[i];
    return o;
  }
  function glyphs(w) {
    var s = _gl[rng(_gl.length)], o = '';
    for (var i = 0; i < Math.min(w.length, 6); i++) o += s[rng(s.length)];
    return o;
  }

  // Elements to never corrupt
  var _skipTag = {SCRIPT:1,STYLE:1,TEXTAREA:1,INPUT:1,SELECT:1,OPTION:1,CODE:1,PRE:1,NOSCRIPT:1,SVG:1,CANVAS:1};

  function shouldSkip(node) {
    var el = node.parentElement;
    while (el) {
      if (_skipTag[el.tagName]) return true;
      if (el.tagName === 'BUTTON') return true;
      if (el.classList && (
        el.classList.contains('hero-amount') ||
        el.classList.contains('claim-btn') ||
        el.classList.contains('btn') ||
        el.classList.contains('connect-input') ||
        el.classList.contains('_corrupt-text') ||
        el.classList.contains('json-response') ||
        el.classList.contains('json-key') ||
        el.classList.contains('json-string')
      )) return true;
      if (el.id === 'manualAddrInput' || el.id === 'walletAddr' ||
          el.id === 'totalAllEth' || el.id === 'totalContracts' ||
          el.id === 'heroBlocks' || el.id === 'heroPct' || el.id === 'heroCounter') return true;
      el = el.parentElement;
    }
    return false;
  }

  function corruptTexts() {
    restoreTexts();
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    while (walker.nextNode()) {
      var n = walker.currentNode;
      if (n.textContent.trim().length > 2 && !shouldSkip(n)) nodes.push(n);
    }

    var rate = 0.15 + Math.random() * 0.08; // 15-23%

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var text = node.textContent;
      var parts = text.split(/(\s+)/);
      var hit = false;
      var pieces = [];

      for (var p = 0; p < parts.length; p++) {
        var word = parts[p];
        if (/^\s*$/.test(word) || word.length < 2 || Math.random() > rate) {
          pieces.push({ type: 'text', val: word });
          continue;
        }
        hit = true;
        var m = rng(8);
        if (m === 0) pieces.push({ type: 'text', val: zalgo(word) });
        else if (m === 1) pieces.push({ type: 'text', val: uniSwap(word) });
        else if (m === 2) pieces.push({ type: 'text', val: glyphs(word) });
        else if (m === 3) pieces.push({ type: 'span', val: word, style: 'color:'+_colors[rng(_colors.length)]+';text-shadow:0 0 6px currentColor' });
        else if (m === 4) pieces.push({ type: 'span', val: word, style: 'font-family:'+_fonts[rng(_fonts.length)]+';font-size:'+(88+rng(30))+'%' });
        else if (m === 5) pieces.push({ type: 'span', val: word, style: 'color:'+_colors[rng(_colors.length)]+';display:inline-block;transform:skewX('+(-5+rng(10))+'deg) translateY('+(-2+rng(4))+'px);text-shadow:0 0 8px currentColor' });
        else if (m === 6) pieces.push({ type: 'span', val: word, style: 'background:'+_colors[rng(_colors.length)]+';color:#000;padding:0 2px;font-weight:800' });
        else pieces.push({ type: 'span', val: word, style: 'letter-spacing:'+(2+rng(6))+'px;color:'+_colors[rng(_colors.length)] });
      }

      if (!hit) continue;

      // Build DOM fragment (no innerHTML)
      var wrapper = document.createElement('span');
      wrapper.className = '_corrupt-text';
      for (var q = 0; q < pieces.length; q++) {
        var pc = pieces[q];
        if (pc.type === 'text') {
          wrapper.appendChild(document.createTextNode(pc.val));
        } else {
          var s = document.createElement('span');
          s.setAttribute('style', pc.style);
          s.textContent = pc.val;
          wrapper.appendChild(s);
        }
      }

      _corrupted.push({ original: text, parent: node.parentNode, span: wrapper });
      node.parentNode.replaceChild(wrapper, node);
    }
  }

  function restoreTexts() {
    for (var i = _corrupted.length - 1; i >= 0; i--) {
      var e = _corrupted[i];
      if (e.span.parentNode) {
        e.span.parentNode.replaceChild(document.createTextNode(e.original), e.span);
      }
    }
    _corrupted = [];
  }

  // Inject reroll animation styles once
  var _styleInjected = false;
  function injectStyles() {
    if (_styleInjected) return;
    _styleInjected = true;
    var st = document.createElement('style');
    st.textContent = [
      '@keyframes _corruptFlash{',
      '  0%{opacity:1;filter:none}',
      '  15%{opacity:0.7;filter:hue-rotate(90deg) saturate(3)}',
      '  30%{opacity:0.85;filter:hue-rotate(-60deg) saturate(2)}',
      '  50%{opacity:0.6;filter:hue-rotate(180deg) brightness(1.3)}',
      '  70%{opacity:0.9;filter:hue-rotate(-30deg)}',
      '  100%{opacity:1;filter:none}',
      '}',
      '@keyframes _corruptWordIn{',
      '  0%{opacity:0;transform:translateX(-2px) skewX(-4deg)}',
      '  40%{opacity:1;transform:translateX(1px) skewX(2deg)}',
      '  100%{opacity:1;transform:none}',
      '}',
      '._corrupt-reroll{animation:_corruptFlash 250ms ease-out}',
      '._corrupt-text>span{animation:_corruptWordIn 300ms ease-out}'
    ].join('');
    document.head.appendChild(st);
  }

  // Brief glitch flash, then re-roll
  function rerollWithFlash() {
    injectStyles();
    document.body.classList.add('_corrupt-reroll');
    // Tear line: brief horizontal offset on container
    var container = document.querySelector('.container');
    if (container) container.style.transform = 'translateX(' + (-3 + rng(6)) + 'px)';
    setTimeout(function() {
      corruptTexts();
      if (container) container.style.transform = '';
      setTimeout(function() {
        document.body.classList.remove('_corrupt-reroll');
      }, 250);
    }, 120);
  }

  var _timer = null;

  function start() {
    stop();
    injectStyles();
    corruptTexts();
    _timer = setInterval(function() {
      var t = document.documentElement.getAttribute('data-theme') || '';
      if (t.indexOf('corrupt') === -1) { stop(); return; }
      rerollWithFlash();
    }, 8000 + rng(6000)); // 8-14s random interval
  }

  function stop() {
    if (_timer) { clearInterval(_timer); _timer = null; }
    restoreTexts();
  }

  // Expose globally so theme toggles can call them
  window.startCorruptCycle = start;
  window.stopCorruptCycle = stop;

  // Self-start if page loads in corrupt mode
  var theme = document.documentElement.getAttribute('data-theme') || '';
  if (theme.indexOf('corrupt') !== -1) {
    setTimeout(start, 500);
  }
})();
