/* ============================================================
   RESULTADO.JS — Daisuki Confeitaria
   Fetch winner from /api/resultado, show with celebration
   ============================================================ */

'use strict';

(function initResultado() {
  const winnerEl  = document.getElementById('winner-number');
  const nameEl    = document.getElementById('winner-name');
  const statusEl  = document.getElementById('result-status');

  async function fetchWinner() {
    try {
      const res  = await fetch('/api/resultado');
      const data = await res.json();

      if (data.numero) {
        if (winnerEl) {
          winnerEl.textContent = data.numero;
          winnerEl.style.opacity = '0';
          winnerEl.style.transform = 'scale(0.8)';
          winnerEl.style.transition = 'opacity 1s ease, transform 1s ease';
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              winnerEl.style.opacity   = '1';
              winnerEl.style.transform = 'scale(1)';
            });
          });
        }

        if (nameEl && data.nome) {
          nameEl.textContent = data.nome;
        }

        if (statusEl) statusEl.textContent = '🎉 Parabéns ao vencedor!';

        // Confetti-like celebration using CSS classes
        document.body.classList.add('celebration');

        // Spawn simple confetti elements
        spawnConfetti();

      } else {
        if (statusEl) statusEl.textContent = 'O sorteio ainda não foi realizado. Aguarde!';
      }
    } catch {
      if (statusEl) statusEl.textContent = 'Erro ao carregar resultado.';
    }
  }

  function spawnConfetti() {
    const colors = ['#C17B72', '#F2C4CE', '#C9A87A', '#DDB5AD', '#F7DDE3'];
    const container = document.getElementById('confetti-container');
    if (!container) return;

    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      el.style.cssText = `
        position: absolute;
        width: ${4 + Math.random() * 8}px;
        height: ${4 + Math.random() * 8}px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}%;
        top: ${-10 - Math.random() * 20}%;
        animation: confettiFall ${1.5 + Math.random() * 2}s ease-in forwards;
        animation-delay: ${Math.random() * 1.5}s;
        opacity: 0.85;
      `;
      container.appendChild(el);

      // Remove after animation
      setTimeout(() => el.remove(), 4000);
    }
  }

  // Inject confetti keyframe
  const style = document.createElement('style');
  style.textContent = `
    @keyframes confettiFall {
      to {
        transform: translateY(100vh) rotate(${Math.random() * 720}deg);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  fetchWinner();
})();
