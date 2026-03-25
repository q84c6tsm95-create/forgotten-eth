(function() {
  var toggle = document.getElementById('themeToggle');
  var html = document.documentElement;
  var saved = localStorage.getItem('theme');
  var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) html.setAttribute('data-theme', 'dark');
  function setToggleLabel(isDark) { toggle.innerHTML = isDark ? '<span style="font-size:18px">&#9728;</span> Light' : '<span style="font-size:18px">&#9789;</span> Dark'; }
  setToggleLabel(dark);
  toggle.addEventListener('click', function() {
    dark = !dark;
    if (dark) {
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
    setToggleLabel(dark);
    // Re-render charts for the active tab with updated theme colors
    var activeTab = document.querySelector('.tab.active');
    if (activeTab && typeof renderCharts === 'function') {
      renderCharts(activeTab.dataset.tab);
    }
  });
})();
