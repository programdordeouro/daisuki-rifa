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

const ADMIN_KEY = process.env.ADMIN_KEY || 'daisuki_admin_2026';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.headers['x-admin-key'] !== ADMIN_KEY)
    return res.status(401).json({ error: 'unauthorized' });

  const SUPA_URL = (process.env.SUPABASE_URL || '').replace(/^﻿/, '').trim();
  const SUPA_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/^﻿/, '').trim();
  if (!SUPA_URL || !SUPA_KEY) return res.status(500).json({ error: 'config_error' });

  const hdrs = { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY };

  try {
    const { status, body } = await httpsGet(
      `${SUPA_URL}/rest/v1/participantes?select=nome,email,telefone,social,cidade,data_nascimento,modalidade,quantidade,numeros,created_at&order=created_at.asc`,
      hdrs
    );
    if (status !== 200) return res.status(500).json({ error: 'db_error' });
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).end(body);
  } catch (err) {
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
};
