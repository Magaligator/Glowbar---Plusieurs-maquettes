// Glowbar V4 — "the pearl": one hand-written WebGL shader, no library.
// The pearl travels from section to section (each section declares an anchor
// with [data-pearl]), reacts to the pointer and scroll speed, and can be held to glow.

(function(){
  'use strict';
  var canvas = document.getElementById('pearl');
  var root = document.documentElement;
  if (!canvas) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) { root.classList.add('no-gl'); window.Pearl = { reveal: function(){}, isOver: function(){ return false; } }; return; }

  var VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes; uniform float uT; uniform vec2 uC; uniform float uR;',
    'uniform vec3 uA; uniform vec3 uB; uniform float uHold; uniform float uPulse; uniform float uWob; uniform vec2 uM; uniform float uDark;',
    'float hash(vec2 q){ return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }',
    'void main(){',
    '  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);',
    '  float R = uR * (1.0 + 0.07 * uHold);',
    '  vec2 p = (frag - uC) / R;',
    '  float ang = atan(p.y, p.x);',
    '  float k = 1.0 + 0.030 * sin(ang * 3.0 + uT * 0.7) + 0.022 * sin(ang * 5.0 - uT * 0.9 + 1.3)',
    '            + uWob * 0.05 * sin(ang * 2.0 + uT * 2.2) + 0.018 * uHold * sin(ang * 7.0 + uT * 3.0);',
    '  vec2 pw = p / k;',
    '  float rr = length(pw);',
    '  if (rr > 4.0) { gl_FragColor = vec4(0.0); return; }',
    '  float aa = 1.6 / R;',
    '  float body = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, rr);',
    '  vec3 col = vec3(0.0);',
    '  if (body > 0.0) {',
    '    float z = sqrt(max(0.0, 1.0 - rr * rr));',
    '    vec3 n = normalize(vec3(pw.x, -pw.y, z));',
    '    vec3 V = vec3(0.0, 0.0, 1.0);',
    '    vec3 L = normalize(vec3(-0.45 + uM.x * 0.35, 0.65 - uM.y * 0.35, 0.62));',
    '    float ndl = max(dot(n, L), 0.0);',
    '    float fres = pow(1.0 - n.z, 2.6);',
    '    vec3 base = mix(uB * 0.80, uA, smoothstep(-0.7, 0.9, dot(n, L)));',
    '    vec3 iri = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + n.z * 0.9 + n.x * 0.25 - n.y * 0.2 + uT * 0.04));',
    '    base = mix(base, base * 0.55 + iri * 0.55, 0.26 + 0.34 * fres);',
    '    base += uB * 0.22 * pow(max(-n.y, 0.0), 2.0) * (1.0 - n.z * 0.5);',
    '    vec3 Hh = normalize(L + V);',
    '    float spec = pow(max(dot(n, Hh), 0.0), 90.0);',
    '    vec3 r = reflect(-V, n);',
    '    float b1 = 1.0 - smoothstep(0.0, 0.025, max(abs(r.x + 0.38) - 0.16, abs(r.y - 0.52) - 0.07));',
    '    float b2 = (1.0 - smoothstep(0.0, 0.03, max(abs(r.x - 0.52) - 0.05, abs(r.y + 0.10) - 0.30))) * 0.5;',
    '    col = base * (0.62 + 0.5 * ndl) + vec3(1.0) * (spec * 0.9 + b1 * 0.85 + b2 * 0.5) + vec3(1.0, 0.93, 0.95) * fres * 0.26;',
    '    col += uA * uHold * 0.20 * (1.0 - fres) + vec3(1.0, 0.80, 0.78) * uHold * 0.035; col = mix(col, col * vec3(1.06, 0.97, 0.98), uHold);',
    '  }',
    '  float halo = exp(-max(rr - 1.0, 0.0) * 2.4) * (0.20 + 0.55 * uHold) * (1.0 + uDark * 0.8) * (1.0 - body);',
    '  float ring = (1.0 - smoothstep(0.0, 0.07, abs(rr - (1.0 + uPulse * 1.9)))) * (1.0 - uPulse) * 0.55 * (1.0 - body);',
    '  vec3 hc = mix(uA, uB, 0.5);',
    '  float extra = halo + ring;',
    '  vec3 outc = col * body + hc * extra;',
    '  float outa = clamp(body + extra, 0.0, 1.0);',
    '  float d = (hash(gl_FragCoord.xy + uT) - 0.5) / 255.0;',
    '  gl_FragColor = vec4(outc + d * outa, outa);',
    '}'
  ].join('\n');

  function sh(type, src){
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { root.classList.add('no-gl'); window.Pearl = { reveal: function(){}, isOver: function(){ return false; } }; return; }
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  var U = {}; ['uRes','uT','uC','uR','uA','uB','uHold','uPulse','uWob','uM','uDark'].forEach(function(n){ U[n] = gl.getUniformLocation(prog, n); });

  var dpr = 1, W = 0, H = 0;
  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize); resize();

  function hex(h){ h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255]; }
  var lerp = function(a, b, t){ return a + (b - a) * t; };
  var clamp = function(v, a, b){ return Math.max(a, Math.min(b, v)); };

  // sections that carry an anchor
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-sec]')).map(function(sec){
    return { sec: sec, anchor: sec.querySelector('[data-pearl]') };
  });
  var current = sections.filter(function(s){ return s.anchor; })[0] || null;

  var S = { x: W * 0.5, y: H * 0.5, r: 0, a: hex('#F3BCD6'), b: hex('#E9A0C6'), dark: 0, hold: 0, pulse: 1, wob: 0, mx: 0, my: 0, intro: 0 };
  var holding = false, pulsing = false, introOn = false, mouse = { x: 0, y: 0 }, lastY = window.scrollY, vel = 0;

  function target(){
    for (var i = sections.length - 1; i >= 0; i--) {
      var probe = H * parseFloat(sections[i].sec.dataset.probe || 0.5);   // the footer is read lower down the screen
      var rc = sections[i].sec.getBoundingClientRect();
      if (rc.top <= probe && rc.bottom > probe) { if (sections[i].anchor) current = sections[i]; break; }
    }
    if (!current) return null;
    var a = current.anchor, rect = a.getBoundingClientRect();
    var vmin = Math.min(W, H) / 100, small = W < 800;
    var r = small ? (a.dataset.rm ? parseFloat(a.dataset.rm) : parseFloat(a.dataset.r || 12) * 0.78) : parseFloat(a.dataset.r || 12);
    return {
      x: rect.left, y: rect.top,
      r: r * vmin,
      a: hex(a.dataset.a || '#F3BCD6'), b: hex(a.dataset.b || '#E9A0C6'),
      dark: current.sec.dataset.theme === 'dark' ? 1 : 0
    };
  }

  var t0 = performance.now(), prev = t0, firstFrame = true;
  function frame(now){
    requestAnimationFrame(frame);
    if (document.hidden) { prev = now; return; }
    var dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    var tg = target();
    if (tg) {
      var f = firstFrame ? 1 : 1 - Math.pow(0.0009, dt);   // frame-rate independent easing
      S.x = lerp(S.x, tg.x, f); S.y = lerp(S.y, tg.y, f); S.r = lerp(S.r, tg.r, f);
      for (var i = 0; i < 3; i++) { S.a[i] = lerp(S.a[i], tg.a[i], f); S.b[i] = lerp(S.b[i], tg.b[i], f); }
      S.dark = lerp(S.dark, tg.dark, f);
      firstFrame = false;
    }
    var y = window.scrollY; vel = lerp(vel, Math.abs(y - lastY) / Math.max(dt, 0.001), 0.1); lastY = y;
    S.wob = lerp(S.wob, clamp(vel / 2600, 0, 1), 0.08);
    S.mx = lerp(S.mx, mouse.x, 0.06); S.my = lerp(S.my, mouse.y, 0.06);
    S.hold = lerp(S.hold, holding ? 1 : 0, 1 - Math.pow(holding ? 0.02 : 0.004, dt));
    if (pulsing) { S.pulse += dt * 0.85; if (S.pulse >= 1) { S.pulse = 1; pulsing = false; } }
    if (introOn) S.intro = Math.min(1, S.intro + dt * 0.9);
    var ease = 1 - Math.pow(1 - S.intro, 4), over = ease + Math.sin(ease * Math.PI) * 0.12;   // slight overshoot

    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (S.r * over < 1) return;   // nothing to draw before the intro
    var T = reduced ? 2.0 : (now - t0) / 1000;
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uT, T);
    gl.uniform2f(U.uC, (S.x + S.mx * -10) * dpr, (S.y + S.my * -8) * dpr);
    gl.uniform1f(U.uR, S.r * over * dpr);
    gl.uniform3f(U.uA, S.a[0], S.a[1], S.a[2]); gl.uniform3f(U.uB, S.b[0], S.b[1], S.b[2]);
    gl.uniform1f(U.uHold, S.hold); gl.uniform1f(U.uPulse, S.pulse); gl.uniform1f(U.uWob, S.wob);
    gl.uniform2f(U.uM, S.mx, S.my); gl.uniform1f(U.uDark, S.dark);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  requestAnimationFrame(frame);

  function dist(x, y){ return Math.hypot(x - S.x, y - S.y); }
  function isOver(x, y){ return S.intro > 0.6 && dist(x, y) < S.r * 1.08; }

  window.addEventListener('pointermove', function(e){
    mouse.x = (e.clientX / W - 0.5) * 2; mouse.y = (e.clientY / H - 0.5) * 2;
  }, { passive: true });
  window.addEventListener('pointerdown', function(e){
    if (e.target.closest('a, button, input, textarea, .menu, .nav')) return;
    if (isOver(e.clientX, e.clientY)) {
      holding = true; root.classList.add('pearl-used');
      window.dispatchEvent(new CustomEvent('pearl:hold'));
    }
  });
  function release(){
    if (!holding) return;
    holding = false; S.pulse = 0; pulsing = !reduced; if (reduced) S.pulse = 1;
    window.dispatchEvent(new CustomEvent('pearl:release'));
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);   // e.g. the browser took the gesture to scroll

  window.Pearl = {
    reveal: function(){ introOn = true; if (reduced) S.intro = 1; },
    isOver: isOver
  };
})();
