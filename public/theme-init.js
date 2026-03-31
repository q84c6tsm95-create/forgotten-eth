// Apply saved theme immediately to prevent flash of wrong theme
// This runs before body renders, so no DOM elements are needed
(function() {
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch(e) {}
  var dark = saved ? saved === 'dark' : false;
  if (dark) document.documentElement.setAttribute('data-theme', 'dark');
})();
