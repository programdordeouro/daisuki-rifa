const https = require('https');

function httpsReq(urlStr, method, headers, bodyData) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method, headers },
      (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => resolve({ status: res.statusCode, body: raw }));
      }
    );
    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

const ADMIN_KEY = process.env.ADMIN_KEY || 'daisuki_admin_2026';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  if (req.headers['x-admin-key'] !== ADMIN_KEY)
    return res.status(401).json({ error: 'unauthorized' });

  const SUPA_URL = (process.env.SUPABASE_URL || '').replace(/^﻿/, '').trim();
  const SUPA_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/^﻿/, '').trim();
  if (!SUPA_URL || !SUPA_KEY) return res.status(500).json({ error: 'config_error' });

  const hdrs = {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Content-Type': 'application/json',
  };
  const base = SUPA_URL + '/rest/v1';

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  try {
    /* Se vier numero_sorteado já definido, salva direto; senão sorteia */
    let numeroSorteado = body?.numero_sorteado || null;
    let nomeVencedor   = body?.nome_vencedor   || null;

    if (!numeroSorteado) {
      /* Busca todos os participantes e seus números */
      const { status, body: pbody } = await httpsReq(
        `${base}/participantes?select=nome,numeros`, 'GET', hdrs
      );
      if (status !== 200) return res.status(500).json({ error: 'db_error' });

      const participantes = JSON.parse(pbody);
      const pool = participantes.flatMap((p) =>
        (p.numeros || []).map((n) => ({ numero: n, nome: p.nome }))
      );

      if (!pool.length) return res.status(400).json({ error: 'no_numbers' });

      const sorteado  = pool[Math.floor(Math.random() * pool.length)];
      numeroSorteado  = sorteado.numero;
      nomeVencedor    = sorteado.nome;
    }

    const agora = new Date().toISOString();

    /* Salva resultado atual (upsert na linha id=1) */
    const payloadResultado = JSON.stringify({
      id: 1,
      numero_sorteado: numeroSorteado,
      nome_vencedor:   nomeVencedor,
      data_sorteio:    agora.slice(0, 10),
    });

    const { status: uStatus } = await httpsReq(
      `${base}/resultado`,
      'POST',
      { ...hdrs, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      payloadResultado
    );

    if (uStatus !== 200 && uStatus !== 201) {
      return res.status(500).json({ error: 'db_error' });
    }

    /* Grava no histórico de ganhadores */
    const payloadGanhador = JSON.stringify({
      numero_sorteado: numeroSorteado,
      nome_vencedor:   nomeVencedor,
      data_sorteio:    agora,
    });

    await httpsReq(
      `${base}/ganhadores`,
      'POST',
      { ...hdrs, 'Prefer': 'return=minimal' },
      payloadGanhador
    );

    return res.status(200).json({ success: true, numero_sorteado: numeroSorteado, nome_vencedor: nomeVencedor });
  } catch (err) {
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
};
