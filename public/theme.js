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
  function baseTheme() { return isDark() ? 'dark' : 'light'; }

  function setToggleLabel() { toggle.textContent = isDark() ? '☀ Wake' : '☾ Dream'; }
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
      var activeTab = document.querySelector('.tab.active');
      if (activeTab && typeof renderCharts === 'function') {
        renderCharts(activeTab.dataset.tab);
      }
    });
  });

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

        // Horizontal tear lines — random strips displaced with RGB split
        var strips = Math.floor(3 + intensity * 20);
        for (var i = 0; i < strips; i++) {
          var y = Math.random() * h;
          var stripH = 1 + Math.random() * (4 + intensity * 30);
          var offset = (Math.random() - 0.5) * intensity * 60;

          // RGB channel separation
          ctx.globalAlpha = 0.3 + intensity * 0.5;
          ctx.fillStyle = '#ff0066';
          ctx.fillRect(offset - 2, y, w, stripH);
          ctx.fillStyle = '#00ffff';
          ctx.fillRect(offset + 2, y + 1, w, stripH);
          ctx.fillStyle = '#00ff41';
          ctx.fillRect(offset, y - 1, w, stripH * 0.5);
        }

        // Random noise blocks
        var blocks = Math.floor(intensity * 40);
        for (var j = 0; j < blocks; j++) {
          var bx = Math.random() * w;
          var by = Math.random() * h;
          var bw = 4 + Math.random() * (20 + intensity * 80);
          var bh = 2 + Math.random() * (8 + intensity * 20);
          ctx.globalAlpha = 0.2 + Math.random() * 0.6;
          var colors = ['#ff0066', '#00ffff', '#00ff41', '#000', '#fff'];
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          ctx.fillRect(bx, by, bw, bh);
        }

        // Full screen flash near the middle
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
          // Dissolve out — quick fade
          var fadeFrame = 0;
          function fadeOut() {
            ctx.clearRect(0, 0, w, h);
            fadeFrame++;
            if (fadeFrame < 8) {
              // Residual noise fading
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

  // Corrupt toggle — switches between clean and corrupt variant
  if (corruptBtn) {
    corruptBtn.addEventListener('click', function() {
      if (transitioning) return;
      transitioning = true;
      corruptTransition(function() {
        if (isCorrupt()) {
          current = isDark() ? 'dark' : 'light';
        } else {
          current = isDark() ? 'corrupt-dark' : 'corrupt-light';
        }
        applyTheme(current);
        try { localStorage.setItem('theme', current); } catch(e) {}
        setToggleLabel();
        var activeTab = document.querySelector('.tab.active');
        if (activeTab && typeof renderCharts === 'function') {
          renderCharts(activeTab.dataset.tab);
        }
      });
    });
  }
})();
