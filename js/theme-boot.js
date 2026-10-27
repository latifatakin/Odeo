// Runs before the page paints so saved theme, fonts, page colour and the
// navigation layout apply with no flash.
(function () {
  var root = document.documentElement;
  try {
    var raw = localStorage.getItem('odeo:v1:settings:user');
    var v = raw ? JSON.parse(raw).values || {} : {};
    if (v.theme === 'light' || v.theme === 'dark') root.setAttribute('data-theme', v.theme);
    if (v.font === 'dyslexic' || v.font === 'comic' || v.font === 'body') root.setAttribute('data-font', v.font);
    if (v.readingTheme === 'sand') root.setAttribute('data-reading', 'sand');
    if (v.motion === 'reduce' || v.motion === 'allow') root.setAttribute('data-motion', v.motion);
  } catch (e) {}

  // Navigation: bar (phone), rail (tablet or collapsed desktop), side (desktop).
  function navMode() {
    var w = window.innerWidth;
    var collapsed = false;
    try { collapsed = localStorage.getItem('odeo:nav') === 'collapsed'; } catch (e) {}
    if (w < 600) { root.setAttribute('data-nav', 'bar'); root.removeAttribute('data-nav-forced'); }
    else if (w < 1024) { root.setAttribute('data-nav', 'rail'); root.setAttribute('data-nav-forced', 'rail'); }
    else { root.setAttribute('data-nav', collapsed ? 'rail' : 'side'); root.removeAttribute('data-nav-forced'); }
  }
  navMode();
  window.odeoNavMode = navMode;
  window.addEventListener('resize', navMode);
  // Breakpoint listeners also fire when the size changes without a resize
  // event (some device emulators and zoom changes).
  ['(max-width: 599.98px)', '(max-width: 1023.98px)'].forEach(function (q) {
    var mq = window.matchMedia(q);
    if (mq.addEventListener) mq.addEventListener('change', navMode);
    else if (mq.addListener) mq.addListener(navMode);
  });
})();
