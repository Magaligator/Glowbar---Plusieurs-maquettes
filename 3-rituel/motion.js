// Glowbar V2 — couche de mouvement. Ajoute des classes à la volée : aucun changement de balisage nécessaire.
(function(){
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var root = document.documentElement;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function(v, a, b){ return Math.max(a, Math.min(b, v)); };
  var lerp = function(a, b, t){ return a + (b - a) * t; };
  var $ = function(s, c){ return (c || document).querySelector(s); };
  var $$ = function(s, c){ return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function init(){
    root.classList.add('m-on');

    /* ----- barre de progression + header ----- */
    var bar = document.createElement('div'); bar.className = 'm-progress'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);
    var header = $('header'), lastY = window.scrollY;

    /* ----- titres : mots qui montent un à un ----- */
    function splitWords(el){
      var idx = 0;
      function walk(node, parent){
        Array.prototype.slice.call(node.childNodes).forEach(function(n){
          if (n.nodeType === 3) {
            n.textContent.split(/(\s+)/).forEach(function(part){
              if (!part) return;
              if (/^\s+$/.test(part)) { parent.appendChild(document.createTextNode(' ')); return; }
              var w = document.createElement('span'); w.className = 'm-w';
              var wi = document.createElement('span'); wi.className = 'm-wi'; wi.textContent = part; wi.style.setProperty('--i', idx++);
              w.appendChild(wi); parent.appendChild(w);
            });
          } else if (n.nodeType === 1 && n.tagName === 'BR') { parent.appendChild(n.cloneNode()); }
          else if (n.nodeType === 1) { var c = n.cloneNode(false); parent.appendChild(c); walk(n, c); }
        });
      }
      var tmp = document.createElement('div'); walk(el, tmp);
      el.innerHTML = ''; while (tmp.firstChild) el.appendChild(tmp.firstChild);
    }
    var heads = $$('h1, h2, blockquote').filter(function(h){ return !h.closest('.cta-band .cta-row') && h.textContent.trim().length; });
    heads.forEach(splitWords);

    /* ----- blocs qui apparaissent, avec décalage entre frères ----- */
    var generic = $$('.eyebrow, .lede, .cta-row, .stat-block, .pillar, .split-copy > *:not(h2), .eshop-card, .quote-block > *:not(blockquote), .cta-band > *:not(h2):not(.m-sphere), .contact-form-wrap, .footer-col, .footer-brand, .filters, .product-card:not(.reveal), .hero-media .frame, .hero-media .corner, .section-head .eyebrow');
    var seen = new Set();
    generic = generic.filter(function(el){
      if (seen.has(el) || el.classList.contains('reveal') || el.closest('.reveal')) return false;
      seen.add(el); return true;
    });
    var perParent = new Map();
    generic.forEach(function(el){
      var n = perParent.get(el.parentElement) || 0; perParent.set(el.parentElement, n + 1);
      el.classList.add('m-rv'); el.style.setProperty('--d', (Math.min(n, 5) * 0.09).toFixed(2) + 's');
    });
    var medias = $$('.split-media, .pillar-media, .eshop-card-media, .video-feature, .product-media').filter(function(el){ return !el.closest('.reveal') || el.closest('.product-card'); });
    medias.forEach(function(el){ el.classList.add('m-img'); });

    /* clip-path masque l'élément : on observe son parent pour déclencher l'ouverture */
    var map = new Map();
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting) { map.get(e.target).forEach(function(t){ t.classList.add('in'); }); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    heads.concat(generic, medias).forEach(function(t){
      var o = t.classList.contains('m-img') ? (t.parentElement || t) : t;
      if (!map.has(o)) { map.set(o, []); io.observe(o); }
      map.get(o).push(t);
    });

    /* ----- sphères flottantes (les « boules » du hero, du bandeau d'appel) ----- */
    function addSpheres(host, kinds){
      if (!host) return [];
      return kinds.map(function(k){ var s = document.createElement('span'); s.className = 'm-sphere ' + k; s.setAttribute('aria-hidden', 'true'); host.appendChild(s); return s; });
    }
    var heroSpheres = addSpheres($('.hero-media'), ['s1', 's2', 's3']);
    var bandSpheres = addSpheres($('.cta-band'), ['big glow', 's3 glow']);
    var statSpheres = addSpheres($('.hero-stats'), ['big']);
    var driftEls = heroSpheres.concat(bandSpheres, statSpheres).map(function(el, i){ return { el: el, k: [0.06, -0.09, 0.05, -0.07, 0.1, -0.08][i % 6] }; });

    /* ----- compteurs ----- */
    $$('.stat-number').forEach(function(el){
      var m = el.textContent.trim().match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/); if (!m) return;
      var pre = m[1], end = parseFloat(m[2]), suf = m[3]; el.textContent = pre + '0' + suf;
      var o = new IntersectionObserver(function(es){
        if (!es[0].isIntersecting) return; o.disconnect();
        var t0 = null; (function step(t){ if (!t0) t0 = t; var p = clamp((t - t0) / 1700, 0, 1); el.textContent = pre + Math.round(end * (1 - Math.pow(1 - p, 4))) + suf; if (p < 1) requestAnimationFrame(step); })(performance.now());
      }, { threshold: 0.7 }); o.observe(el);
    });

    /* ----- défilement : progression, header, parallaxe ----- */
    var pxImgs = $$('.m-img img');
    var small = window.matchMedia('(max-width: 900px)').matches;
    var mx = 0, my = 0, tx = 0, ty = 0, scrollY = window.scrollY, ticking = false;
    function frame(){
      ticking = false;
      var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight, vh = window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? clamp(y / h, 0, 1) : 0) + ')';
      if (header) {
        header.classList.toggle('m-scrolled', y > 10);
        var open = $('.mobile-panel.open');
        header.classList.toggle('m-hide', y > lastY + 2 && y > 320 && !open);
        if (y < lastY - 2 || y < 320) header.classList.remove('m-hide');
      }
      lastY = y;
      var amp = small ? 4.5 : 7;
      pxImgs.forEach(function(img){
        var r = img.parentElement.getBoundingClientRect(); if (r.bottom < -60 || r.top > vh + 60) return;
        var p = clamp(((r.top + r.height / 2) - vh / 2) / vh, -1, 1);
        img.style.setProperty('--py', (-p * amp).toFixed(2) + '%');
      });
      driftEls.forEach(function(d){
        var r = d.el.parentElement.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh + 100) return;
        var p = (r.top + r.height / 2 - vh / 2);
        d.el.style.transform = 'translate3d(' + (mx * -16 * (d.k > 0 ? 1 : -1)).toFixed(1) + 'px,' + (p * d.k + my * -10).toFixed(1) + 'px,0)';
      });
    }
    function request(){ if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    frame();

    /* ----- pointeur (ordinateur) : la photo et les sphères suivent doucement ----- */
    var hero = $('.hero');
    if (fine && hero) {
      window.addEventListener('pointermove', function(e){ tx = (e.clientX / window.innerWidth - 0.5) * 2; ty = (e.clientY / window.innerHeight - 0.5) * 2; }, { passive: true });
      (function loop(){
        mx = lerp(mx, tx, 0.06); my = lerp(my, ty, 0.06);
        hero.style.setProperty('--mx', mx.toFixed(3)); hero.style.setProperty('--my', my.toFixed(3));
        if (Math.abs(mx - tx) + Math.abs(my - ty) > 0.002) request();
        requestAnimationFrame(loop);
      })();
      $$('.btn').forEach(function(b){
        b.addEventListener('pointermove', function(e){ var r = b.getBoundingClientRect(); b.style.transform = 'translate(' + ((e.clientX - (r.left + r.width / 2)) * 0.2).toFixed(1) + 'px,' + ((e.clientY - (r.top + r.height / 2)) * 0.3).toFixed(1) + 'px)'; });
        b.addEventListener('pointerleave', function(){ b.style.transform = ''; });
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
