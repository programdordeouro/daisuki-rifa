/* ============================================================
   api/admin/set-winner.js — POST /api/admin/set-winner
   Writes winner number to RESULTADO sheet
   ============================================================ */

const { google } = require('googleapis');

const ADMIN_KEY = process.env.ADMIN_KEY || 'daisuki_admin_2026';

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const body  = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { numero, nome } = body;

  if (!numero) {
    return res.status(400).json({ error: 'numero_required' });
  }

  try {
    const auth   = getAuth();
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Lookup winner name from PARTICIPANTES if not provided
    let winnerName = nome || '';

    if (!winnerName) {
      const pResult = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID,
        range: 'PARTICIPANTES!A:F',
      });
      const rows = (pResult.data.values || []).slice(1);
      const winnerRow = rows.find((r) => r[5] === numero);
      if (winnerRow) winnerName = winnerRow[1] || '';
    }

    const now      = new Date();
    const tzOpts   = { timeZone: 'Asia/Tokyo' };
    const dataHora = now.toLocaleString('pt-BR', tzOpts);

    // Clear RESULTADO tab and write winner
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'RESULTADO!A:C',
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'RESULTADO!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          ['Numero', 'Nome', 'Data'],
          [numero, winnerName, dataHora],
        ],
      },
    });

    return res.status(200).json({ success: true, numero, nome: winnerName });
  } catch (err) {
    console.error('Set winner error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
