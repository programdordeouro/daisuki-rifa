/* ============================================================
   api/cadastro.js — Daisuki Confeitaria
   POST /api/cadastro — Supabase REST API via fetch nativo
   ============================================================ */

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

  // ── Checar variáveis de ambiente ───────────────────────
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPA_URL || !SUPA_KEY) {
    console.error('Env vars ausentes:', { url: !!SUPA_URL, key: !!SUPA_KEY });
    return res.status(500).json({ error: 'config_error', message: 'Variáveis de ambiente não configuradas.' });
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

  const errors = validate({ nome, social, email, telefone, quantidade });
  if (errors.length) return res.status(400).json({ error: 'validation_error', details: errors });

  const cleanEmail = email.trim().toLowerCase();
  const base       = SUPA_URL + '/rest/v1';

  try {
    // ── Checar email duplicado ───────────────────────────
    const checkRes = await fetch(`${base}/participantes?email=eq.${encodeURIComponent(cleanEmail)}&select=id`, {
      headers: hdrs,
    });
    if (!checkRes.ok) {
      const t = await checkRes.text();
      console.error('Check failed:', checkRes.status, t);
      return res.status(500).json({ error: 'db_error', message: t });
    }
    const existing = await checkRes.json();
    if (existing.length > 0) return res.status(409).json({ error: 'duplicate_email' });

    // ── Buscar números já usados ─────────────────────────
    const numsRes = await fetch(`${base}/participantes?select=numeros`, { headers: hdrs });
    if (!numsRes.ok) {
      const t = await numsRes.text();
      console.error('Nums fetch failed:', t);
      return res.status(500).json({ error: 'db_error', message: t });
    }
    const allRows  = await numsRes.json();
    const usedNums = allRows.flatMap((r) => r.numeros || []);

    const qtd     = Math.max(1, Math.min(20, parseInt(quantidade) || 1));
    const numeros = generateNumbers(qtd, usedNums);
    if (!numeros) return res.status(500).json({ error: 'server_error', message: 'Números esgotados.' });

    // ── Inserir participante ─────────────────────────────
    const insertRes = await fetch(`${base}/participantes`, {
      method:  'POST',
      headers: { ...hdrs, 'Prefer': 'return=minimal' },
      body:    JSON.stringify({
        nome:       nome.trim(),
        social:     social.trim(),
        email:      cleanEmail,
        telefone:   telefone.trim(),
        modalidade,
        quantidade: qtd,
        numeros,
      }),
    });
    if (!insertRes.ok) {
      const t = await insertRes.text();
      console.error('Insert failed:', insertRes.status, t);
      return res.status(500).json({ error: 'db_error', message: t });
    }

    return res.status(200).json({ success: true, numeros });

  } catch (err) {
    console.error('Fetch error:', err.message, err.stack);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
};
