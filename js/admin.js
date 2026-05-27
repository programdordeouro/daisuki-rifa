/* ============================================================
   ADMIN.JS — Daisuki Confeitaria
   Basic admin panel: load participants, set winner
   ============================================================ */

'use strict';

(function initAdmin() {
  // ─── Simple session auth ─────────────────────────────────
  const ADMIN_KEY = 'daisuki_admin_2026';

  function checkAuth() {
    const key = sessionStorage.getItem('admin_key');
    if (key !== ADMIN_KEY) {
      const entered = prompt('Senha do painel:');
      if (entered !== ADMIN_KEY) {
        document.body.innerHTML = '<p style="padding:2rem;font-family:sans-serif;color:#c0392b">Acesso negado.</p>';
        return false;
      }
      sessionStorage.setItem('admin_key', ADMIN_KEY);
    }
    return true;
  }

  if (!checkAuth()) return;

  // ─── Load participants ───────────────────────────────────
  const tbody       = document.getElementById('admin-tbody');
  const totalEl     = document.getElementById('admin-total');
  const winnerInput = document.getElementById('winner-input');
  const setWinnerBtn = document.getElementById('set-winner-btn');
  const winnerMsg   = document.getElementById('winner-msg');

  async function loadParticipants() {
    try {
      const res  = await fetch('/api/admin/participantes', {
        headers: { 'x-admin-key': ADMIN_KEY },
      });
      const data = await res.json();

      if (!tbody) return;
      tbody.innerHTML = '';

      const rows = data.rows || [];
      rows.forEach((row) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escHtml(row[0] || '')}</td>
          <td>${escHtml(row[1] || '')}</td>
          <td>${escHtml(row[2] || '')}</td>
          <td>${escHtml(row[3] || '')}</td>
          <td>${escHtml(row[5] || '')}</td>
          <td>${escHtml(row[6] || '')}</td>
          <td>${escHtml(row[7] || '')} ${escHtml(row[8] || '')}</td>
        `;
        tbody.appendChild(tr);
      });

      if (totalEl) totalEl.textContent = rows.length;
    } catch (err) {
      console.error('Admin load error:', err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="color:#c0392b">Erro ao carregar dados.</td></tr>';
    }
  }

  // ─── Set winner ──────────────────────────────────────────
  if (setWinnerBtn) {
    setWinnerBtn.addEventListener('click', async () => {
      const numero = winnerInput ? winnerInput.value.trim() : '';
      if (!numero) {
        if (winnerMsg) winnerMsg.textContent = 'Digite o número vencedor.';
        return;
      }

      try {
        const res  = await fetch('/api/admin/set-winner', {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key':  ADMIN_KEY,
          },
          body: JSON.stringify({ numero }),
        });
        const data = await res.json();

        if (winnerMsg) {
          winnerMsg.textContent = data.success
            ? `✓ Ganhador definido: ${numero}`
            : `Erro: ${data.error || 'falha desconhecida'}`;
          winnerMsg.style.color = data.success ? 'green' : 'red';
        }
      } catch {
        if (winnerMsg) winnerMsg.textContent = 'Erro de conexão.';
      }
    });
  }

  // ─── XSS-safe escaping ───────────────────────────────────
  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── Refresh button ──────────────────────────────────────
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadParticipants);
  }

  loadParticipants();
})();
