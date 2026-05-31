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
