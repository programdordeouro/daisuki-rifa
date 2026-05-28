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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPA_URL = (process.env.SUPABASE_URL || '').replace(/^﻿/, '').trim();
  const SUPA_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/^﻿/, '').trim();

  if (!SUPA_URL || !SUPA_KEY) return res.status(500).json({ error: 'config_error' });

  const email = (req.query?.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  const hdrs = {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
  };

  try {
    const { status, body } = await httpsGet(
      `${SUPA_URL}/rest/v1/participantes?email=eq.${encodeURIComponent(email)}&select=nome,numeros,modalidade,quantidade`,
      hdrs
    );

    if (status !== 200) return res.status(500).json({ error: 'db_error' });

    const rows = JSON.parse(body);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });

    const { nome, numeros, modalidade, quantidade } = rows[0];
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ nome, numeros, modalidade, quantidade });
  } catch (err) {
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
};
