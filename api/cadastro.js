/* ============================================================
   api/cadastro.js — Daisuki Confeitaria
   POST /api/cadastro
   Usa Supabase REST API diretamente (sem biblioteca)
   ============================================================ */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const HEADERS = {
  'apikey':        SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type':  'application/json',
};

/* Consulta na tabela via REST */
async function dbSelect(table, params = '', single = false) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res  = await fetch(url, {
    headers: { ...HEADERS, ...(single ? { 'Accept': 'application/vnd.pgrst.object+json' } : {}) },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`dbSelect ${table}: ${err}`);
  }
  return res.json();
}

/* Insere uma linha na tabela via REST */
async function dbInsert(table, row) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res  = await fetch(url, {
    method:  'POST',
    headers: { ...HEADERS, 'Prefer': 'return=minimal' },
    body:    JSON.stringify(row),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`dbInsert ${table}: ${err}`);
  }
}

/* ── Helpers ──────────────────────────────────────────────── */
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

/* ── Handler ──────────────────────────────────────────────── */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'method_not_allowed' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'invalid_json' }); }

  const { nome = '', social = '', email = '', telefone = '', modalidade = 'fly', quantidade = '1' } = body;

  const errors = validate({ nome, social, email, telefone, quantidade });
  if (errors.length) return res.status(400).json({ error: 'validation_error', details: errors });

  const cleanEmail = email.trim().toLowerCase();

  try {
    // ── Checar email duplicado ───────────────────────────
    const existing = await dbSelect('participantes', `email=eq.${encodeURIComponent(cleanEmail)}&select=id`);
    if (existing.length > 0) return res.status(409).json({ error: 'duplicate_email' });

    // ── Buscar números já usados ─────────────────────────
    const allRows  = await dbSelect('participantes', 'select=numeros');
    const usedNums = allRows.flatMap((r) => r.numeros || []);

    const qtd     = Math.max(1, Math.min(20, parseInt(quantidade) || 1));
    const numeros = generateNumbers(qtd, usedNums);
    if (!numeros) return res.status(500).json({ error: 'server_error' });

    // ── Inserir participante ─────────────────────────────
    await dbInsert('participantes', {
      nome:       nome.trim(),
      social:     social.trim(),
      email:      cleanEmail,
      telefone:   telefone.trim(),
      modalidade,
      quantidade: qtd,
      numeros,
    });

    return res.status(200).json({ success: true, numeros });

  } catch (err) {
    console.error('API error:', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
};
