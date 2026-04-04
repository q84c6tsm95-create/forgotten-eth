// Apply saved theme immediately to prevent flash of wrong theme
(function() {
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch(e) {}
  // Clean up old corrupt attribute from previous implementation
  try { localStorage.removeItem('corrupt'); } catch(e) {}
  document.documentElement.removeAttribute('data-corrupt');
  if (saved && saved !== 'light') document.documentElement.setAttribute('data-theme', saved);
})();
