// Glowbar V3 — fluid interactions

(function(){
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function(v, a, b){ return Math.max(a, Math.min(b, v)); };
  var $ = function(s, c){ return (c || document).querySelector(s); };
  var $$ = function(s, c){ return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  /* ---------- smooth scroll (Lenis) ---------- */
  var lenis = null;
  var scrollCbs = [];
  function onScroll(fn){ scrollCbs.push(fn); }
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    lenis.on('scroll', function(){ scrollCbs.forEach(function(f){ f(); }); });
    var raf = function(t){ lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  } else {
    window.addEventListener('scroll', function(){ scrollCbs.forEach(function(f){ f(); }); }, { passive: true });
  }
  function scrollToTarget(el){
    var offset = -70;
    if (lenis) lenis.scrollTo(el, { offset: offset, duration: 1.6, easing: function(t){ return 1 - Math.pow(1 - t, 4); } });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest('a[href^="#"], a[href*="#"]');
    if (!a) return;
    var url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
    var target = document.getElementById(url.hash.slice(1));
    if (!target) return;
    e.preventDefault();
    scrollToTarget(target);
    history.replaceState(null, '', url.hash);
  });

  /* ---------- header : progress, shadow, hide on scroll down ---------- */
  var header = $('.site-header'), bar = $('.progress'), lastY = 0;
  function headerState(){
    var y = window.scrollY || window.pageYOffset;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (h > 0 ? clamp(y / h, 0, 1) : 0) + ')';
    if (header) {
      header.classList.toggle('scrolled', y > 10);
      var panelOpen = $('.mobile-panel.open');
      header.classList.toggle('hide', y > lastY && y > 320 && !panelOpen);
    }
    lastY = y;
  }
  onScroll(headerState); headerState();

  /* ---------- mobile nav ---------- */
  var toggle = $('.nav-toggle'), panel = $('.mobile-panel');
  if (toggle && panel) {
    var closePanel = function(){ toggle.classList.remove('open'); panel.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', function(){
      var open = toggle.classList.toggle('open');
      panel.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    $$('a', panel).forEach(function(a){ a.addEventListener('click', closePanel); });
  }

  /* ---------- split headings into masked words ---------- */
  function splitWords(el){
    var idx = 0;
    function walk(node, parent){
      Array.prototype.slice.call(node.childNodes).forEach(function(n){
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(function(part){
            if (!part) return;
            if (/^\s+$/.test(part)) { parent.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            var wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = part; wi.style.setProperty('--i', idx++);
            w.appendChild(wi); parent.appendChild(w);
          });
        } else if (n.nodeType === 1 && n.tagName === 'BR') {
          parent.appendChild(n.cloneNode());
        } else if (n.nodeType === 1) {
          var c = n.cloneNode(false); parent.appendChild(c); walk(n, c);
        }
      });
    }
    var frag = document.createElement('div');
    walk(el, frag);
    el.innerHTML = ''; while (frag.firstChild) el.appendChild(frag.firstChild);
  }
  $$('[data-split]').forEach(splitWords);

  /* ---------- reveal on scroll ---------- */
  var revealTargets = $$('.rv, .mask-img, [data-split]').filter(function(el){ return !el.closest('.rt'); });
  var io = null;
  function startReveal(){
    document.documentElement.classList.add('ready');
    if (!('IntersectionObserver' in window) || reduced) { revealTargets.forEach(function(el){ el.classList.add('in'); }); countUps(); return; }
    // clip-path'ed elements are never "intersecting", so their wrapper is observed instead
    var watch = new Map();
    io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting) { watch.get(en.target).classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach(function(el){
      var obs = el.classList.contains('mask-img') ? el.parentElement : el;
      watch.set(obs, el); io.observe(obs);
    });
    countUps();
  }

  /* ---------- count-up numbers ---------- */
  function countUps(){
    var els = $$('[data-count]');
    function run(el){
      var end = parseFloat(el.dataset.count), suf = el.dataset.suffix || '', t0 = null, dur = 1700;
      if (reduced) { el.textContent = end + suf; return; }
      function step(t){
        if (!t0) t0 = t;
        var p = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(end * e) + suf;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    var cio = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if (en.isIntersecting) { run(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.6 });
    els.forEach(function(el){ cio.observe(el); });
  }

  /* ---------- parallax (images + spheres) ---------- */
  var pxEls = $$('.px').map(function(wrap){ return { wrap: wrap, img: $('img', wrap) }; }).filter(function(o){ return o.img; });
  var speedEls = $$('[data-speed]').map(function(el){ return { el: el, s: parseFloat(el.dataset.speed) }; });
  function parallax(){
    if (reduced) return;
    var vh = window.innerHeight;
    pxEls.forEach(function(o){
      var r = o.wrap.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var p = clamp(((r.top + r.height / 2) - vh / 2) / vh, -1, 1);
      o.img.style.transform = 'translate3d(0,' + (-p * 7).toFixed(2) + '%,0)';
    });
    var y = window.scrollY || window.pageYOffset;
    if (y < vh * 1.5) speedEls.forEach(function(o){ o.el.style.transform = 'translate3d(0,' + (y * o.s).toFixed(1) + 'px,0)'; });
  }
  onScroll(parallax); window.addEventListener('resize', parallax); parallax();

  /* ---------- magnetic buttons ---------- */
  if (finePointer && !reduced) {
    $$('.magnetic').forEach(function(btn){
      btn.addEventListener('pointermove', function(e){
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) * 0.22, y = (e.clientY - (r.top + r.height / 2)) * 0.32;
        btn.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function(){ btn.style.transform = ''; });
    });
  }

  /* ---------- ritual slider ---------- */
  var root = $('.ritual');
  if (root) {
    var stage = $('.ritual-stage', root), imgs = $$('.ri', root), texts = $$('.rt', root), words = $$('.ritual-word', root),
        idxBtns = $$('.ri-btn', root), curEl = $('[data-current]', root), totEl = $('[data-total]', root), cursor = $('.ritual-cursor', root);
    var n = imgs.length, cur = -1, DUR = 7000, timer = null, inView = false, hovering = false, dragging = false, wheelLock = false;
    root.style.setProperty('--dur', DUR + 'ms');
    if (totEl) totEl.textContent = pad(n);
    function pad(v){ return (v < 10 ? '0' : '') + v; }

    function go(next){
      next = (next + n) % n;
      if (next === cur) return;
      var prev = cur; cur = next;
      imgs.forEach(function(el, k){ el.classList.toggle('active', k === cur); el.classList.toggle('prev', k === prev); });
      texts.forEach(function(el, k){ el.classList.toggle('active', k === cur); el.setAttribute('aria-hidden', k === cur ? 'false' : 'true'); });
      words.forEach(function(el, k){ el.classList.toggle('active', k === cur); el.classList.toggle('prev', k === prev); });
      idxBtns.forEach(function(b, k){ if (k === cur) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      stage.style.setProperty('--r', imgs[cur].dataset.shape);
      if (curEl) curEl.textContent = pad(cur + 1);
      schedule();
    }

    function canPlay(){ return inView && !hovering && !dragging && !reduced && !document.hidden; }
    function schedule(){
      clearTimeout(timer);
      root.classList.remove('playing');
      if (!canPlay()) return;
      void root.offsetWidth; // restart the progress bar
      root.classList.add('playing');
      timer = setTimeout(function(){ go(cur + 1); }, DUR);
    }

    $('[data-next]', root).addEventListener('click', function(){ go(cur + 1); });
    $('[data-prev]', root).addEventListener('click', function(){ go(cur - 1); });
    idxBtns.forEach(function(b, k){ b.addEventListener('click', function(){ go(k); }); });
    root.addEventListener('keydown', function(e){
      if (e.key === 'ArrowRight') { go(cur + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { go(cur - 1); e.preventDefault(); }
    });
    document.addEventListener('visibilitychange', schedule);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function(entries){
        var was = inView; inView = entries[0].isIntersecting;
        if (inView && cur === -1) go(0);
        if (inView !== was) schedule();
      }, { threshold: 0.35 }).observe(root);
    } else { inView = true; go(0); }

    // drag / swipe
    var startX = 0, dx = 0, pid = null;
    stage.addEventListener('pointerdown', function(e){
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true; startX = e.clientX; dx = 0; pid = e.pointerId;
      stage.classList.add('dragging');
      try { stage.setPointerCapture(pid); } catch (err) {}
      schedule();
    });
    stage.addEventListener('pointermove', function(e){
      if (dragging && e.pointerId === pid) {
        dx = e.clientX - startX;
        stage.style.setProperty('--dx', clamp(dx, -260, 260));
      }
      if (cursor && finePointer) {
        var r = stage.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top;
        if (!cursorRaf) cursorRaf = requestAnimationFrame(moveCursor);
      }
    });
    function endDrag(e){
      if (!dragging || (e && e.pointerId !== pid)) return;
      dragging = false; stage.classList.remove('dragging');
      stage.style.setProperty('--dx', 0);
      if (Math.abs(dx) > 55) go(cur + (dx < 0 ? 1 : -1)); else schedule();
      dx = 0;
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('pointerenter', function(){ hovering = true; stage.classList.add('hover'); schedule(); });
    stage.addEventListener('pointerleave', function(){ hovering = false; stage.classList.remove('hover'); schedule(); });
    stage.addEventListener('wheel', function(e){
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 24) {
        e.preventDefault();
        if (!wheelLock) { wheelLock = true; go(cur + (e.deltaX > 0 ? 1 : -1)); setTimeout(function(){ wheelLock = false; }, 1000); }
      }
    }, { passive: false });

    // custom "Drag" cursor, eased
    var tx = 0, ty = 0, cx = 0, cy = 0, cursorRaf = 0;
    function moveCursor(){
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cursor.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)';
      cursorRaf = (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.4) ? requestAnimationFrame(moveCursor) : 0;
    }

    // giant outlined word follows the pointer, very softly
    if (finePointer && !reduced) {
      root.addEventListener('pointermove', function(e){
        var r = root.getBoundingClientRect();
        root.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5) * -70);
      });
    }
  }

  /* ---------- forms (no backend wired yet — confirmation only) ---------- */
  $$('form[data-form]').forEach(function(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var note = form.nextElementSibling;
      form.reset(); form.hidden = true;
      if (note && note.classList.contains('form-note')) note.hidden = false;
    });
  });

  /* ---------- shop filters ---------- */
  var pills = $$('.filter-pill'), cards = $$('.product-grid .card');
  if (pills.length && cards.length) {
    pills.forEach(function(pill){
      pill.addEventListener('click', function(){
        pills.forEach(function(p){ p.classList.remove('active'); });
        pill.classList.add('active');
        var cat = pill.dataset.filter;
        cards.forEach(function(card){
          var show = cat === 'all' || card.dataset.category === cat;
          card.classList.toggle('out', !show);
          setTimeout(function(){ card.style.display = show ? '' : 'none'; if (show) card.classList.remove('out'); }, show ? 0 : 450);
        });
        setTimeout(parallax, 500);
        if (lenis) setTimeout(function(){ lenis.resize(); }, 500);
      });
    });
  }

  /* ---------- loader, then start ---------- */
  var loader = $('.loader');
  function seen(){ try { sessionStorage.setItem('glowbar-v3-seen', '1'); } catch (e) {} }
  if (loader && !document.documentElement.classList.contains('seen') && !reduced) {
    var begin = function(){
      setTimeout(function(){
        loader.classList.add('done');
        setTimeout(startReveal, 450);
        setTimeout(function(){ loader.classList.add('gone'); }, 1500);
        seen();
      }, 900);
    };
    if (document.readyState === 'complete') begin(); else window.addEventListener('load', begin);
  } else {
    if (loader) loader.classList.add('gone');
    seen();
    startReveal();
  }
})();
