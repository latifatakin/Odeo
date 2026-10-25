// Runs before the page paints so saved theme, page colour and font apply with no flash.
(function () {
  try {
    var raw = localStorage.getItem('odeo:v1:settings:user');
    var v = raw ? JSON.parse(raw).values || {} : {};
    var root = document.documentElement;
    if (v.theme === 'light' || v.theme === 'dark') root.setAttribute('data-theme', v.theme);
    if (v.font) root.setAttribute('data-font', v.font);
    if (v.readingTheme) root.setAttribute('data-reading', v.readingTheme);
    if (v.fontEverywhere) root.setAttribute('data-font-everywhere', 'true');
  } catch (e) {}
})();
