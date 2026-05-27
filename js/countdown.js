/* ============================================================
   COUNTDOWN.JS — Daisuki Confeitaria
   Brigadeiro 3D interativo (Three.js) + countdown
   ============================================================ */

'use strict';

(function () {

  /* ─── Data do sorteio ──────────────────────────────────── */
  const RAFFLE_DATE = new Date('2026-06-15T11:00:00.000Z');

  /* ─── Números da URL ───────────────────────────────────── */
  const params  = new URLSearchParams(window.location.search);
  const rawNums = params.get('numeros') || params.get('numero') || '';
  const numeros = rawNums
    ? decodeURIComponent(rawNums).split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const numsLabel = document.getElementById('cd-nums-label');
  if (numsLabel && numeros.length) {
    numsLabel.textContent = numeros.join(' · ');
  }

  /* ═══════════════════════════════════════════════════════
     GRAIN
  ═══════════════════════════════════════════════════════ */
  (function initGrain() {
    const canvas = document.getElementById('grain-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let last = 0;
    const IV = 1000 / 12;

    function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }

    function tick(ts) {
      if (ts - last >= IV) {
        last = ts;
        const d = ctx.createImageData(canvas.width, canvas.height);
        for (let i = 0; i < d.data.length; i += 4) {
          const v = (Math.random() * 255) | 0;
          d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
          d.data[i + 3] = 255;
        }
        ctx.putImageData(d, 0, 0);
      }
      requestAnimationFrame(tick);
    }

    resize();
    requestAnimationFrame(tick);
    window.addEventListener('resize', resize, { passive: true });
  })();

  /* ═══════════════════════════════════════════════════════
     BRIGADEIRO 3D
     Esfera de chocolate escuro com iluminação quente.
     Drag + inércia = sensação de girar um planeta.
  ═══════════════════════════════════════════════════════ */
  (function initBrigadeiro() {
    if (typeof THREE === 'undefined') return;

    const el = document.getElementById('brigadeiro-canvas');
    if (!el) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function getSize() {
      /* ocupa ~52% da altura, limitado por 76% da largura e 560px */
      return Math.round(Math.min(innerWidth * 0.76, innerHeight * 0.52, 560));
    }

    /* ── Renderer ─────────────────────────────────────────── */
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true });
    } catch (e) { return; }

    renderer.setPixelRatio(DPR);
    renderer.setClearColor(0x000000, 0);

    /* ── Scene + Camera ───────────────────────────────────── */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.z = 5;

    /* ── Iluminação quente, de confeitaria ────────────────── */
    scene.add(new THREE.AmbientLight(0xFFF8F0, 0.55));

    const mainL = new THREE.DirectionalLight(0xFFFAF2, 2.4);
    mainL.position.set(3, 5, 4);
    scene.add(mainL);

    /* rim dourado-caramelo vindo de baixo-trás */
    const rimL = new THREE.PointLight(0xC8901A, 1.6, 18);
    rimL.position.set(-4, -1.5, -2.5);
    scene.add(rimL);

    /* fill suave rosado */
    const fillL = new THREE.DirectionalLight(0xF8E0D5, 0.3);
    fillL.position.set(-2, 1, 3);
    scene.add(fillL);

    /* ── Brigadeiro (esfera de chocolate) ─────────────────── */
    const geo = new THREE.SphereGeometry(1.85, 96, 96);
    const mat = new THREE.MeshPhongMaterial({
      color:     new THREE.Color(0x2C1810),
      specular:  new THREE.Color(0xA06830),
      shininess: 120,
      emissive:  new THREE.Color(0x080201),
    });
    const sphere = new THREE.Mesh(geo, mat);
    scene.add(sphere);

    /* ── Drag-to-rotate com inércia ───────────────────────── */
    let drag = false;
    let px = 0, py = 0;
    let vx = 0, vy = 0;
    const SENS = 0.006;  // sensibilidade ao arrastar
    const FRIC = 0.92;   // fricção (decaimento da inércia)
    const AUTO = 0.0025; // rotação automática suave no eixo Y

    function down(e) {
      drag = true;
      const t = e.touches ? e.touches[0] : e;
      px = t.clientX; py = t.clientY;
      vx = vy = 0;
    }
    function move(e) {
      if (!drag) return;
      const t = e.touches ? e.touches[0] : e;
      vy = (t.clientX - px) * SENS;
      vx = (t.clientY - py) * SENS;
      sphere.rotation.y += vy;
      sphere.rotation.x += vx;
      px = t.clientX; py = t.clientY;
    }
    function up() { drag = false; }

    el.addEventListener('mousedown',  down);
    el.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('mousemove',  move);
    window.addEventListener('mouseup',    up);
    window.addEventListener('touchmove',  move, { passive: true });
    window.addEventListener('touchend',   up);

    el.style.cursor = 'grab';
    el.addEventListener('mousedown', () => { el.style.cursor = 'grabbing'; });
    window.addEventListener('mouseup', () => { el.style.cursor = 'grab'; });

    /* ── Resize ───────────────────────────────────────────── */
    function applySize() {
      const s = getSize();
      renderer.setSize(s, s);
      el.style.width  = s + 'px';
      el.style.height = s + 'px';
    }
    applySize();
    window.addEventListener('resize', applySize, { passive: true });

    /* ── Loop ─────────────────────────────────────────────── */
    (function animate() {
      requestAnimationFrame(animate);
      if (!drag) {
        vx *= FRIC; vy *= FRIC;
        sphere.rotation.x += vx;
        sphere.rotation.y += vy + AUTO;
      }
      renderer.render(scene, camera);
    })();
  })();

  /* ═══════════════════════════════════════════════════════
     COUNTDOWN
  ═══════════════════════════════════════════════════════ */
  (function initCountdown() {
    const D = document.getElementById('cd-days');
    const H = document.getElementById('cd-hours');
    const M = document.getElementById('cd-minutes');
    const S = document.getElementById('cd-seconds');

    function pad(n) { return String(Math.max(0, n)).padStart(2, '0'); }

    function pop(el) {
      if (!el) return;
      el.classList.add('pop');
      setTimeout(() => el.classList.remove('pop'), 140);
    }

    let prev = {};

    function tick() {
      const diff = RAFFLE_DATE.getTime() - Date.now();

      if (diff <= 0) {
        [D, H, M, S].forEach(el => { if (el) el.textContent = '00'; });
        const msg = document.getElementById('cd-status-msg');
        if (msg) msg.textContent = '🎉 O sorteio foi realizado! Acompanhe o Instagram.';
        return;
      }

      const total = Math.floor(diff / 1000);
      const d = Math.floor(total / 86400);
      const h = Math.floor((total % 86400) / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;

      [[D, d, 'days'], [H, h, 'hours'], [M, m, 'minutes'], [S, s, 'seconds']]
        .forEach(([el, v, k]) => {
          const f = pad(v);
          if (el && el.textContent !== f) {
            el.textContent = f;
            if (prev[k] !== v) pop(el);
          }
        });

      prev = { days: d, hours: h, minutes: m, seconds: s };
      setTimeout(tick, 1000);
    }

    tick();
  })();

})();
