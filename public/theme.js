// Applies a saved theme before first paint (external file: the CSP forbids inline scripts).
// No saved key means "follow the system": no data-theme, so the CSS tracks prefers-color-scheme.
// Keep in sync with src/ui/theme.ts.
try {
  var t = localStorage.getItem('12xx2.theme')
  if (t === 'light' || t === 'dark') {
    var d = document
    d.documentElement.setAttribute('data-theme', t)
    d.querySelector('meta[name="color-scheme"]').setAttribute('content', t)
    var m = d.querySelectorAll('meta[name="theme-color"]')
    for (var i = 0; i < m.length; i++) m[i].setAttribute('content', t === 'light' ? '#f4f2ec' : '#141726')
  }
} catch (e) {}
