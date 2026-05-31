/* ============================================================
   COUNTDOWN.JS — Daisuki Confeitaria
   Consulta por email · Brigadeiro 3D · Countdown
   ============================================================ */

'use strict';

/* ── Consulta de números por email ────────────────────────── */
(function initConsulta() {
  const overlay    = document.getElementById('cd-login-overlay');
  const emailInput = document.getElementById('cd-login-email');
  const btn        = document.getElementById('cd-login-btn');
  const msgEl      = document.getElementById('cd-login-msg');
  const numsLabel  = document.getElementById('cd-nums-label');

  /* Números passados via URL (recém cadastrado) */
  const urlParams = new URLSearchParams(window.location.search);
  const urlNums   = urlParams.get('numeros') || urlParams.get('numero') || '';

  function showParticipante(nome, numeros) {
    if (numsLabel) numsLabel.textContent = numeros.join(' · ');

    const section = document.getElementById('cd-tickets-section');
    const list    = document.getElementById('cd-tickets-list');
    const nameEl  = document.getElementById('cd-participant-name');

    if (nameEl && nome) { nameEl.textContent = nome; nameEl.hidden = false; }

    if (section && list) {
      list.innerHTML = numeros.map((n) => `<li class="cd-ticket-num">${n}</li>`).join('');
      section.hidden = false;
    }

    if (overlay) overlay.hidden = true;
  }

  /* Se veio com URL params, esconde overlay e mostra números */
  if (urlNums) {
    if (overlay) overlay.hidden = true;
    const nums = decodeURIComponent(urlNums).split(',').map((s) => s.trim()).filter(Boolean);
    /* nome ainda não disponível via URL — busca pelo email se possível, senão mostra só números */
    showParticipante('', nums);
  } else {
    if (overlay) overlay.hidden = false;
  }

  /* Busca pelo email no servidor */
  async function buscarPorEmail(email) {
    const res  = await fetch(`/api/consulta?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  }

  if (btn) {
    btn.addEventListener('click', async () => {
      const email = emailInput?.value?.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (msgEl) msgEl.textContent = 'Digite um e-mail válido.';
        return;
      }

      btn.disabled    = true;
      btn.textContent = 'Buscando...';
      if (msgEl) msgEl.textContent = '';

      try {
        const { ok, status, data } = await buscarPorEmail(email);

        if (ok && data.nome) {
          showParticipante(data.nome, data.numeros || []);
        } else if (status === 404) {
          if (msgEl) msgEl.textContent = 'E-mail não encontrado. Verifique se é o mesmo usado no cadastro.';
        } else {
          if (msgEl) msgEl.textContent = 'Erro ao buscar. Tente novamente.';
        }
      } catch {
        if (msgEl) msgEl.textContent = 'Erro de conexão. Tente novamente.';
      }

      btn.disabled    = false;
      btn.textContent = 'Ver meus números';
    });

    emailInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btn.click();
    });
  }
})();

/* ── Grain ────────────────────────────────────────────────── */
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

/* ── Brigadeiro 3D ────────────────────────────────────────── */
(function initBrigadeiro() {
  if (typeof THREE === 'undefined') return;

  const el = document.getElementById('brigadeiro-canvas');
  if (!el) return;

  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function getSize() {
    return Math.round(Math.min(innerWidth * 0.76, innerHeight * 0.52, 560));
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true });
  } catch (e) { return; }

  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.z = 5;

  scene.add(new THREE.AmbientLight(0xFFF8F0, 0.55));

  const mainL = new THREE.DirectionalLight(0xFFFAF2, 2.4);
  mainL.position.set(3, 5, 4);
  scene.add(mainL);

  const rimL = new THREE.PointLight(0xC8901A, 1.6, 18);
  rimL.position.set(-4, -1.5, -2.5);
  scene.add(rimL);

  const fillL = new THREE.DirectionalLight(0xF8E0D5, 0.3);
  fillL.position.set(-2, 1, 3);
  scene.add(fillL);

  const geo    = new THREE.SphereGeometry(1.85, 96, 96);
  const mat    = new THREE.MeshPhongMaterial({
    color:     new THREE.Color(0x2C1810),
    specular:  new THREE.Color(0xA06830),
    shininess: 120,
    emissive:  new THREE.Color(0x080201),
  });
  const sphere = new THREE.Mesh(geo, mat);
  scene.add(sphere);

  let drag = false;
  let px = 0, py = 0;
  let vx = 0, vy = 0;
  const SENS = 0.006;
  const FRIC = 0.92;
  const AUTO = 0.0025;

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

  function applySize() {
    const s = getSize();
    renderer.setSize(s, s);
    el.style.width  = s + 'px';
    el.style.height = s + 'px';
    const outer = el.closest('.brigadeiro-outer');
    if (outer) { outer.style.width = s + 'px'; outer.style.height = s + 'px'; }
  }
  applySize();
  window.addEventListener('resize', applySize, { passive: true });

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

/* ── Countdown ────────────────────────────────────────────── */
(function initCountdown() {
  const RAFFLE_DATE = new Date('2026-06-01T09:00:00.000Z'); /* 18h00 JST */

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
      [D, H, M, S].forEach((el) => { if (el) el.textContent = '00'; });
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
