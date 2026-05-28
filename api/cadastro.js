/* ============================================================
   api/cadastro.js — Daisuki Confeitaria
   POST /api/cadastro — usa https nativo do Node.js
   ============================================================ */

const https = require('https');

/* Faz uma requisição HTTPS e retorna { status, body } */
function request(urlStr, options = {}, bodyData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const opts = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method:   options.method || 'GET',
      headers:  options.headers || {},
    };

    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ nome, social, email, telefone, quantidade }) {
  const errors = [];
  if (!nome?.trim())   errors.push('Nome é obrigatório.');
  if (!social?.trim()) errors.push('Rede social é obrigatória.');
  if (!EMAIL_RE.test(email?.trim())) errors.push('E-mail inválido.');
  if (!telefone || telefone.replace(/\D/g, '').length < 10) errors.push('Telefone inválido.');
  if (!quantidade)     errors.push('Quantidade é obrigatória.');
  return errors;
}

function generateNumbers(n, usedNums) {
  const used   = new Set(usedNums);
  const result = [];
  let   tries  = 0;
  while (result.length < n && tries < n * 20) {
    const num = `DAISUKI-${String(Math.floor(1000 + Math.random() * 9000))}`;
    if (!used.has(num)) { result.push(num); used.add(num); }
    tries++;
  }
  return result.length === n ? result : null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'method_not_allowed' });

  const SUPA_URL = (process.env.SUPABASE_URL  || '').replace(/^﻿/, '').trim();
  const SUPA_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/^﻿/, '').trim();

  if (!SUPA_URL || !SUPA_KEY) {
    console.error('Env ausentes — url:', !!SUPA_URL, 'key:', !!SUPA_KEY);
    return res.status(500).json({ error: 'config_error' });
  }

  const hdrs = {
    'apikey':        SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Content-Type':  'application/json',
  };

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'invalid_json' }); }

  const { nome = '', social = '', email = '', telefone = '', modalidade = 'fly', quantidade = '1' } = body;
  const modalidadesValidas = ['fly', 'social', 'compra'];
  const modalidadeFinal = modalidadesValidas.includes(modalidade) ? modalidade : 'fly';

  const errors = validate({ nome, social, email, telefone, quantidade });
  if (errors.length) return res.status(400).json({ error: 'validation_error', details: errors });

  const cleanEmail = email.trim().toLowerCase();
  const base       = SUPA_URL + '/rest/v1';

  try {
    // ── Checar email duplicado ───────────────────────────
    const checkR = await request(
      `${base}/participantes?email=eq.${encodeURIComponent(cleanEmail)}&select=id`,
      { headers: hdrs }
    );
    if (checkR.status !== 200) {
      console.error('Check error:', checkR.status, checkR.body);
      return res.status(500).json({ error: 'db_error', detail: checkR.body });
    }
    const existing = JSON.parse(checkR.body);
    if (existing.length > 0) return res.status(409).json({ error: 'duplicate_email' });

    // ── Buscar números já usados ─────────────────────────
    const numsR = await request(`${base}/participantes?select=numeros`, { headers: hdrs });
    if (numsR.status !== 200) {
      console.error('Nums error:', numsR.status, numsR.body);
      return res.status(500).json({ error: 'db_error', detail: numsR.body });
    }
    const usedNums = JSON.parse(numsR.body).flatMap((r) => r.numeros || []);

    const qtd     = Math.max(1, Math.min(20, parseInt(quantidade) || 1));
    const numeros = generateNumbers(qtd, usedNums);
    if (!numeros) return res.status(500).json({ error: 'server_error' });

    // ── Inserir participante ─────────────────────────────
    const payload = JSON.stringify({
      nome:       nome.trim(),
      social:     social.trim(),
      email:      cleanEmail,
      telefone:   telefone.trim(),
      modalidade: modalidadeFinal,
      quantidade: qtd,
      numeros,
    });

    const insertR = await request(
      `${base}/participantes`,
      { method: 'POST', headers: { ...hdrs, 'Prefer': 'return=minimal' } },
      payload
    );

    if (insertR.status !== 200 && insertR.status !== 201) {
      console.error('Insert error:', insertR.status, insertR.body);
      return res.status(500).json({ error: 'db_error', detail: insertR.body });
    }

    return res.status(200).json({ success: true, numeros });

  } catch (err) {
    console.error('HTTPS error:', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
};
