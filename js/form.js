/* ============================================================
   FORM.JS — Daisuki Confeitaria
   Fly (1 número grátis) ou Compra (N bilhetes)
   Modo local (localStorage) + Modo API (produção)
   ============================================================ */

'use strict';

(function initForm() {
  /* ── Elements ──────────────────────────────────────────── */
  const stepChoose = document.getElementById('rifa-step-choose');
  const stepForm   = document.getElementById('rifa-step-form');
  const btnFly     = document.getElementById('btn-option-fly');
  const btnSocial  = document.getElementById('btn-option-social');
  const btnCompra  = document.getElementById('btn-option-compra');
  const btnBack    = document.getElementById('form-back-btn');
  const form       = document.getElementById('rifa-form');
  const card       = document.getElementById('rifa-form-card');
  const errorMsg   = document.getElementById('form-error-msg');
  const modeTag    = document.getElementById('form-mode-tag');
  const formTitle  = document.getElementById('form-title');
  const infoText   = document.getElementById('form-info-text');
  const btnSubmit  = document.getElementById('btn-submit');
  const btnText    = document.getElementById('btn-text');
  const btnArrow   = document.getElementById('btn-arrow');
  const qtyGroup   = document.getElementById('qty-group');

  if (!form) return;

  const STORAGE_KEY = 'daisuki_participantes';
  const MAX_TICKETS = 20;
  const MIN_TICKETS = 1;

  const IS_LOCAL = (
    window.location.protocol === 'file:' ||
    window.location.hostname  === 'localhost' ||
    window.location.hostname  === '127.0.0.1' ||
    window.location.hostname  === ''
  );

  let mode = 'fly';
  let qty  = 1;

  /* ── Mode switch ───────────────────────────────────────── */
  function showForm(selectedMode) {
    mode = selectedMode;
    const isCompra = mode === 'compra';

    const labels = {
      fly:    { tag: 'Flyer',        title: 'Participar — Flyer',        btn: 'Garantir meu número' },
      social: { tag: 'Redes Sociais', title: 'Participar — Redes Sociais', btn: 'Garantir meu número' },
      compra: { tag: 'Compra',        title: 'Participar — Compra',        btn: 'Reservar bilhetes'   },
    };
    const l = labels[mode] || labels.fly;

    if (modeTag)   modeTag.textContent  = l.tag;
    if (formTitle) formTitle.textContent = l.title;
    if (btnText)   btnText.textContent  = l.btn;

    if (infoText) infoText.textContent = isCompra
      ? 'Preencha seus dados. Após confirmar, entre em contato pelo Instagram para efetuar o pagamento.'
      : 'Preencha seus dados e garanta sua participação! Você receberá 1 número exclusivo gratuitamente.';

    if (qtyGroup) qtyGroup.hidden = !isCompra;

    if (stepChoose) stepChoose.hidden = true;
    if (stepForm)   stepForm.hidden   = false;

    form.reset();
    clearErr();
    updateStepper(1, false);
  }

  btnFly?.addEventListener('click',    () => showForm('fly'));
  btnSocial?.addEventListener('click', () => showForm('social'));
  btnCompra?.addEventListener('click', () => showForm('compra'));

  btnBack?.addEventListener('click', () => {
    if (stepForm)   stepForm.hidden   = true;
    if (stepChoose) stepChoose.hidden = false;
    clearErr();
  });

  /* ── Stepper ───────────────────────────────────────────── */
  const stepperMinus = document.getElementById('stepper-minus');
  const stepperPlus  = document.getElementById('stepper-plus');
  const stepperNum   = document.getElementById('stepper-num');
  const stepperLabel = document.querySelector('.stepper-label');
  const hintEl       = document.querySelector('.stepper-hint');
  const qtyInput     = document.getElementById('f-quantidade');

  function updateStepper(newQty, animate) {
    qty = Math.max(MIN_TICKETS, Math.min(MAX_TICKETS, newQty));

    if (stepperNum) {
      if (animate) {
        stepperNum.classList.add('changing');
        setTimeout(() => stepperNum.classList.remove('changing'), 200);
      }
      stepperNum.textContent = qty;
    }

    if (stepperLabel) stepperLabel.textContent = qty === 1 ? 'bilhete' : 'bilhetes';

    if (hintEl) {
      hintEl.innerHTML = qty === 1
        ? 'Você receberá <strong style="color:var(--rose)">1</strong> número exclusivo.'
        : `Você receberá <strong style="color:var(--rose)">${qty}</strong> números exclusivos!`;
    }

    if (qtyInput) qtyInput.value = qty;
    if (stepperMinus) stepperMinus.disabled = qty <= MIN_TICKETS;
    if (stepperPlus)  stepperPlus.disabled  = qty >= MAX_TICKETS;
  }

  stepperMinus?.addEventListener('click', () => updateStepper(qty - 1, true));
  stepperPlus?.addEventListener('click',  () => updateStepper(qty + 1, true));

  updateStepper(1, false);

  /* ── Phone mask (formato japonês) ─────────────────────── */
  const telJP = document.getElementById('f-telefone-jp');
  if (telJP) {
    telJP.addEventListener('input', (e) => {
      let raw = e.target.value.replace(/\D/g, '').slice(0, 11);
      let out = '';
      if      (raw.length > 7) out = `${raw.slice(0,3)}-${raw.slice(3,7)}-${raw.slice(7)}`;
      else if (raw.length > 3) out = `${raw.slice(0,3)}-${raw.slice(3)}`;
      else                      out = raw;
      e.target.value = out;
    });
    telJP.addEventListener('keydown', (e) => {
      if (e.key !== 'Backspace') return;
      const val = telJP.value, pos = telJP.selectionStart;
      if (val[pos - 1] === '-') {
        telJP.value = val.slice(0, pos - 1);
        e.preventDefault();
      }
    });
  }

  /* ── Validation helpers ────────────────────────────────── */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setErr(field, has)  { field?.classList.toggle('error', has); }
  function showErr(msg)        { if (errorMsg) { errorMsg.textContent = msg; errorMsg.classList.add('visible'); } }
  function clearErr()          { if (errorMsg) { errorMsg.textContent = ''; errorMsg.classList.remove('visible'); } }

  function setLoading(on) {
    if (!btnSubmit) return;
    btnSubmit.disabled = on;
    if (on) {
      if (btnText)  btnText.innerHTML = 'Enviando... <span class="spinner"></span>';
      if (btnArrow) btnArrow.style.display = 'none';
    } else {
      if (btnText)  btnText.textContent = mode === 'fly' ? 'Garantir meu número' : 'Reservar bilhetes';
      if (btnArrow) { btnArrow.style.display = ''; btnArrow.textContent = '→'; }
    }
  }

  function shakeCard() {
    if (!card) return;
    card.classList.remove('shake');
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('shake')));
    card.addEventListener('animationend', () => card.classList.remove('shake'), { once: true });
  }

  /* ── localStorage helpers ──────────────────────────────── */
  function getLocal()      { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
  function saveLocal(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

  function generateNumbers(n, existing) {
    const used   = new Set(existing.flatMap((p) => p.numeros || (p.numero ? [p.numero] : [])));
    const result = [];
    let tries    = 0;

    while (result.length < n && tries < n * 15) {
      const num = `DAISUKI-${String(Math.floor(1000 + Math.random() * 9000))}`;
      if (!used.has(num) && !result.includes(num)) {
        result.push(num);
        used.add(num);
      }
      tries++;
    }
    return result;
  }

  function submitLocal(payload) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const data   = getLocal();
        const emails = new Set(data.map((p) => (p.email || '').toLowerCase()));

        if (emails.has(payload.email.toLowerCase()))
          return resolve({ ok: false, status: 409, body: { error: 'duplicate_email' } });

        const numeros = generateNumbers(parseInt(payload.quantidade), data);
        const entry   = {
          id:         `L-${Date.now()}`,
          numeros,
          numero:     numeros[0],
          nome:       payload.nome,
          social:     payload.social,
          email:      payload.email,
          telefone:   payload.telefone,
          modalidade: payload.modalidade,
          quantidade: payload.quantidade,
          dataHora:   new Date().toLocaleString('pt-BR'),
        };

        data.push(entry);
        saveLocal(data);
        resolve({ ok: true, status: 200, body: { success: true, numeros, numero: numeros[0] } });
      }, 600);
    });
  }

  async function submitAPI(payload) {
    const res  = await fetch('/api/cadastro', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const body = await res.json();
    return { ok: res.ok, status: res.status, body };
  }

  function goToCountdown(numeros) {
    const param = encodeURIComponent(numeros.join(','));
    window.location.href = `countdown.html?numeros=${param}`;
  }

  function handleResult({ ok, status, body }) {
    if (ok && body.success) {
      goToCountdown(body.numeros || [body.numero]);
      return;
    }

    if (status === 409) {
      if (body.error === 'duplicate_email') {
        setErr(document.getElementById('f-email'), true);
        showErr('Este e-mail já está cadastrado. Você já participa da rifa!');
      } else {
        showErr('Você já está participando da rifa!');
      }
    } else {
      showErr('Algo deu errado. Por favor, tente novamente.');
    }
    shakeCard();
  }

  /* ── Submit ────────────────────────────────────────────── */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErr();

    const fNome   = document.getElementById('f-nome');
    const fSocial = document.getElementById('f-social');
    const fEmail  = document.getElementById('f-email');
    const fTel    = document.getElementById('f-telefone-jp');
    const fCidade     = document.getElementById('f-cidade');
    const fNascimento = document.getElementById('f-nascimento');

    let valid = true;

    if (!fNome?.value.trim())
      { setErr(fNome, true);   valid = false; } else setErr(fNome, false);

    if (!fSocial?.value.trim())
      { setErr(fSocial, true); valid = false; } else setErr(fSocial, false);

    if (!EMAIL_RE.test(fEmail?.value.trim()))
      { setErr(fEmail, true);  valid = false; } else setErr(fEmail, false);

    if (!fTel?.value.trim() || fTel.value.replace(/\D/g, '').length < 10)
      { setErr(fTel, true);    valid = false; } else setErr(fTel, false);

    if (!fCidade?.value.trim())
      { setErr(fCidade, true); valid = false; } else setErr(fCidade, false);

    if (!fNascimento?.value)
      { setErr(fNascimento, true); valid = false; } else setErr(fNascimento, false);

    if (mode === 'compra' && (qty < MIN_TICKETS || qty > MAX_TICKETS)) {
      showErr(`Escolha entre ${MIN_TICKETS} e ${MAX_TICKETS} bilhetes.`);
      valid = false;
    }

    if (!valid) {
      if (!errorMsg?.textContent) showErr('Por favor, preencha todos os campos obrigatórios.');
      shakeCard();
      return;
    }

    setLoading(true);

    const payload = {
      nome:       fNome.value.trim(),
      social:     fSocial.value.trim(),
      email:      fEmail.value.trim().toLowerCase(),
      telefone:   fTel.value.trim(),
      cidade:          fCidade.value.trim(),
      data_nascimento: fNascimento.value,
      modalidade:      mode,
      quantidade: String(mode === 'compra' ? qty : 1),
    };

    try {
      const result = IS_LOCAL
        ? await submitLocal(payload)
        : await submitAPI(payload).catch(async () => await submitLocal(payload));

      handleResult(result);
    } catch (err) {
      console.error('Form error:', err);
      showErr('Erro inesperado. Tente novamente.');
      shakeCard();
    } finally {
      setLoading(false);
    }
  });

  form.querySelectorAll('.form-input').forEach((f) => {
    f.addEventListener('input', () => { setErr(f, false); clearErr(); });
  });

  if (IS_LOCAL) {
    const b = document.createElement('div');
    b.innerHTML = `<div style="position:fixed;top:72px;right:0;background:rgba(201,168,122,0.92);color:#2C1810;font-family:'Jost',sans-serif;font-size:0.58rem;font-weight:500;letter-spacing:2px;text-transform:uppercase;padding:0.3em 0.85em;border-radius:0 0 0 8px;z-index:9999;pointer-events:none">Modo Teste · localStorage</div>`;
    document.body.appendChild(b);
  }
})();
