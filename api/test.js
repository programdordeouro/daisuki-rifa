/* Endpoint de diagnóstico — remover após resolver o problema */
const https = require('https');

function httpsGet(urlStr, headers = {}) {
  return new Promise((resolve) => {
    try {
      const u = new URL(urlStr);
      const opts = {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: 'GET',
        headers,
      };
      const r = https.request(opts, (res) => {
        let body = '';
        res.on('data', (c) => { body += c.toString(); });
        res.on('end', () => resolve({ ok: true, status: res.statusCode, body: body.slice(0, 300) }));
      });
      r.on('error', (e) => resolve({ ok: false, error: e.message, type: e.constructor?.name }));
      r.end();
    } catch (e) {
      resolve({ ok: false, error: e.message, type: e.constructor?.name, stack: e.stack?.split('\n').slice(0, 4) });
    }
  });
}

module.exports = async function handler(req, res) {
  const URL_VAR  = process.env.SUPABASE_URL;
  const KEY_VAR  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ANON_VAR = process.env.SUPABASE_ANON_KEY;

  const out = {
    node_version: process.version,
    env: {
      SUPABASE_URL:              URL_VAR  ? URL_VAR.slice(0, 40)  + ` [${URL_VAR.length} chars]`  : 'AUSENTE',
      SUPABASE_SERVICE_ROLE_KEY: KEY_VAR  ? KEY_VAR.slice(0, 15)  + ` [${KEY_VAR.length} chars]`  : 'AUSENTE',
      SUPABASE_ANON_KEY:         ANON_VAR ? ANON_VAR.slice(0, 15) + ` [${ANON_VAR.length} chars]` : 'AUSENTE',
    },
    tests: {},
  };

  // Teste 1: requisição externa simples
  out.tests.httpbin = await httpsGet('https://httpbin.org/get');

  // Teste 2: Supabase sem auth
  if (URL_VAR) {
    out.tests.supabase_sem_auth = await httpsGet(`${URL_VAR}/rest/v1/`);
  }

  // Teste 3: Supabase com service key
  if (URL_VAR && KEY_VAR) {
    out.tests.supabase_com_auth = await httpsGet(
      `${URL_VAR}/rest/v1/participantes?select=id&limit=1`,
      {
        'apikey': KEY_VAR,
        'Authorization': 'Bearer ' + KEY_VAR,
      }
    );
  }

  res.setHeader('Content-Type', 'application/json');
  res.status(200).end(JSON.stringify(out, null, 2));
};
