/* ============================================================
   api/resultado.js — GET /api/resultado
   Returns winner number and name from RESULTADO sheet
   ============================================================ */

const { google } = require('googleapis');

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const auth   = getAuth();
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'RESULTADO!A:C',
    });

    const rows = result.data.values || [];
    const data = rows.slice(1);

    if (!data.length || !data[0][0]) {
      return res.status(200).json({ numero: null, nome: null });
    }

    return res.status(200).json({
      numero: data[0][0] || null,
      nome:   data[0][1] || null,
      data:   data[0][2] || null,
    });
  } catch (err) {
    console.error('Resultado API error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
