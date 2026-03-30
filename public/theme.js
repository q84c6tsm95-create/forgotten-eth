(function() {
  var toggle = document.getElementById('themeToggle');
  var html = document.documentElement;
  var saved = localStorage.getItem('theme');
  var dark = saved ? saved === 'dark' : false;
  if (dark) html.setAttribute('data-theme', 'dark');
  function setToggleLabel(isDark) { toggle.textContent = isDark ? '☀ Wake' : '☾ Dream'; }
  setToggleLabel(dark);
  var transitioning = false;

  // Dream/wake pixelated dissolve transition (RPG Maker 2003 style)
  function dreamTransition(toDark, callback) {
    var canvas = document.createElement('canvas');
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = w; canvas.height = h;
    canvas.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;image-rendering:pixelated;';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    // Target color for the dissolve
    var r = toDark ? 10 : 250, g = toDark ? 10 : 249, b = toDark ? 18 : 247;

    // Create a grid of random-order pixel blocks that dissolve in
    var blockSize = 72;
    var cols = Math.ceil(w / blockSize), rows = Math.ceil(h / blockSize);
    var blocks = [];
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        blocks.push([x, y]);
      }
    }
    // Shuffle (Fisher-Yates)
    for (var i = blocks.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = blocks[i]; blocks[i] = blocks[j]; blocks[j] = tmp;
    }

    var total = blocks.length;
    var perFrame = Math.ceil(total / 40); // ~40 frames to fill (slower)
    var drawn = 0;
    var switched = false;

    ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';

    function drawStep() {
      var end = Math.min(drawn + perFrame, total);
      for (var i = drawn; i < end; i++) {
        ctx.fillRect(blocks[i][0] * blockSize, blocks[i][1] * blockSize, blockSize, blockSize);
      }
      drawn = end;

      // Switch theme at ~60% coverage
      if (!switched && drawn >= total * 0.6) {
        switched = true;
        callback();
      }

      if (drawn < total) {
        requestAnimationFrame(drawStep);
      } else {
        // Dissolve out: reverse with new theme visible underneath
        setTimeout(function() {
          var cleared = 0;
          function clearStep() {
            var end2 = Math.min(cleared + perFrame, total);
            for (var i = cleared; i < end2; i++) {
              ctx.clearRect(blocks[i][0] * blockSize, blocks[i][1] * blockSize, blockSize, blockSize);
            }
            cleared = end2;
            if (cleared < total) {
              requestAnimationFrame(clearStep);
            } else {
              canvas.remove();
              transitioning = false;
            }
          }
          clearStep();
        }, 80);
      }
    }
    requestAnimationFrame(drawStep);
  }

  toggle.addEventListener('click', function() {
    if (transitioning) return;
    transitioning = true;
    var goingDark = !dark;
    dreamTransition(goingDark, function() {
      dark = goingDark;
      if (dark) {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      }
      setToggleLabel(dark);
      var activeTab = document.querySelector('.tab.active');
      if (activeTab && typeof renderCharts === 'function') {
        renderCharts(activeTab.dataset.tab);
      }
    });
  });
})();
