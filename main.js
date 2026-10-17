(function () {
  var player = document.getElementById('player');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('#strip button'));
  var times = buttons.map(function (b) { return parseFloat(b.dataset.t); });

  function go(t) {
    player.currentTime = t;
    player.play().catch(function () {});
    var y = player.getBoundingClientRect().top + window.scrollY - 80;
    if (window.innerWidth <= 860) window.scrollTo({ top: y, behavior: 'smooth' });
  }

  var editing = false;
  buttons.forEach(function (b) {
    b.addEventListener('click', function () { if (!editing) go(parseFloat(b.dataset.t)); });
  });

  document.querySelector('[data-play]').addEventListener('click', function () {
    if (editing) return;
    player.play().catch(function () {});
    if (window.innerWidth <= 860) player.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // highlight the scene that is playing
  var current = -1;
  player.addEventListener('timeupdate', function () {
    var t = player.currentTime, idx = 0;
    for (var i = 0; i < times.length; i++) if (t >= times[i] - 0.2) idx = i;
    if (idx === current) return;
    if (current >= 0) buttons[current].removeAttribute('aria-current');
    buttons[idx].setAttribute('aria-current', 'true');
    current = idx;
    var list = document.getElementById('strip');
    var li = buttons[idx].parentElement;
    var left = li.offsetLeft - list.clientWidth / 2 + li.clientWidth / 2;
    if (!player.paused) list.scrollTo({ left: left, behavior: 'smooth' });
  });

  // tabs
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function select(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      select(n); n.focus();
    });
  });

  // ---------- edit mode: open the page with ?edit ----------
  if (!/[?&]edit\b/.test(location.search)) return;
  editing = true;
  var SEL = 'h1, h2, h3, h4, p, li, dt, dd, summary, .nm, .btn, .tabs button, .top__role, .chips li, .fix s, .fix b';
  var wasOpen = [];
  document.querySelectorAll('details').forEach(function (d) { wasOpen.push(d.open); d.open = true; });
  document.querySelectorAll('[role="tabpanel"]').forEach(function (p) { p.hidden = false; });
  document.querySelectorAll(SEL).forEach(function (el) {
    if (el.closest('.editbar')) return;
    if (el.querySelector('p, li, h3, h4, ul, div, img, button, video')) return; // only leaf text blocks
    el.setAttribute('contenteditable', 'true');
  });
  // keep clicks inside editable summaries/buttons from toggling or navigating
  document.addEventListener('click', function (e) {
    var t = e.target.closest('summary, a, .tabs button, .btn');
    if (t && !t.closest('.editbar') && !t.hasAttribute('download')) e.preventDefault();
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('summary') && (e.key === ' ' || e.key === 'Enter')) e.stopPropagation();
  }, true);

  var dirty = false;
  document.addEventListener('input', function () { dirty = true; });
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  var bar = document.createElement('div');
  bar.className = 'editbar';
  bar.innerHTML = '<p>Режим редактирования: нажмите на любой текст и измените его. Все разделы раскрыты.</p>' +
    '<button type="button" class="btn btn--main" data-save>Скачать index.html</button>' +
    '<a class="btn btn--ghost" href="' + location.pathname + '">Выйти</a>';
  document.body.appendChild(bar);

  bar.querySelector('[data-save]').addEventListener('click', function () {
    var doc = document.documentElement.cloneNode(true);
    doc.querySelectorAll('[contenteditable]').forEach(function (el) { el.removeAttribute('contenteditable'); });
    var bars = doc.querySelectorAll('.editbar'); bars.forEach(function (b) { b.remove(); });
    doc.querySelectorAll('details').forEach(function (d, i) { if (wasOpen[i]) d.setAttribute('open', ''); else d.removeAttribute('open'); });
    doc.querySelectorAll('[role="tabpanel"]').forEach(function (p, i) { if (i === 0) p.removeAttribute('hidden'); else p.setAttribute('hidden', ''); });
    doc.querySelectorAll('[aria-current]').forEach(function (el) { el.removeAttribute('aria-current'); });
    // strip anything browser extensions injected (ChatGPT, Sider, Grammarly etc.)
    doc.querySelectorAll('*').forEach(function (el) {
      if (el.tagName.indexOf('-') !== -1) el.remove();
    });
    doc.querySelectorAll('script').forEach(function (el) { if (el.getAttribute('src') !== 'main.js') el.remove(); });
    doc.querySelectorAll('style, iframe, object, embed').forEach(function (el) { el.remove(); });
    doc.querySelectorAll('link').forEach(function (el) {
      var h = el.getAttribute('href') || '';
      if (h !== 'style.css' && h.indexOf('fonts.g') === -1) el.remove();
    });
    [doc, doc.querySelector('body')].forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (a) {
        if (a.name !== 'lang') el.removeAttribute(a.name);
      });
    });
    doc.querySelectorAll('[data-gpts-theme], [data-ext-text-inserter], [data-gramm], [data-new-gr-c-s-check-loaded]').forEach(function (el) {
      ['data-gpts-theme', 'data-ext-text-inserter', 'data-gramm', 'data-new-gr-c-s-check-loaded', 'data-gr-ext-installed'].forEach(function (n) { el.removeAttribute(n); });
    });
    var html = '<!doctype html>\n' + doc.outerHTML;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = 'index.html';
    document.body.appendChild(a); a.click(); a.remove();
    dirty = false;
  });
})();
