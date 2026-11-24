// Apply the saved / device colour mode before first paint (no flash).
// A plain file (not inline) so the CSP needs no script hash: script-src 'self'.
try {
  var m = localStorage.getItem('souschef_color_mode') ||
    (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.dataset.theme = m;
  var tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.setAttribute('content', m === 'light' ? '#F1F4F9' : '#0B0F19'); // = --canvas-base
  var h = new Date().getHours();
  document.documentElement.dataset.sky = h >= 6 && h < 19 ? 'sun' : 'moon';
  // Installed web app (home screen); the layout is the same, this is a hook for styling.
  if (navigator.standalone === true || matchMedia('(display-mode: standalone)').matches) document.documentElement.dataset.standalone = '1';
} catch { document.documentElement.dataset.theme = 'dark'; }
