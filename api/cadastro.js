/* ============================================================
   api/cadastro.js — Daisuki Confeitaria
   Vercel Serverless Function
   POST /api/cadastro
   Fields: nome, social, email, telefone (JP),
           modalidade (fly|compra), quantidade
   ============================================================ */

const { google } = require('googleapis');

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      type:          'service_account',
      project_id:    process.env.GOOGLE_PROJECT_ID || 'daisuki',
      private_key:   (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      client_email:  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheetRows(sheets, sheetName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${sheetName}!A:Z`,
  });
  return res.data.values || [];
}

async function appendRow(sheets, sheetName, values) {
  await sheets.spreadsheets.values.append({
    spreadsheetId:   process.env.GOOGLE_SHEETS_ID,
    range:           `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody:     { values: [values] },
  });
}

function generateNumbers(n, existingNumbers) {
  const result  = [];
  const used    = new Set(existingNumbers);
  let   retries = 0;

  while (result.length < n && retries < n * 20) {
    const num = `DAISUKI-${String(Math.floor(1000 + Math.random() * 9000))}`;
    if (!used.has(num)) {
      result.push(num);
      used.add(num);
    }
    retries++;
  }

  return result.length === n ? result : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ nome, social, email, telefone, quantidade }) {
  const errors = [];
  if (!nome || !nome.trim())                errors.push('Nome é obrigatório.');
  if (!social || !social.trim())             errors.push('Rede social é obrigatória.');
  if (!email || !EMAIL_RE.test(email.trim())) errors.push('E-mail inválido.');
  if (!telefone || telefone.replace(/\D/g, '').length < 10) errors.push('Telefone inválido.');
  if (!quantidade)                           errors.push('Quantidade é obrigatória.');
  return errors;
}

function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket?.remoteAddress ||
         'unknown';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'method_not_allowed' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'invalid_json' });
  }

  const {
    nome       = '',
    social     = '',
    email      = '',
    telefone   = '',
    modalidade = 'fly',
    quantidade = '1',
  } = body;

  const errors = validate({ nome, social, email, telefone, quantidade });
  if (errors.length) {
    return res.status(400).json({ error: 'validation_error', details: errors });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanNome  = nome.trim();

  try {
    const auth   = getAuth();
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Columns: ID | Nome | Rede Social | Email | Telefone | Modalidade | Numero | Quantidade | Data | Hora | Origem | IP
    const rows     = await getSheetRows(sheets, 'PARTICIPANTES');
    const dataRows = rows.slice(1);

    const existingEmails  = new Set(dataRows.map((r) => (r[3] || '').toLowerCase().trim()));
    const existingNumbers = new Set(dataRows.map((r) => (r[6] || '').trim()));

    if (existingEmails.has(cleanEmail)) {
      return res.status(409).json({ error: 'duplicate_email' });
    }

    const qtd     = Math.max(1, Math.min(20, parseInt(quantidade) || 1));
    const numeros = generateNumbers(qtd, Array.from(existingNumbers));
    if (!numeros) {
      return res.status(500).json({ error: 'server_error', message: 'Could not generate unique numbers.' });
    }

    const now    = new Date();
    const tzOpts = { timeZone: 'Asia/Tokyo' };
    const data   = now.toLocaleDateString('pt-BR', tzOpts);
    const hora   = now.toLocaleTimeString('pt-BR', tzOpts);

    for (let i = 0; i < numeros.length; i++) {
      await appendRow(sheets, 'PARTICIPANTES', [
        `P-${Date.now()}-${i}`,  // A: ID
        cleanNome,                // B: Nome
        social.trim(),            // C: Rede Social
        cleanEmail,               // D: Email
        telefone.trim(),          // E: Telefone
        modalidade,               // F: Modalidade
        numeros[i],               // G: Numero
        qtd,                      // H: Quantidade
        data,                     // I: Data
        hora,                     // J: Hora
        'website',                // K: Origem
        getIP(req),               // L: IP
      ]);
    }

    return res.status(200).json({ success: true, numeros, numero: numeros[0] });

  } catch (err) {
    console.error('Sheets API error:', err);
    return res.status(500).json({ error: 'server_error', message: 'Database error.' });
  }
};
