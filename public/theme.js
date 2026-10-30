// Applies a saved theme before first paint (external file: the CSP forbids inline scripts).
try {
  var t = localStorage.getItem('12xx2.theme')
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t)
} catch (e) {}
