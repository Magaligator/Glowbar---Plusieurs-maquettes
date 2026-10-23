// Glowbar V4 — choreography around the pearl

(function(){
  'use strict';
  var root = document.documentElement, body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function(v, a, b){ return Math.max(a, Math.min(b, v)); };
  var lerp = function(a, b, t){ return a + (b - a) * t; };
  var $ = function(s, c){ return (c || document).querySelector(s); };
  var $$ = function(s, c){ return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  /* ---------- smooth scroll ---------- */
  var lenis = null, cbs = [];
  function onScroll(f){ cbs.push(f); }
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    lenis.on('scroll', function(){ cbs.forEach(function(f){ f(); }); });
    (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })(0);
  } else {
    window.addEventListener('scroll', function(){ cbs.forEach(function(f){ f(); }); }, { passive: true });
  }
  function scrollToEl(el){
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.8, easing: function(t){ return 1 - Math.pow(1 - t, 4); } });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest('a[href*="#"]'); if (!a) return;
    var u = new URL(a.href, location.href);
    if (u.pathname !== location.pathname || !u.hash || u.hash === '#') return;
    var t = document.getElementById(u.hash.slice(1)); if (!t) return;
    e.preventDefault(); closeMenu(); scrollToEl(t); history.replaceState(null, '', u.hash);
  });

  /* ---------- nav hide, theme per section ---------- */
  var nav = $('.nav'), lastY = 0, secs = $$('[data-sec]');
  function sceneState(){
    var y = window.scrollY, cy = window.innerHeight / 2;
    if (nav) nav.classList.toggle('hide', y > lastY && y > 400 && !body.classList.contains('menu-open'));
    lastY = y;
    for (var i = 0; i < secs.length; i++) {
      var r = secs[i].getBoundingClientRect();
      if (r.top <= cy && r.bottom > cy) { if (body.dataset.theme !== secs[i].dataset.theme) body.dataset.theme = secs[i].dataset.theme; break; }
    }
  }
  onScroll(sceneState); sceneState();

  /* ---------- menu ---------- */
  var menu = $('.menu'), menuBtn = $('.menu-btn');
  function closeMenu(){
    if (!menu || !menu.classList.contains('open')) return;
    menu.classList.remove('open'); body.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start();
  }
  if (menu && menuBtn) {
    menuBtn.addEventListener('click', function(){
      var open = !menu.classList.contains('open');
      menu.classList.toggle('open', open); body.classList.toggle('menu-open', open); menuBtn.setAttribute('aria-expanded', String(open));
      $('span', menuBtn).textContent = open ? 'Close' : 'Menu';
      if (lenis) open ? lenis.stop() : lenis.start();
    });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') { closeMenu(); $('span', menuBtn).textContent = 'Menu'; closeHotspots(); } });
    $$('a', menu).forEach(function(a){ a.addEventListener('click', function(){ $('span', menuBtn).textContent = 'Menu'; }); });
  }

  /* ---------- text splitting ---------- */
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
        } else if (n.nodeType === 1 && n.tagName === 'BR') { parent.appendChild(n.cloneNode()); }
        else if (n.nodeType === 1) { var c = n.cloneNode(false); parent.appendChild(c); walk(n, c); }
      });
    }
    var tmp = document.createElement('div'); walk(el, tmp);
    el.innerHTML = ''; while (tmp.firstChild) el.appendChild(tmp.firstChild);
  }
  $$('[data-split]').forEach(splitWords);
  $$('[data-chars]').forEach(function(el){
    var t = el.textContent; el.setAttribute('aria-label', t); el.textContent = '';
    t.split('').forEach(function(c, i){ var s = document.createElement('span'); s.className = 'ch'; s.setAttribute('aria-hidden', 'true'); s.textContent = c; s.style.setProperty('--i', i); el.appendChild(s); });
  });

  /* ---------- reveal on scroll (clip-path'ed nodes are observed through their parent) ---------- */
  function startReveal(){
    root.classList.add('ready');
    var targets = $$('.rv, .mask, [data-split]');
    if (!('IntersectionObserver' in window) || reduced) { targets.forEach(function(t){ t.classList.add('in'); }); runCounters(); return; }
    var map = new Map();
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting) { map.get(e.target).forEach(function(t){ t.classList.add('in'); }); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function(t){
      var o = t.classList.contains('mask') ? t.parentElement : t;
      if (!map.has(o)) { map.set(o, []); io.observe(o); }
      map.get(o).push(t);
    });
    runCounters();
  }

  function runCounters(){
    $$('[data-count]').forEach(function(el){
      var end = parseFloat(el.dataset.count), suf = el.dataset.suffix || '';
      function go(){
        if (reduced) { el.textContent = end + suf; return; }
        var t0 = null; (function step(t){ if (!t0) t0 = t; var p = clamp((t - t0) / 1800, 0, 1); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4))) + suf; if (p < 1) requestAnimationFrame(step); })(performance.now());
      }
      if (!('IntersectionObserver' in window)) { go(); return; }
      var o = new IntersectionObserver(function(es){ if (es[0].isIntersecting) { go(); o.disconnect(); } }, { threshold: 0.6 }); o.observe(el);
    });
  }

  /* ---------- parallax, drifting numerals, scroll-linked marquee ---------- */
  var pxs = $$('.px').map(function(w){ return { w: w, img: $('img', w) }; }).filter(function(o){ return o.img; });
  var drifts = $$('[data-drift]');
  var mq = $('[data-marquee]'), mqW = 0;
  function measure(){ if (mq) mqW = mq.scrollWidth / 3; }
  window.addEventListener('resize', measure); window.addEventListener('load', measure); measure();
  function motion(){
    if (reduced) return;
    var vh = window.innerHeight;
    pxs.forEach(function(o){
      var r = o.w.getBoundingClientRect(); if (r.bottom < -80 || r.top > vh + 80) return;
      var p = clamp(((r.top + r.height / 2) - vh / 2) / vh, -1, 1);
      o.img.style.transform = 'translate3d(0,' + (-p * 6.5).toFixed(2) + '%,0)';
    });
    drifts.forEach(function(d){
      var r = d.parentElement.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
      var p = clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1);
      d.style.transform = 'translate3d(0,' + (-52 + (-p * 9)).toFixed(1) + '%,0)';
    });
    if (mq && mqW) {
      var r2 = mq.parentElement.getBoundingClientRect();
      var x = ((-(window.scrollY) * 0.45) % mqW);
      mq.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
    }
  }
  onScroll(motion); window.addEventListener('resize', motion); motion();

  /* ---------- pointer: hero depth + cursor + magnetic buttons ---------- */
  var hero = $('.hero'), px = 0, py = 0, tx = 0, ty = 0;
  if (fine && !reduced) {
    window.addEventListener('pointermove', function(e){ tx = (e.clientX / window.innerWidth - 0.5) * 2; ty = (e.clientY / window.innerHeight - 0.5) * 2; }, { passive: true });
    (function loop(){
      px = lerp(px, tx, 0.07); py = lerp(py, ty, 0.07);
      if (hero) { hero.style.setProperty('--mx', px.toFixed(3)); hero.style.setProperty('--my', py.toFixed(3)); }
      requestAnimationFrame(loop);
    })();
    $$('[data-magnetic]').forEach(function(b){
      b.addEventListener('pointermove', function(e){
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - (r.left + r.width / 2)) * 0.22).toFixed(1) + 'px,' + ((e.clientY - (r.top + r.height / 2)) * 0.32).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function(){ b.style.transform = ''; });
    });
  }
  var cur = $('.cursor');
  if (cur && fine) {
    body.classList.add('has-cursor');
    var cx = -100, cy = -100, ex = -100, ey = -100;
    window.addEventListener('pointermove', function(e){
      cx = e.clientX; cy = e.clientY; cur.classList.add('show');
      var overPearl = window.Pearl && window.Pearl.isOver(cx, cy) && !e.target.closest('a, button, .menu');
      var overLink = !!e.target.closest('a, button, [data-magnetic]');
      cur.classList.toggle('pearl', !!overPearl); cur.classList.toggle('link', overLink && !overPearl);
      cur.textContent = overPearl ? 'Hold' : '';
    }, { passive: true });
    window.addEventListener('pointerdown', function(){ cur.classList.add('down'); });
    window.addEventListener('pointerup', function(){ cur.classList.remove('down'); });
    document.addEventListener('pointerleave', function(){ cur.classList.remove('show'); });
    (function loop(){ ex = lerp(ex, cx, 0.2); ey = lerp(ey, cy, 0.2); cur.style.transform = 'translate3d(' + ex.toFixed(1) + 'px,' + ey.toFixed(1) + 'px,0)'; requestAnimationFrame(loop); })();
  }

  /* ---------- hotspots ---------- */
  var hss = $$('.hs');
  function closeHotspots(except){ hss.forEach(function(h){ if (h !== except) { h.classList.remove('open'); h.setAttribute('aria-expanded', 'false'); } }); }
  hss.forEach(function(h){
    h.addEventListener('click', function(e){
      if (e.target.closest('a')) return;
      var open = !h.classList.contains('open'); closeHotspots(h);
      h.classList.toggle('open', open); h.setAttribute('aria-expanded', String(open));
      if (open) Sound.tick();
    });
  });
  document.addEventListener('click', function(e){ if (!e.target.closest('.hs')) closeHotspots(); });

  /* ---------- sound : off by default, a soft chime when the pearl is released ---------- */
  var Sound = {
    ctx: null, on: false, pad: null,
    ensure: function(){ if (!this.ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); } return this.ctx; },
    note: function(freq, when, vol, len){
      var c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(vol, when + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, when + len);
      o.connect(g); g.connect(c.destination); o.start(when); o.stop(when + len + 0.05);
    },
    chime: function(){ if (!this.on || !this.ensure()) return; var t = this.ctx.currentTime; this.note(784, t, 0.07, 1.8); this.note(1175, t + 0.08, 0.05, 1.6); this.note(1568, t + 0.16, 0.03, 1.4); },
    tick: function(){ if (!this.on || !this.ensure()) return; this.note(988, this.ctx.currentTime, 0.04, 0.35); },
    holdStart: function(){
      if (!this.on || !this.ensure()) return;
      var c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
      o.type = 'sine'; o.frequency.setValueAtTime(196, t); o.frequency.exponentialRampToValueAtTime(392, t + 2.4);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.5);
      o.connect(g); g.connect(c.destination); o.start(t); this.pad = { o: o, g: g };
    },
    holdEnd: function(){
      if (!this.pad) return; var c = this.ctx, t = c.currentTime;
      this.pad.g.gain.cancelScheduledValues(t); this.pad.g.gain.setValueAtTime(Math.max(this.pad.g.gain.value, 0.0001), t); this.pad.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      this.pad.o.stop(t + 0.5); this.pad = null;
    }
  };
  var sBtn = $('.sound');
  if (sBtn) sBtn.addEventListener('click', function(){
    Sound.on = !Sound.on; if (Sound.on) Sound.ensure();
    sBtn.setAttribute('aria-pressed', String(Sound.on)); $('span', sBtn).textContent = Sound.on ? 'Sound on' : 'Sound off';
    if (Sound.on) Sound.tick();
  });
  window.addEventListener('pearl:hold', function(){ Sound.holdStart(); });
  window.addEventListener('pearl:release', function(){ Sound.holdEnd(); Sound.chime(); });

  /* ---------- forms + shop filters ---------- */
  $$('form[data-form]').forEach(function(f){
    f.addEventListener('submit', function(e){
      e.preventDefault(); var note = f.nextElementSibling; f.reset(); f.hidden = true;
      if (note && note.classList.contains('form-note')) note.hidden = false;
    });
  });
  var pills = $$('.pill'), cards = $$('.grid .p');
  pills.forEach(function(p){
    p.addEventListener('click', function(){
      pills.forEach(function(x){ x.classList.remove('active'); }); p.classList.add('active');
      var cat = p.dataset.filter;
      cards.forEach(function(c){
        var show = cat === 'all' || c.dataset.category === cat;
        c.classList.toggle('out', !show);
        setTimeout(function(){ c.style.display = show ? '' : 'none'; if (show) c.classList.remove('out'); }, show ? 0 : 450);
      });
      if (lenis) setTimeout(function(){ lenis.resize(); }, 520);
    });
  });

  /* ---------- loader : breathe in, lift, glow — then everything arrives ---------- */
  var loader = $('.loader'), count = $('.loader-count');
  function arrive(){
    if (window.Pearl) window.Pearl.reveal();
    startReveal();
    try { sessionStorage.setItem('glowbar-v4-seen', '1'); } catch (e) {}
  }
  if (loader && !root.classList.contains('seen') && !reduced) {
    var t0 = performance.now(), DUR = 2500;
    (function tick(now){
      var p = clamp((now - t0) / DUR, 0, 1); count.textContent = String(Math.round(p * 100)).padStart(2, '0');
      if (p < 1) requestAnimationFrame(tick);
      else { loader.classList.add('done'); setTimeout(arrive, 500); setTimeout(function(){ loader.classList.add('gone'); }, 1400); }
    })(t0);
  } else { if (loader) loader.classList.add('gone'); arrive(); }
})();
