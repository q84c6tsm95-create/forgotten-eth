(function() {
  var toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  var corruptBtn = document.getElementById('corruptToggle');
  var html = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch(e) {}

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

  toggle.addEventListener('click', function() {
    var goingDark = !isDark();
    if (isCorrupt()) {
      current = goingDark ? 'corrupt-dark' : 'corrupt-light';
    } else {
      current = goingDark ? 'dark' : 'light';
    }
    applyTheme(current);
    try { localStorage.setItem('theme', current); } catch(e) {}
    setToggleLabel();
  });

  if (corruptBtn) {
    corruptBtn.addEventListener('click', function() {
      var wasCorrupt = isCorrupt();
      if (wasCorrupt) {
        current = isDark() ? 'dark' : 'light';
      } else {
        current = isDark() ? 'corrupt-dark' : 'corrupt-light';
      }
      applyTheme(current);
      try { localStorage.setItem('theme', current); } catch(e) {}
      setToggleLabel();
      if (wasCorrupt) {
        if (window.stopCorruptCycle) window.stopCorruptCycle();
      } else {
        if (window.startCorruptCycle) setTimeout(window.startCorruptCycle, 100);
      }
    });
  }
})();
