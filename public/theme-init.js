// Apply the saved / device colour mode before first paint (no flash).
// A plain file (not inline) so the CSP needs no script hash: script-src 'self'.
try {
  var m = localStorage.getItem('souschef_color_mode') ||
    (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.dataset.theme = m;
  var h = new Date().getHours();
  document.documentElement.dataset.sky = h >= 6 && h < 19 ? 'sun' : 'moon';
} catch { document.documentElement.dataset.theme = 'dark'; }
