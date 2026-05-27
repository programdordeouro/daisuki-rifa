/* ============================================================
   api/cadastro.js — Daisuki Confeitaria
   POST /api/cadastro
   Valida, salva no Supabase, gera magic link para login
   ============================================================ */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL         = process.env.SITE_URL || 'https://daisuki-zeta.vercel.app';

function getSupabase() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
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

function generateNumbers(n, existingNums) {
  const used   = new Set(existingNums);
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

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'invalid_json' }); }

  const {
    nome       = '',
    social     = '',
    email      = '',
    telefone   = '',
    modalidade = 'fly',
    quantidade = '1',
  } = body;

  const errors = validate({ nome, social, email, telefone, quantidade });
  if (errors.length) return res.status(400).json({ error: 'validation_error', details: errors });

  const cleanEmail = email.trim().toLowerCase();
  const supabase   = getSupabase();

  // ── Checar email duplicado ─────────────────────────────
  const { data: existing } = await supabase
    .from('participantes')
    .select('id')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (existing) return res.status(409).json({ error: 'duplicate_email' });

  // ── Buscar números já usados ───────────────────────────
  const { data: allRows } = await supabase.from('participantes').select('numeros');
  const usedNums = (allRows || []).flatMap((r) => r.numeros || []);

  const qtd     = Math.max(1, Math.min(20, parseInt(quantidade) || 1));
  const numeros = generateNumbers(qtd, usedNums);
  if (!numeros) return res.status(500).json({ error: 'server_error', message: 'Não foi possível gerar números únicos.' });

  // ── Criar usuário no Supabase Auth ─────────────────────
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email:         cleanEmail,
    email_confirm: true,
  });

  if (authError && authError.message !== 'A user with this email address has already been registered') {
    console.error('Auth error:', authError);
    return res.status(500).json({ error: 'auth_error' });
  }

  const userId = authData?.user?.id || null;

  // ── Inserir participante ───────────────────────────────
  const { error: insertError } = await supabase.from('participantes').insert({
    user_id:    userId,
    nome:       nome.trim(),
    social:     social.trim(),
    email:      cleanEmail,
    telefone:   telefone.trim(),
    modalidade,
    quantidade: qtd,
    numeros,
  });

  if (insertError) {
    console.error('Insert error:', insertError);
    return res.status(500).json({ error: 'db_error' });
  }

  // ── Gerar magic link para login automático ─────────────
  const { data: linkData } = await supabase.auth.admin.generateLink({
    type:    'magiclink',
    email:   cleanEmail,
    options: { redirectTo: `${SITE_URL}/countdown.html` },
  });

  const magicLink = linkData?.properties?.action_link || null;

  return res.status(200).json({ success: true, numeros, magicLink });
};
