/* ============================================================
   COUNTDOWN.JS — Daisuki Confeitaria
   Supabase auth · Brigadeiro 3D · Countdown
   ============================================================ */

'use strict';

/* ── Supabase auth + exibição de números ──────────────────── */
(function initAuth() {
  const SUPABASE_URL  = 'https://xcrwjlbvpipfssepgxpv.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjcndqbGJ2cGlwZnNzZXBneHB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4Nzc1MjUsImV4cCI6MjA5NTQ1MzUyNX0.FXpEulvkCQzc8rxtyTGU3Y9yg9f2teh-V11qZcCa-I8';

  if (!window.supabase) return;

  const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  const numsLabel    = document.getElementById('cd-nums-label');
  const loginOverlay = document.getElementById('cd-login-overlay');
  const loginEmail   = document.getElementById('cd-login-email');
  const loginBtn     = document.getElementById('cd-login-btn');
  const loginMsg     = document.getElementById('cd-login-msg');

  /* Números passados via URL (recém cadastrado via localStorage fallback) */
  const urlParams = new URLSearchParams(window.location.search);
  const urlNums   = urlParams.get('numeros') || urlParams.get('numero') || '';

  /* Mostrar números no label do topo e na seção destacada */
  function showNums(numeros) {
    if (!numeros?.length) return;

    if (numsLabel) numsLabel.textContent = numeros.join(' · ');

    const section = document.getElementById('cd-tickets-section');
    const list    = document.getElementById('cd-tickets-list');
    if (section && list) {
      list.innerHTML = numeros
        .map((n) => `<li class="cd-ticket-num">${n}</li>`)
        .join('');
      section.hidden = false;
    }
  }

  /* Buscar números do participante logado (por email) */
  async function fetchNumerosDoUsuario(email) {
    const { data, error } = await supa
      .from('participantes')
      .select('numeros')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!error && data?.numeros?.length) {
      showNums(data.numeros);
      if (window.location.hash) history.replaceState(null, '', window.location.pathname);
    }
  }

  /* Ouvir mudanças de autenticação (inclui chegada do magic link) */
  supa.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      if (loginOverlay) loginOverlay.hidden = true;
      /* Só busca no banco se ainda não mostrou números pela URL */
      if (!numsLabel?.textContent) {
        fetchNumerosDoUsuario(session.user.email);
      }
    } else if (!urlNums) {
      /* Sem sessão e sem URL params → pede login */
      if (loginOverlay) loginOverlay.hidden = false;
    }
  });

  /* Verificar sessão existente ao carregar */
  supa.auth.getSession();

  /* Se veio com URL params, mostra imediatamente (modo local ou fallback) */
  if (urlNums) {
    const nums = decodeURIComponent(urlNums).split(',').map((s) => s.trim()).filter(Boolean);
    showNums(nums);
  }

  /* ── Formulário "ver meus números" ──────────────────────── */
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const email = loginEmail?.value?.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (loginMsg) loginMsg.textContent = 'Digite um e-mail válido.';
        return;
      }

      loginBtn.disabled    = true;
      loginBtn.textContent = 'Enviando...';
      if (loginMsg) loginMsg.textContent = '';

      const { error } = await supa.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/countdown.html` },
      });

      if (error) {
        if (loginMsg) loginMsg.textContent = 'Erro ao enviar. Tente novamente.';
      } else {
        if (loginMsg) loginMsg.textContent = '✓ Link enviado! Verifique seu e-mail.';
        if (loginEmail) loginEmail.value = '';
      }

      loginBtn.disabled    = false;
      loginBtn.textContent = 'Enviar link de acesso';
    });

    /* Enviar com Enter */
    loginEmail?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loginBtn.click();
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
  const RAFFLE_DATE = new Date('2026-06-15T11:00:00.000Z');

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
