/* ============================================================
   api/admin/participantes.js — GET /api/admin/participantes
   Returns all participant rows (admin protected)
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
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const auth   = getAuth();
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'PARTICIPANTES!A:L',
    });

    const rows = (result.data.values || []).slice(1); // skip header
    return res.status(200).json({ rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
};
