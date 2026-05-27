/* ============================================================
   SAKURA.JS — Daisuki Confeitaria
   Canvas-based sakura petal system
   18 petals · 3 depth layers · mouse interaction · scroll speed
   ============================================================ */

'use strict';

(function initSakura() {
  const canvas = document.getElementById('sakura-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // SVG petal path as Path2D
  const PETAL_PATH = new Path2D('M10 0 C15 5 18 10 10 26 C2 10 5 5 10 0Z');
  const PETAL_COLORS = ['#F2C4CE', '#F7DDE3', '#E8B4BD'];

  // Layer config: count, sizeRange, opacity, durationRange
  const LAYERS = [
    { count: 6, sizeMin:  8, sizeMax: 12, opacity: 0.15, durMin: 20, durMax: 28, z: 0 },
    { count: 7, sizeMin: 12, sizeMax: 16, opacity: 0.30, durMin: 13, durMax: 18, z: 1 },
    { count: 5, sizeMin: 16, sizeMax: 22, opacity: 0.45, durMin:  8, durMax: 12, z: 2 },
  ];

  const petals = [];

  // Scroll tracking
  let lastScrollY  = 0;
  let scrollDelta  = 0;
  let scrollMult   = 1;
  let scrollTimer  = null;

  // Mouse tracking
  let mouseX = -9999, mouseY = -9999;

  // ─── Canvas resize ──────────────────────────────────────
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // ─── Create a petal at random position ──────────────────
  function createPetal(layer, startY) {
    const color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
    const size  = layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin);
    const dur   = (layer.durMin + Math.random() * (layer.durMax - layer.durMin)) * 1000;

    return {
      x:        Math.random() * canvas.width,
      y:        startY !== undefined ? startY : Math.random() * canvas.height,
      size,
      color,
      opacity:  layer.opacity,
      z:        layer.z,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      vx:       (Math.random() - 0.5) * 0.4,
      vy:       (size / layer.sizeMax) * (canvas.height / dur) * 16,
      phase:    Math.random() * Math.PI * 2,
      waveAmp:  15 + Math.random() * 25,
      waveFreq: 0.0008 + Math.random() * 0.0006,
      drift:    0,
      driftVx:  0,
      driftVy:  0,
    };
  }

  // ─── Seed petals ────────────────────────────────────────
  function seedPetals() {
    LAYERS.forEach((layer) => {
      for (let i = 0; i < layer.count; i++) {
        petals.push(createPetal(layer));
      }
    });
  }

  // ─── Scroll listener ────────────────────────────────────
  window.addEventListener('scroll', () => {
    const sy    = window.scrollY;
    scrollDelta = Math.abs(sy - lastScrollY);
    lastScrollY = sy;
    scrollMult  = 1 + scrollDelta * 0.004;

    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      scrollMult = 1;
    }, 1800);
  }, { passive: true });

  // ─── Mouse listener ─────────────────────────────────────
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });

  // ─── Draw a single petal ────────────────────────────────
  function drawPetal(p, time) {
    ctx.save();
    ctx.translate(p.x + p.drift, p.y);
    ctx.rotate(p.rotation);
    ctx.scale(p.size / 20, p.size / 20);
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle   = p.color;

    // Subtle shadow for depth
    ctx.shadowColor  = 'rgba(200, 100, 120, 0.08)';
    ctx.shadowBlur   = 4;

    ctx.fill(PETAL_PATH);
    ctx.restore();
  }

  // ─── Update a single petal ──────────────────────────────
  function updatePetal(p, time, dt) {
    const speedMult = scrollMult * (p.z * 0.4 + 0.6);

    // Horizontal sine wave
    p.drift = Math.sin(time * p.waveFreq + p.phase) * p.waveAmp;

    // Fall
    p.y += p.vy * speedMult * dt * 0.06;
    p.x += p.vx * dt * 0.06;
    p.rotation += p.rotSpeed * dt * 0.06;

    // Mouse interaction — petals within 180px drift gently toward cursor
    const dx = mouseX - (p.x + p.drift);
    const dy = mouseY - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 180) {
      const force = (1 - dist / 180) * 0.12;
      p.driftVx += dx * force * 0.012;
      p.driftVy += dy * force * 0.012;
    }

    // Return to natural path over ~2.5s
    p.driftVx *= 0.965;
    p.driftVy *= 0.965;
    p.x += p.driftVx * dt * 0.06;
    p.y += p.driftVy * dt * 0.06;

    // Reset when off-screen
    if (p.y > canvas.height + p.size * 2 ||
        p.x < -p.size * 4 ||
        p.x > canvas.width + p.size * 4) {
      const layer = LAYERS[p.z];
      Object.assign(p, createPetal(layer, -p.size * 2));
    }
  }

  // ─── Render loop ────────────────────────────────────────
  let lastTime = 0;

  function render(timestamp) {
    const dt = Math.min(timestamp - lastTime, 50); // cap at 50ms
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw back to front
    [0, 1, 2].forEach((z) => {
      petals
        .filter((p) => p.z === z)
        .forEach((p) => {
          updatePetal(p, timestamp, dt);
          drawPetal(p, timestamp);
        });
    });

    requestAnimationFrame(render);
  }

  // ─── Init ───────────────────────────────────────────────
  resize();
  seedPetals();
  requestAnimationFrame(render);

  window.addEventListener('resize', () => {
    resize();
    // Re-clamp x positions
    petals.forEach((p) => {
      if (p.x > canvas.width) p.x = Math.random() * canvas.width;
    });
  }, { passive: true });
})();
