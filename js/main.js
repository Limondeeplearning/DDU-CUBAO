/* ==========================================================
   16th Anniversary microsite — header / hero
   Architecture (web3d-integration-patterns, Pattern 1, vanilla):
     3D layer      Three.js canvas inside the hero
     Animation     GSAP intro + ScrollTrigger (animates plain state object S;
                   Three.js reads S each frame, so no library fights over
                   the same property)
     UI layer      Plain HTML/CSS (nav, text), glass nav via scroll class
   ========================================================== */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isSmall = window.matchMedia('(max-width: 768px)').matches;

  /* ---------- Glass nav ---------- */
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('nav-toggle');

  function onScroll() {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.addEventListener('click', function () {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });
  nav.querySelectorAll('.nav__links a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });

  /* ---------- Text intro + scroll fade (works without WebGL) ---------- */
  var hasGsap = !!window.gsap;
  var hasST = hasGsap && !!window.ScrollTrigger;
  if (hasST) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    // Phones: the URL bar showing/hiding resizes the viewport — don't re-measure on every scroll
    window.ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* Smoothed scroll velocity (px/frame) — drives numeral spin + dust streaks, finger or wheel */
  var scrollVel = 0;
  if (!reduceMotion) {
    (function trackScroll() {
      var last = window.scrollY;
      (function loop() {
        requestAnimationFrame(loop);
        var y = window.scrollY, d = y - last;
        last = y;
        scrollVel += (d - scrollVel) * 0.12;
      })();
    })();
  }

  /* Sections are position:sticky on desktop, so ScrollTrigger positions are
     computed from layout heights (sticky-safe) instead of element rects. */
  function heroH() { return document.getElementById('top').offsetHeight; }

  if (hasGsap && !reduceMotion) {
    window.gsap.from('[data-reveal]', {
      y: 26, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1, delay: 0.35
    });
  }
  if (hasST && !reduceMotion && window.matchMedia('(min-width: 961px)').matches) {
    window.gsap.to('[data-fade]', {
      opacity: 0, y: -40, ease: 'none',
      scrollTrigger: { start: function () { return heroH() * 0.12; }, end: function () { return heroH() * 0.75; }, scrub: true, invalidateOnRefresh: true }
    });
  }

  /* Features that don't need WebGL (function declarations are hoisted) */
  initDepthStack();
  initMap();
  initLivePause();
  initProgram();
  initGallery();
  initRsvp();

  /* ---------- WebGL capability ---------- */
  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }
  if (!window.THREE || !window.GLYPHS || !hasWebGL()) {
    docEl.classList.add('no-webgl');
    return;
  }

  /* ==========================================================
     THREE.JS SCENE
     ========================================================== */
  var THREE = window.THREE;
  var hero = document.getElementById('top');
  var canvas = document.getElementById('hero-canvas');
  var anchor = document.getElementById('numeral-anchor');
  var label = document.getElementById('hero-label');

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    docEl.classList.add('no-webgl');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  /* Shared animation state — GSAP writes, Three.js reads */
  var S = { intro: 0, rays: 0, p: 0 };
  var ptr = { x: 0, y: 0, tx: 0, ty: 0, lastMove: -10 };
  var base = { x: 0, y: 0, scale: 1 };
  var halfW = 1, halfH = 1;

  /* ---------- Environment (for metal reflections, no external HDR file) ---------- */
  (function buildEnvironment() {
    var pmrem = new THREE.PMREMGenerator(renderer);
    var env = new THREE.Scene();
    env.background = new THREE.Color(0x1a0409);
    function panel(w, h, color, intensity, x, y, z) {
      var m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
      );
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      env.add(m);
    }
    panel(14, 5, 0xfff0d6, 7, 0, 9, 6);     // warm key from above
    panel(5, 12, 0xd9a441, 5, -9, 0, 3);    // gold from the left
    panel(5, 12, 0xffe2b0, 3.5, 9, 1, 4);   // soft warm right
    panel(14, 4, 0x6a1a30, 2, 0, -8, 4);    // maroon bounce from below
    scene.environment = pmrem.fromScene(env, 0.04).texture;
    pmrem.dispose();
  })();

  /* ---------- Lights ---------- */
  scene.add(new THREE.AmbientLight(0xffe6c8, 0.28));
  var keyLight = new THREE.DirectionalLight(0xfff0dc, 1.1);
  keyLight.position.set(-4, 6, 8);
  scene.add(keyLight);
  var sweepLight = new THREE.PointLight(0xffd9a0, 2.2, 40);
  sweepLight.position.set(0, 0, 5);
  scene.add(sweepLight);

  /* ---------- Numeral "16" from glyph outlines ---------- */
  function pathToShapes(d, scale, offsetUnits) {
    var sp = new THREE.ShapePath();
    var t = d.match(/[MmLlHhVvCcQqZz]|-?\d*\.?\d+/g);
    var i = 0, cmd = null, x = 0, y = 0;
    function num() { return parseFloat(t[i++]); }
    function X(v) { return (v + offsetUnits) * scale; }
    function Y(v) { return v * scale; }
    while (i < t.length) {
      if (/[A-Za-z]/.test(t[i])) cmd = t[i++];
      switch (cmd) {
        case 'M': x = num(); y = num(); sp.moveTo(X(x), Y(y)); cmd = 'L'; break;
        case 'L': x = num(); y = num(); sp.lineTo(X(x), Y(y)); break;
        case 'H': x = num(); sp.lineTo(X(x), Y(y)); break;
        case 'V': y = num(); sp.lineTo(X(x), Y(y)); break;
        case 'Q': {
          var qx1 = num(), qy1 = num(); x = num(); y = num();
          sp.quadraticCurveTo(X(qx1), Y(qy1), X(x), Y(y)); break;
        }
        case 'C': {
          var cx1 = num(), cy1 = num(), cx2 = num(), cy2 = num(); x = num(); y = num();
          sp.bezierCurveTo(X(cx1), Y(cy1), X(cx2), Y(cy2), X(x), Y(y)); break;
        }
        case 'Z': break;
        default: i++; // unknown token guard
      }
    }
    return sp.toShapes(false);
  }

  var faceMat = new THREE.MeshStandardMaterial({
    color: 0xf1e6d2, roughness: 0.4, metalness: 0.12, envMapIntensity: 0.85,
    emissive: 0x3a1c0c, emissiveIntensity: 0.22
  });
  var sideMat = new THREE.MeshStandardMaterial({
    color: 0xd9ac5e, roughness: 0.26, metalness: 1, envMapIntensity: 1.5
  });

  var numeralRoot = new THREE.Group();   // moved / scaled / rotated each frame
  var numeral = new THREE.Group();       // holds the two digit meshes (centered)
  numeralRoot.add(numeral);
  scene.add(numeralRoot);

  var numeralW = 1.5, numeralH = 1;
  (function buildNumeral() {
    var G = window.GLYPHS;
    var s = 1 / 1352;
    var opts = { depth: 0.2, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.016, bevelSegments: 6, curveSegments: 28 };
    var x = 0;
    ['1', '6'].forEach(function (ch, idx) {
      var geo = new THREE.ExtrudeGeometry(pathToShapes(G.glyphs[ch].d, s, x), opts);
      geo.translate(0, 0, -opts.depth / 2);
      numeral.add(new THREE.Mesh(geo, [faceMat, sideMat]));
      x += G.glyphs[ch].w - (idx === 0 ? 70 : 0);
    });
    var box = new THREE.Box3().setFromObject(numeral);
    var c = box.getCenter(new THREE.Vector3());
    var size = box.getSize(new THREE.Vector3());
    numeral.children.forEach(function (m) { m.position.sub(c); });
    numeralW = size.x; numeralH = size.y;
    anchor.style.aspectRatio = (numeralW / numeralH).toFixed(4);
  })();

  /* ---------- Sunburst fan (emblem above the numeral) ---------- */
  var fanGroup = new THREE.Group();
  var fanLineMat = new THREE.LineBasicMaterial({ color: 0xdcb064, transparent: true, opacity: 0 });
  var fanArcMat = new THREE.LineBasicMaterial({ color: 0xdcb064, transparent: true, opacity: 0 });
  var fanDot;
  (function buildFan() {
    var R = numeralH * 0.5;
    var n = 33, pts = [];
    for (var i = 0; i < n; i++) {
      var a = THREE.MathUtils.lerp(Math.PI * 0.06, Math.PI * 0.94, i / (n - 1));
      var len = R * (i % 2 ? 0.74 : 1) * (0.9 + 0.1 * Math.sin(i * 1.7));
      var r0 = R * 0.1;
      var z = Math.sin(i * 2.3) * R * 0.05;
      pts.push(Math.cos(a) * r0, Math.sin(a) * r0, z, Math.cos(a) * len, Math.sin(a) * len, z);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    fanGroup.add(new THREE.LineSegments(g, fanLineMat));

    var arc = [];
    for (var k = 0; k <= 64; k++) {
      var aa = THREE.MathUtils.lerp(Math.PI * 0.04, Math.PI * 0.96, k / 64);
      arc.push(Math.cos(aa) * R * 0.74, Math.sin(aa) * R * 0.74, 0);
    }
    var ag = new THREE.BufferGeometry();
    ag.setAttribute('position', new THREE.Float32BufferAttribute(arc, 3));
    fanGroup.add(new THREE.Line(ag, fanArcMat));

    fanDot = new THREE.Mesh(new THREE.SphereGeometry(R * 0.045, 24, 16), sideMat);
    fanGroup.add(fanDot);
  })();
  numeralRoot.add(fanGroup);

  /* ---------- Large faint halo rays behind everything ---------- */
  var halo;
  var haloMat = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  (function buildHalo() {
    var n = isSmall ? 60 : 110, pos = [], col = [];
    var inner = numeralH * 0.85;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.02;
      var outer = numeralH * (3.2 + Math.random() * 3.2);
      pos.push(Math.cos(a) * inner, Math.sin(a) * inner, 0, Math.cos(a) * outer, Math.sin(a) * outer, 0);
      var b = 0.1 + Math.random() * 0.22;
      col.push(0.84 * b, 0.66 * b, 0.36 * b, 0, 0, 0); // fades to black outward
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    halo = new THREE.LineSegments(g, haloMat);
    halo.position.z = -2.4;
    scene.add(halo);
  })();

  /* ---------- Layout: map the HTML anchor to world space ---------- */
  var fanOriginLocalY = numeralH / 2 + numeralH * 0.14;

  function layout() {
    var w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;

    var r = anchor.getBoundingClientRect();
    var hr = hero.getBoundingClientRect();
    var cx = (r.left - hr.left + r.width / 2) / w;
    var cy = (r.top - hr.top + r.height / 2) / h;
    base.x = (cx - 0.5) * 2 * halfW;
    base.y = -(cy - 0.5) * 2 * halfH;
    base.scale = ((r.height / h) * 2 * halfH) / numeralH;

    // Put the fan base just above the eyebrow label so they read as one lockup
    if (label && r.height > 0) {
      var lr = label.getBoundingClientRect();
      var gapPx = (r.top - lr.top) + 14;
      fanOriginLocalY = numeralH / 2 + (gapPx / r.height) * numeralH;
    }
    fanGroup.position.y = fanOriginLocalY;
    halo.scale.setScalar(base.scale);
    renderOnce();
  }

  /* ---------- Per-frame update ---------- */
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  var lightTarget = new THREE.Vector3(0, 0, 5);

  function update(t) {
    ptr.x += (ptr.tx - ptr.x) * 0.06;
    ptr.y += (ptr.ty - ptr.y) * 0.06;

    var ie = easeOutCubic(S.intro);
    var p = S.p;

    numeralRoot.position.set(base.x + ptr.x * 0.1, base.y + p * halfH * 0.6 - (1 - ie) * 0.35, -p * 2.6);
    numeralRoot.scale.setScalar(base.scale * (0.84 + 0.16 * ie) * (1 - p * 0.22));
    numeralRoot.rotation.set(
      -ptr.y * 0.15 + p * 0.28,
      -(1 - ie) * 1.15 + ptr.x * 0.32 + Math.sin(t * 0.5) * 0.05 + p * 0.95 + Math.max(-0.5, Math.min(0.5, scrollVel * 0.012)),
      0
    );
    faceMat.opacity = 1;

    fanGroup.scale.setScalar(0.4 + 0.6 * S.rays);
    fanGroup.rotation.y = Math.sin(t * 0.35) * 0.12;
    fanLineMat.opacity = 0.92 * S.rays * (1 - p);
    fanArcMat.opacity = 0.38 * S.rays * (1 - p);

    halo.position.x = base.x;
    halo.position.y = base.y;
    halo.rotation.z = t * 0.018;
    haloMat.opacity = S.rays * (1 - p * 0.9);

    // Gold highlight follows the cursor; sweeps by itself when idle
    var idle = (t - ptr.lastMove) > 2.5;
    if (idle) {
      lightTarget.set(base.x + Math.sin(t * 0.7) * halfW * 0.22, base.y + Math.cos(t * 0.5) * halfH * 0.25, 4.5);
    } else {
      lightTarget.set(ptr.x * halfW, ptr.y * halfH, 4.5);
    }
    sweepLight.position.lerp(lightTarget, 0.06);
  }

  /* ---------- Render loop (paused off-screen / tab hidden) ---------- */
  var clock = new THREE.Clock();
  var heroVisible = true;
  var raf = 0;

  var lastF = 0, slowF = 0, loweredQ = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!heroVisible || S.p >= 0.999) { lastF = 0; return; } // off-screen or fully covered by next section
    now = now || performance.now();
    if (lastF && !loweredQ) {
      slowF = (now - lastF) > 48 ? slowF + 1 : Math.max(0, slowF - 1);
      if (slowF > 45) { loweredQ = true; renderer.setPixelRatio(1); layout(); } // struggling: normal sharpness
    }
    lastF = now;
    update(clock.getElapsedTime());
    renderer.render(scene, camera);
  }
  function renderOnce() {
    if (!reduceMotion) return; // loop handles it
    update(0);
    renderer.render(scene, camera);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(hero);
  }

  /* ---------- Pointer: mouse parallax + touch drag ---------- */
  if (!reduceMotion) {
    var drag = { active: false, x: 0, tx: 0 };
    var clamp1 = function (v) { return Math.max(-1, Math.min(1, v)); };

    hero.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch') return;
      drag.active = true; drag.x = e.clientX; drag.tx = ptr.tx;
    }, { passive: true });

    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      if (e.pointerType === 'touch') {
        // finger drag: horizontal movement tilts the numeral (vertical = native scroll)
        if (!drag.active) return;
        ptr.tx = clamp1(drag.tx + (e.clientX - drag.x) / (r.width * 0.4));
        ptr.ty = 0;
        ptr.lastMove = clock.getElapsedTime();
        return;
      }
      ptr.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
      ptr.lastMove = clock.getElapsedTime();
    }, { passive: true });

    var endDrag = function (e) {
      if (e.pointerType === 'touch') { drag.active = false; ptr.tx = 0; ptr.ty = 0; } // springs back
    };
    hero.addEventListener('pointerup', endDrag);
    hero.addEventListener('pointercancel', endDrag);
    hero.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'touch') { ptr.tx = 0; ptr.ty = 0; }
    });
  }

  /* ---------- Resize + fonts ---------- */
  var resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 80);
  }
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(hero);
  else window.addEventListener('resize', onResize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  layout();


  /* ==========================================================
     GOLD DUST — one fixed canvas that lives across every section.
     Scroll drives depth-based parallax (near specks move faster).
     ========================================================== */
  function initDust() {
    var c = document.createElement('canvas');
    c.className = 'dust-canvas';
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);

    var r;
    try {
      r = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch (e) { c.remove(); return; }
    r.setPixelRatio(1); // specks are tiny and soft: normal sharpness is plenty and far cheaper
    r.setClearColor(0x000000, 0);

    var sc = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    cam.position.z = 14;
    var hH = 1, hW = 1;

    var U = {
      uTime: { value: 0 },
      uPix: { value: r.getPixelRatio() },
      uPointer: { value: new THREE.Vector2(99, 99) },
      uScroll: { value: 0 },
      uVel: { value: 0 },
      uOpacity: { value: 0 }
    };
    var n = isSmall ? 110 : 240;
    var pos = new Float32Array(n * 3), size = new Float32Array(n), seed = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = -6 + Math.random() * 10;
      size[i] = 0.5 + Math.random() * 1.5;
      seed[i] = Math.random();
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    var m = new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: [
        'uniform float uTime; uniform float uPix; uniform vec2 uPointer; uniform float uScroll; uniform float uVel;',
        'attribute float aSize; attribute float aSeed; varying float vA;',
        'void main(){',
        '  vec3 p = position;',
        '  float depth = (p.z + 6.0) / 10.0;',
        '  p.y = mod(p.y + uScroll * (0.35 + depth * 1.3) + 6.0, 12.0) - 6.0;',
        '  p.y += uVel * 0.014 * (0.3 + depth);',
        '  p.y += sin(uTime*0.25 + aSeed*6.283)*0.28;',
        '  p.x += cos(uTime*0.2 + aSeed*12.0)*0.18;',
        '  vec2 d = p.xy - uPointer; float l = length(d);',
        '  p.xy += normalize(d + vec2(1e-4)) * smoothstep(2.2, 0.0, l) * 0.7;',
        '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
        '  gl_Position = projectionMatrix * mv;',
        '  gl_PointSize = aSize * uPix * (9.0 / -mv.z) * (1.0 + min(abs(uVel) * 0.03, 1.2));',
        '  vA = 0.2 + 0.8 * (0.5 + 0.5 * sin(uTime*(0.5 + aSeed*1.5) + aSeed*40.0));',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform float uOpacity; varying float vA;',
        'void main(){',
        '  float d = length(gl_PointCoord - 0.5);',
        '  float a = smoothstep(0.5, 0.0, d); a *= a;',
        '  gl_FragColor = vec4(vec3(1.0, 0.78, 0.42) * a * vA * 1.3 * uOpacity, a * vA * uOpacity);',
        '}'
      ].join('\n')
    });
    sc.add(new THREE.Points(g, m));

    function resize() {
      var w = window.innerWidth, h = window.innerHeight;
      r.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      hH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.position.z;
      hW = hH * cam.aspect;
    }
    resize();
    window.addEventListener('resize', resize);

    if (!reduceMotion) {
      window.addEventListener('pointermove', function (e) {
        U.uPointer.value.set(
          ((e.clientX / window.innerWidth) * 2 - 1) * hW,
          -((e.clientY / window.innerHeight) * 2 - 1) * hH
        );
      }, { passive: true });
    }

    /* Run only when it adds something:
       - not while the RSVP section is on screen (people are typing there)
       - not while the browser tab is hidden
       - capped at ~30 fps
       - if the device cannot keep up, it switches itself off for good */
    var rsvpEl = document.getElementById('rsvp');
    var running = false, dead = false, rafId = 0;
    var lastDraw = 0, lastTick = 0, slowFrames = 0, rsvpOn = false;
    var t0 = performance.now();

    function drawFrame(now) {
      var t = (now - t0) / 1000;
      U.uTime.value = t;
      U.uScroll.value = (window.scrollY / window.innerHeight) * 3.2;
      U.uVel.value = Math.max(-60, Math.min(60, scrollVel));
      U.uOpacity.value += ((isSmall ? 0.6 : 0.85) * Math.min(1, t / 2.2) - U.uOpacity.value) * 0.1;
      r.render(sc, cam);
    }
    function loop(now) {
      if (!running) return;
      rafId = requestAnimationFrame(loop);
      if (lastTick) {
        var gap = now - lastTick;
        slowFrames = gap > 48 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
        if (slowFrames > 45) { kill(); return; }
      }
      lastTick = now;
      if (now - lastDraw < 32) return;
      lastDraw = now;
      drawFrame(now);
    }
    function start() {
      if (running || dead) return;
      running = true; lastTick = 0;
      c.style.visibility = 'visible';
      rafId = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
      c.style.visibility = 'hidden';
    }
    function kill() { dead = true; stop(); if (c.parentNode) c.parentNode.removeChild(c); }
    function sync() { if (!dead && !document.hidden && !rsvpOn) start(); else stop(); }

    if (reduceMotion) {
      U.uOpacity.value = 0.6;
      drawFrame(t0);
      window.addEventListener('resize', function () { drawFrame(t0); });
      return;
    }
    document.addEventListener('visibilitychange', sync);
    if (rsvpEl && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        rsvpOn = entries[0].isIntersecting && entries[0].intersectionRatio > 0.1;
        sync();
      }, { threshold: [0, 0.1, 0.2] }).observe(rsvpEl);
    }
    sync();
  }

  /* ==========================================================
     3D DEPTH STACK — sections behave like cards in a deck.
     The section being left tilts back, shrinks and dims while the
     next one slides over it. Small screens get a simpler 3D reveal.
     ========================================================== */
  function initDepthStack() {
    var decks = Array.prototype.slice.call(document.querySelectorAll('.deck'));
    decks.forEach(function (el) {
      var shade = document.createElement('div');
      shade.className = 'deck__shade';
      shade.setAttribute('aria-hidden', 'true');
      el.appendChild(shade);
    });
    if (!hasST || reduceMotion) return;

    var gsap = window.gsap;
    var mm = gsap.matchMedia();
    function naturalTop(i) {
      var y = 0;
      for (var k = 0; k < i; k++) y += decks[k].offsetHeight;
      return y;
    }

    mm.add('(min-width: 961px) and (min-height: 640px)', function () {
      decks.forEach(function (el, i) {
        var next = decks[i + 1];
        if (!next || el.hasAttribute('data-flow')) return;
        gsap.set(el, { transformPerspective: 1400, transformOrigin: '50% 100%' });
        var tl = gsap.timeline({
          scrollTrigger: {
            start: function () { return naturalTop(i + 1) - window.innerHeight; },
            end: function () { return naturalTop(i + 1); },
            scrub: true, invalidateOnRefresh: true
          }
        });
        tl.to(el, { scale: 0.9, rotationX: 7, z: -160, ease: 'none' }, 0)
          .to(el.querySelector('.deck__shade'), { opacity: 0.62, ease: 'none' }, 0);
      });
    });

    /* Phones / short screens: sections tilt back as they leave and unfold toward you
       as they arrive. Scrubbed to the finger, so it follows your scroll continuously. */
    mm.add('(max-width: 960px), (max-height: 639px)', function () {
      decks.forEach(function (el, i) {
        var shade = el.querySelector('.deck__shade');
        var inner = el.querySelector('.deck__inner');

        if (i > 0 && inner) {
          gsap.fromTo(inner,
            { rotationX: -10, scale: 0.94, y: 36, opacity: 0.35, transformPerspective: 900, transformOrigin: '50% 0%' },
            { rotationX: 0, scale: 1, y: 0, opacity: 1, ease: 'none',
              scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 35%', scrub: 0.5 } });
        }
        if (i < decks.length - 1) {
          gsap.set(el, { transformPerspective: 900, transformOrigin: '50% 100%' });
          var tl = gsap.timeline({
            scrollTrigger: { trigger: el, start: 'bottom bottom', end: 'bottom 15%', scrub: 0.5 }
          });
          tl.fromTo(el, { rotationX: 0, scale: 1, z: 0 },
                    { rotationX: 7, scale: 0.93, z: -90, ease: 'none', immediateRender: false }, 0)
            .fromTo(shade, { opacity: 0 }, { opacity: 0.55, ease: 'none', immediateRender: false }, 0);
        }
      });

      var mapWrap = document.querySelector('.venue__map');
      if (mapWrap) {
        gsap.fromTo(mapWrap,
          { rotationX: 14, y: 40, opacity: 0.3, transformPerspective: 900, transformOrigin: '50% 0%' },
          { rotationX: 0, y: 0, opacity: 1, ease: 'none',
            scrollTrigger: { trigger: mapWrap, start: 'top 95%', end: 'top 55%', scrub: 0.5 } });
      }
    });

    /* Venue: map card swings in from the side as the section arrives */
    var wrap = document.querySelector('.venue__map');
    if (wrap) {
      mm.add('(min-width: 961px) and (min-height: 640px)', function () {
        gsap.fromTo(wrap,
          { rotationY: -18, rotationX: 6, y: 50, opacity: 0.25, transformPerspective: 1200 },
          { rotationY: 0, rotationX: 0, y: 0, opacity: 1, ease: 'none',
            scrollTrigger: {
              start: function () { return naturalTop(decks.indexOf(document.getElementById('venue'))) - window.innerHeight * 0.95; },
              end: function () { return naturalTop(decks.indexOf(document.getElementById('venue'))) - window.innerHeight * 0.3; },
              scrub: true, invalidateOnRefresh: true
            } });
      });
    }
  }

  /* ==========================================================
     MAP CARD — cursor tilt + "tap to explore" shield
     ========================================================== */
  function initMap() {
    var wrap = document.querySelector('.venue__map');
    var card = document.querySelector('.map-card');
    var shield = document.querySelector('.map-card__shield');
    if (!wrap || !card) return;

    if (shield) {
      shield.addEventListener('click', function () {
        shield.hidden = true;
        card.classList.add('is-active');
      });
    }
    if (!hasGsap || reduceMotion || window.matchMedia('(hover: none)').matches) return;

    var gsap = window.gsap;
    gsap.set(card, { transformPerspective: 1100 });
    var rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
    var ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
    wrap.addEventListener('pointermove', function (e) {
      var b = wrap.getBoundingClientRect();
      ry(((e.clientX - b.left) / b.width - 0.5) * 10);
      rx(-((e.clientY - b.top) / b.height - 0.5) * 8);
    });
    wrap.addEventListener('pointerleave', function () { rx(0); ry(0); });
  }


  /* ==========================================================
     PROGRAM — "To Be Announced" lines rise and tilt into place
     ========================================================== */
  function deckTopOf(id) {
    var y = 0, decks = document.querySelectorAll('.deck');
    for (var k = 0; k < decks.length; k++) {
      if (decks[k].id === id) return y;
      y += decks[k].offsetHeight;
    }
    return y;
  }
  function initLivePause() {
    var el = document.querySelector('.program');
    if (!el || reduceMotion) return;
    if (!('IntersectionObserver' in window)) { el.classList.add('is-live'); return; }
    new IntersectionObserver(function (entries) {
      el.classList.toggle('is-live', entries[0].isIntersecting);
    }, { threshold: 0 }).observe(el);
  }

  function initProgram() {
    if (!hasGsap || reduceMotion) return;
    var lines = document.querySelectorAll('.program__line');
    if (!lines.length) return;
    var vars = {
      yPercent: 70, rotationX: -75, opacity: 0, transformPerspective: 800, transformOrigin: '50% 100%',
      duration: 1.3, ease: 'power4.out', stagger: 0.2
    };
    if (hasST) {
      // numeric positions: sticky-safe (see heroH note)
      vars.scrollTrigger = {
        start: function () {
          var small = window.matchMedia('(max-width: 960px), (max-height: 639px)').matches;
          return deckTopOf('program') - window.innerHeight * (small ? 0.55 : 0.4);
        },
        invalidateOnRefresh: true, toggleActions: 'play none none none'
      };
    }
    window.gsap.from(lines, vars);
  }

  /* ==========================================================
     GALLERY — 3D coverflow, "view all" drop-down, photo viewer
     ========================================================== */
  function initGallery() {
    var anchors = Array.prototype.slice.call(document.querySelectorAll('#gallery a[data-lb]'));
    if (!anchors.length) return;
    initLightbox(anchors);
    initMore();
    initTileReveal();
  }

  /* Highlight photos tilt into place as they scroll into view */
  function initTileReveal() {
    if (!hasST || reduceMotion || !window.gsap.utils) return;
    var tiles = document.querySelectorAll('#gallery-hl .tile');
    if (!tiles.length) return;
    window.gsap.set(tiles, { opacity: 0 });
    window.ScrollTrigger.batch(tiles, {
      start: 'top 92%', once: true,
      onEnter: function (batch) {
        window.gsap.fromTo(batch,
          { opacity: 0, y: 46, rotationX: -22, scale: 0.95, transformPerspective: 900, transformOrigin: '50% 100%' },
          { opacity: 1, y: 0, rotationX: 0, scale: 1, duration: 1, ease: 'power3.out', stagger: 0.09, overwrite: true });
      }
    });
  }

  /* "See more" reveals the rest and swaps itself for a sticky "Exit gallery" button */
  function initMore() {
    var btn = document.getElementById('more-btn');
    var more = document.getElementById('gallery-all');
    var exitBar = document.getElementById('exit-bar');
    var exitBtn = document.getElementById('exit-btn');
    var moreWrap = btn ? btn.parentNode : null;
    if (!btn || !more || !exitBar || !exitBtn) return;

    function refreshLater() {
      if (hasST) setTimeout(function () { window.ScrollTrigger.refresh(); }, reduceMotion ? 0 : 800);
    }
    function expand() {
      btn.setAttribute('aria-expanded', 'true');
      moreWrap.hidden = true;
      more.classList.add('is-open');
      exitBar.hidden = false;
      refreshLater();
    }
    function collapse() {
      btn.setAttribute('aria-expanded', 'false');
      more.classList.remove('is-open');
      exitBar.hidden = true;
      moreWrap.hidden = false;
      var g = document.getElementById('gallery');
      var top = g.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
      btn.focus({ preventScroll: true });
      refreshLater();
    }
    btn.addEventListener('click', expand);
    exitBtn.addEventListener('click', collapse);
  }

  /* ==========================================================
     RSVP — validation, submit to Google Sheet, thank-you state
     ========================================================== */
  function initRsvp() {
    var form = document.getElementById('rsvp-form');
    var card = document.getElementById('rsvp-card');
    if (!form || !card) return;

    var nameEl = document.getElementById('rsvp-name');
    var contactEl = document.getElementById('rsvp-contact');
    var ageEl = document.getElementById('rsvp-age');
    var errAge = document.getElementById('err-age');
    var fromEl = document.getElementById('rsvp-from');
    var invitedEl = document.getElementById('rsvp-invited');
    var msgEl = document.getElementById('rsvp-msg');
    var guestsEl = document.getElementById('rsvp-guests');
    var guestsField = document.getElementById('guests-field');
    var guestList = document.getElementById('guest-list');
    var guestHint = document.getElementById('guest-hint');
    var errName = document.getElementById('err-name');
    var errAtt = document.getElementById('err-att');
    var status = document.getElementById('rsvp-status');
    var submit = document.getElementById('rsvp-submit');
    var thanks = document.getElementById('rsvp-thanks');
    var thanksTitle = document.getElementById('thanks-title');
    var thanksText = document.getElementById('thanks-text');
    var demo = document.getElementById('thanks-demo');
    var again = document.getElementById('rsvp-again');

    /* Extra guests (guest 2, 3, ...). Data is kept in this array so lowering and
       raising the count again never wipes what someone already typed. */
    var guests = [];

    function attending() {
      var r = form.querySelector('input[name="attending"]:checked');
      return r ? r.value : '';
    }
    function clampGuests(v) {
      v = parseInt(v, 10);
      if (isNaN(v) || v < 1) v = 1;
      return Math.min(10, v);
    }
    // age is optional; when given it must be a whole number from 0 to 120
    function parseAge(txt) {
      var t = String(txt == null ? '' : txt).trim();
      if (t === '') return { ok: true, v: '' };
      if (!/^\d{1,3}$/.test(t) || Number(t) > 120) return { ok: false };
      return { ok: true, v: Number(t) };
    }
    function extraCount() { return attending() === 'No' ? 0 : clampGuests(guestsEl.value) - 1; }

    function buildCard(i) {
      var n = i + 2, id = 'g' + n;
      var g = guests[i];
      var fs = document.createElement('fieldset');
      fs.className = 'guest';
      fs.setAttribute('data-i', String(i));
      fs.innerHTML =
        '<legend>Guest ' + n + '</legend>' +
        '<div class="name-age">' +
          '<div class="field field--gname"><label for="' + id + '-name">Full name</label>' +
            '<input id="' + id + '-name" type="text" maxlength="80" autocomplete="off" aria-describedby="' + id + '-err">' +
            '<p class="field__err err-gname" id="' + id + '-err" role="alert"></p></div>' +
          '<div class="field field--gage"><label for="' + id + '-age">Age<span class="sr-only"> (optional)</span></label>' +
            '<input id="' + id + '-age" type="number" inputmode="numeric" min="0" max="120" step="1" autocomplete="off" aria-describedby="' + id + '-age-err">' +
            '<p class="field__err err-gage" id="' + id + '-age-err" role="alert"></p></div>' +
        '</div>' +
        '<div class="field"><label for="' + id + '-contact">Mobile number or email <span class="opt">(optional)</span></label>' +
          '<input id="' + id + '-contact" type="text" inputmode="email" maxlength="80" autocomplete="off"></div>' +
        '<div class="field field--from"><label for="' + id + '-from">Where are you from? <span class="opt">(optional)</span></label>' +
          '<input id="' + id + '-from" type="text" maxlength="80" autocomplete="off" placeholder="City, town or church"></div>' +
        '<div class="same"><input type="checkbox" id="' + id + '-same"><label for="' + id + '-same">Same place as mine</label></div>';

      var nameI = fs.querySelector('#' + id + '-name');
      var ageI = fs.querySelector('#' + id + '-age');
      var ageErr = fs.querySelector('#' + id + '-age-err');
      var contactI = fs.querySelector('#' + id + '-contact');
      var fromI = fs.querySelector('#' + id + '-from');
      var sameI = fs.querySelector('#' + id + '-same');
      var err = fs.querySelector('#' + id + '-err');

      nameI.value = g.name; ageI.value = g.age; contactI.value = g.contact; fromI.value = g.from; sameI.checked = g.same;
      if (g.same) { fromI.value = fromEl.value; fromI.readOnly = true; g.from = fromEl.value; }

      nameI.addEventListener('input', function () { g.name = nameI.value; err.textContent = ''; nameI.removeAttribute('aria-invalid'); });
      ageI.addEventListener('input', function () { g.age = ageI.value; ageErr.textContent = ''; ageI.removeAttribute('aria-invalid'); });
      contactI.addEventListener('input', function () { g.contact = contactI.value; });
      fromI.addEventListener('input', function () { g.from = fromI.value; });
      sameI.addEventListener('change', function () {
        g.same = sameI.checked;
        fromI.readOnly = g.same;
        if (g.same) { fromI.value = fromEl.value; g.from = fromEl.value; }
      });
      return fs;
    }

    function renderGuests() {
      var extra = extraCount();
      while (guests.length < extra) guests.push({ name: '', age: '', contact: '', from: '', same: false });
      while (guestList.children.length > extra) guestList.removeChild(guestList.lastChild);
      while (guestList.children.length < extra) guestList.appendChild(buildCard(guestList.children.length));
      guestHint.hidden = extra > 0;
    }
    function syncAttending() {
      guestsField.hidden = attending() === 'No';
      renderGuests();
    }

    // keep "same place as mine" guests in step with the main "where are you from"
    fromEl.addEventListener('input', function () {
      Array.prototype.forEach.call(guestList.children, function (fs) {
        var i = parseInt(fs.getAttribute('data-i'), 10);
        if (guests[i] && guests[i].same) {
          var inp = fs.querySelector('.field--from input');
          inp.value = fromEl.value; guests[i].from = fromEl.value;
        }
      });
    });

    document.getElementById('g-minus').addEventListener('click', function () {
      guestsEl.value = Math.max(1, clampGuests(guestsEl.value) - 1); renderGuests();
    });
    document.getElementById('g-plus').addEventListener('click', function () {
      guestsEl.value = Math.min(10, clampGuests(guestsEl.value) + 1); renderGuests();
    });
    guestsEl.addEventListener('change', function () { guestsEl.value = clampGuests(guestsEl.value); renderGuests(); });
    form.querySelectorAll('input[name="attending"]').forEach(function (r) {
      r.addEventListener('change', function () { errAtt.textContent = ''; syncAttending(); });
    });
    nameEl.addEventListener('input', function () { errName.textContent = ''; nameEl.removeAttribute('aria-invalid'); });
    ageEl.addEventListener('input', function () { errAge.textContent = ''; ageEl.removeAttribute('aria-invalid'); });

    function setStatus(msg, isErr) {
      status.textContent = msg || '';
      status.classList.toggle('is-error', !!isErr);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      setStatus('');
      var firstBad = null;
      var name = nameEl.value.trim();

      if (!name) {
        errName.textContent = 'Please tell us your name.';
        nameEl.setAttribute('aria-invalid', 'true');
        firstBad = nameEl;
      }
      var mainAge = parseAge(ageEl.value);
      if (!mainAge.ok) {
        errAge.textContent = 'Use 0 to 120.';
        ageEl.setAttribute('aria-invalid', 'true');
        if (!firstBad) firstBad = ageEl;
      }
      if (!attending()) {
        errAtt.textContent = 'Please let us know if you can come.';
        if (!firstBad) firstBad = form.querySelector('#att-yes');
      }
      // every added guest needs a name
      var party = [];
      if (attending() === 'Yes') {
        Array.prototype.forEach.call(guestList.children, function (fs) {
          var i = parseInt(fs.getAttribute('data-i'), 10);
          var g = guests[i];
          var nm = (g.name || '').trim();
          if (!nm) {
            var inp = fs.querySelector('.field--gname input');
            fs.querySelector('.err-gname').textContent = 'Please add this guest’s name.';
            inp.setAttribute('aria-invalid', 'true');
            if (!firstBad) firstBad = inp;
          }
          var ga = parseAge(g.age);
          if (!ga.ok) {
            var ai = fs.querySelector('.field--gage input');
            fs.querySelector('.err-gage').textContent = 'Use 0 to 120.';
            ai.setAttribute('aria-invalid', 'true');
            if (!firstBad) firstBad = ai;
          }
          party.push({ name: nm, age: ga.ok ? ga.v : '', contact: (g.contact || '').trim(), from: (g.from || '').trim() });
        });
      }
      if (firstBad) { firstBad.focus(); return; }

      var data = {
        name: name,
        age: mainAge.v,
        contact: contactEl.value.trim(),
        from: fromEl.value.trim(),
        invitedBy: invitedEl.value.trim(),
        attending: attending(),
        guests: attending() === 'Yes' ? clampGuests(guestsEl.value) : 0,
        party: party,                                   // the extra guests (guest 2, 3, ...)
        message: msgEl.value.trim(),
        website: form.elements.website.value,           // honeypot
        submittedAt: new Date().toISOString()
      };

      submit.disabled = true;
      submit.textContent = 'Sending…';

      var endpoint = (window.RSVP_ENDPOINT || '').trim();
      var send;
      if (endpoint) {
        // text/plain avoids a CORS preflight; Apps Script reads the raw body
        send = fetch(endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) });
      } else {
        send = new Promise(function (res) { setTimeout(res, 700); }); // preview mode: nothing is sent
      }

      send.then(function () {
        var first = name.split(/\s+/)[0];
        if (data.attending === 'Yes') {
          thanksTitle.textContent = 'See you there, ' + first + '!';
          thanksText.textContent = data.guests > 1
            ? 'We saved ' + data.guests + ' seats for your group on December 20. We can’t wait to celebrate with you.'
            : 'Your seat is saved for December 20. We can’t wait to celebrate with you.';
        } else {
          thanksTitle.textContent = 'Thank you, ' + first + '.';
          thanksText.textContent = 'We’re sorry you can’t make it, and we’re grateful you let us know. You will be in our hearts that day.';
        }
        demo.hidden = !!endpoint;
        form.hidden = true;
        thanks.hidden = false;
        thanks.focus({ preventScroll: true });
        var rc = card.getBoundingClientRect();
        if (rc.top < 0 || rc.bottom > window.innerHeight) {
          window.scrollTo({ top: window.scrollY + rc.top - Math.max(90, (window.innerHeight - rc.height) / 2), behavior: 'auto' });
        }
      }).catch(function () {
        setStatus('We couldn’t send your RSVP. Please check your connection and try again.', true);
      }).then(function () {
        submit.disabled = false;
        submit.textContent = 'Send my RSVP';
      });
    });

    again.addEventListener('click', function () {
      form.reset();
      errName.textContent = ''; errAge.textContent = ''; errAtt.textContent = '';
      guests = [];
      guestList.innerHTML = '';
      syncAttending();
      thanks.hidden = true;
      form.hidden = false;
      setStatus('');
      nameEl.focus();
    });

    /* Card: gentle 3D tilt with a mouse (never while typing) and a rise-in on scroll */
    if (hasGsap && !reduceMotion) {
      var gsap = window.gsap;
      /* Tilt only on a clean, untouched card. Any focus, typing or filled-in field freezes it flat
         (instantly, no easing), and it stays still until a few seconds after the last keystroke. */
      var tiltOk = !window.matchMedia('(hover: none)').matches;
      var lastTouch = -1e9, tiltRaf = 0, lastMove = null;
      var stage = card.parentNode;
      var dirty = function () {
        return !!(nameEl.value || ageEl.value || contactEl.value || fromEl.value || invitedEl.value || msgEl.value ||
                  attending() || guestList.children.length);
      };
      var tiltAllowed = function () {
        if (!tiltOk) return false;
        if (performance.now() - lastTouch < 3000) return false;
        if (!thanks.hidden) return true;                 // already sent: nothing left to disturb
        return !card.matches(':focus-within') && !dirty();
      };
      var freezeCard = function () {
        gsap.killTweensOf(card);
        gsap.set(card, { rotationX: 0, rotationY: 0 });
      };
      if (tiltOk) {
        gsap.set(card, { transformPerspective: 1100 });
        ['focusin', 'keydown', 'input', 'pointerdown'].forEach(function (ev) {
          card.addEventListener(ev, function () { lastTouch = performance.now(); freezeCard(); });
        });
        var applyTilt = function () {
          tiltRaf = 0;
          if (!lastMove || !tiltAllowed()) return;
          var b = stage.getBoundingClientRect();
          gsap.to(card, {
            rotationY: ((lastMove.clientX - b.left) / b.width - 0.5) * 7,
            rotationX: -((lastMove.clientY - b.top) / b.height - 0.5) * 5,
            duration: 0.6, ease: 'power3.out', overwrite: true
          });
        };
        stage.addEventListener('pointermove', function (e) {
          if (!tiltAllowed()) return;
          lastMove = e;
          if (!tiltRaf) tiltRaf = requestAnimationFrame(applyTilt);
        }, { passive: true });
        stage.addEventListener('pointerleave', function () {
          lastMove = null;
          if (tiltAllowed()) gsap.to(card, { rotationX: 0, rotationY: 0, duration: 0.6, ease: 'power3.out', overwrite: true });
        });
      }
      var rise = { y: 60, rotationX: 14, opacity: 0, transformPerspective: 1000, transformOrigin: '50% 100%', duration: 1.2, ease: 'power3.out' };
      if (hasST) {
        rise.scrollTrigger = {
          start: function () { return deckTopOf('rsvp') - window.innerHeight * 0.45; },
          invalidateOnRefresh: true, toggleActions: 'play none none none'
        };
      }
      gsap.from(card.parentNode, rise);
    }
  }

  function initLightbox(anchors) {
    var box = document.getElementById('lightbox');
    var img = document.getElementById('lb-img');
    var count = document.getElementById('lb-count');
    var closeBtn = document.getElementById('lb-close');
    var prevBtn = document.getElementById('lb-prev');
    var nextBtn = document.getElementById('lb-next');
    var stage = document.getElementById('lb-stage');
    var idx = 0, opener = null, isOpen = false;

    function show(i, instant) {
      idx = (i + anchors.length) % anchors.length;
      var a = anchors[idx];
      var src = a.getAttribute('href');
      var alt = a.querySelector('img').getAttribute('alt') || '';
      function apply() {
        img.src = src; img.alt = alt;
        count.textContent = (idx + 1) + ' / ' + anchors.length;
        img.classList.remove('is-swapping');
      }
      if (instant || reduceMotion) { apply(); }
      else { img.classList.add('is-swapping'); setTimeout(apply, 180); }
      // warm the neighbours
      [idx - 1, idx + 1].forEach(function (n) {
        var im = new Image(); im.src = anchors[(n + anchors.length) % anchors.length].getAttribute('href');
      });
    }
    function open(i, from) {
      opener = from || document.activeElement;
      box.hidden = false;
      document.documentElement.classList.add('lb-open');
      show(i, true);
      requestAnimationFrame(function () { box.classList.add('is-open'); });
      isOpen = true;
      closeBtn.focus();
    }
    function close() {
      if (!isOpen) return;
      isOpen = false;
      box.classList.remove('is-open');
      document.documentElement.classList.remove('lb-open');
      setTimeout(function () { box.hidden = true; img.removeAttribute('src'); }, reduceMotion ? 0 : 300);
      if (opener && opener.focus) opener.focus();
    }

    anchors.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        open(parseInt(a.getAttribute('data-lb'), 10), a);
      });
    });
    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function () { show(idx - 1); });
    nextBtn.addEventListener('click', function () { show(idx + 1); });
    box.addEventListener('click', function (e) { if (e.target === box || e.target === stage) close(); });
    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'Tab') { // keep focus inside the dialog
        var f = [closeBtn, prevBtn, nextBtn], pos = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(pos + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });

    /* Swipe: sideways = next/previous, downward = close */
    var sw = { id: null, x: 0, y: 0 };
    stage.addEventListener('pointerdown', function (e) { sw.id = e.pointerId; sw.x = e.clientX; sw.y = e.clientY; });
    stage.addEventListener('pointerup', function (e) {
      if (sw.id !== e.pointerId) return;
      var dx = e.clientX - sw.x, dy = e.clientY - sw.y;
      sw.id = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) show(idx + (dx < 0 ? 1 : -1));
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.2) close();
    });
    stage.addEventListener('pointercancel', function () { sw.id = null; });

    return { open: open };
  }

  /* ---------- Start ---------- */
  if (reduceMotion) {
    S.intro = 1; S.rays = 1; S.p = 0;
    renderOnce();
  } else {
    if (hasGsap) {
      window.gsap.to(S, { intro: 1, duration: 2.4, ease: 'power2.out', delay: 0.15 });
      window.gsap.to(S, { rays: 1, duration: 2.2, ease: 'power2.out', delay: 0.7 });
      if (hasST) {
        window.gsap.to(S, {
          p: 1, ease: 'none',
          scrollTrigger: { start: 0, end: function () { return heroH(); }, scrub: 0.8, invalidateOnRefresh: true }
        });
      }
    } else {
      S.intro = 1; S.rays = 1;
    }
    frame();
  }

  initDust();
})();