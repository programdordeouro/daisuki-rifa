const https = require('https');

function httpsGet(urlStr, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: 'GET', headers },
      (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => resolve({ status: res.statusCode, body: raw }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const SUPA_URL = (process.env.SUPABASE_URL || '').replace(/^﻿/, '').trim();
  const SUPA_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/^﻿/, '').trim();
  if (!SUPA_URL || !SUPA_KEY) return res.status(500).json({ error: 'config_error' });

  const hdrs = { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY };

  try {
    const { status, body } = await httpsGet(
      `${SUPA_URL}/rest/v1/resultado?id=eq.1&select=numero_sorteado,nome_vencedor,data_sorteio`,
      hdrs
    );
    if (status !== 200) return res.status(500).json({ error: 'db_error' });

    const rows = JSON.parse(body);
    if (!rows.length || !rows[0].numero_sorteado) {
      return res.status(200).json({ numero_sorteado: null, nome_vencedor: null });
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
};
