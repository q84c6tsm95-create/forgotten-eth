// Test mode toggle — only on localhost
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  var isTest = localStorage.getItem('FORGOTTEN_ETH_DEV') === '1';
  var sep = document.getElementById('testModeSep');
  var btn = document.getElementById('testModeBtn');
  if (sep && btn) {
    sep.style.display = '';
    btn.style.display = '';
    btn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:12px;color:' + (isTest ? 'var(--accent)' : 'var(--text2)') + ';font-family:"JetBrains Mono",monospace;padding:0;line-height:1;transition:color 150ms ease';
    btn.textContent = isTest ? 'TEST ON' : 'TEST OFF';
    btn.title = 'Toggle test mode (simulates wallet + balances)';
    btn.onclick = function() {
      if (localStorage.getItem('FORGOTTEN_ETH_DEV') === '1') { localStorage.removeItem('FORGOTTEN_ETH_DEV'); }
      else { localStorage.setItem('FORGOTTEN_ETH_DEV', '1'); }
      location.reload();
    };
  }
}
