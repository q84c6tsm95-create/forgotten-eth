// Apply saved theme immediately to prevent flash of wrong theme
// This runs before body renders, so no DOM elements are needed
(function() {
  var saved = localStorage.getItem('theme');
  var dark = saved ? saved === 'dark' : true;
  if (dark) document.documentElement.setAttribute('data-theme', 'dark');
})();
