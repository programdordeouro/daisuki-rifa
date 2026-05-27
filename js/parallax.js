/* ============================================================
   PARALLAX.JS — Daisuki Confeitaria
   5-layer mousemove parallax with cinematic lerp (0.06)
   Applied to #hero-static section
   ============================================================ */

'use strict';

(function initParallax() {
  const section = document.getElementById('hero-static');
  if (!section) return;

  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (isMobile) return; // Skip parallax on mobile

  const layers = section.querySelectorAll('.parallax-layer[data-depth-x]');
  if (!layers.length) return;

  // Layer data
  const layerData = Array.from(layers).map((el) => ({
    el,
    depthX: parseFloat(el.dataset.depthX || 0),
    depthY: parseFloat(el.dataset.depthY || 0),
    curX: 0,
    curY: 0,
  }));

  let targetX = 0;
  let targetY = 0;
  const LERP  = 0.06;

  // Center-relative mouse position (–0.5 to 0.5)
  function onMouseMove(e) {
    const rect = section.getBoundingClientRect();
    // Only active when section is in viewport
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;

    targetX = (e.clientX - window.innerWidth  / 2);
    targetY = (e.clientY - window.innerHeight / 2);
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true });

  function animate() {
    layerData.forEach((layer) => {
      // Lerp toward target
      layer.curX += (targetX - layer.curX) * LERP;
      layer.curY += (targetY - layer.curY) * LERP;

      const tx = layer.curX * layer.depthX;
      const ty = layer.curY * layer.depthY;

      layer.el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`;
    });

    requestAnimationFrame(animate);
  }

  // Start with will-change for active layers
  layerData.forEach(({ el }) => {
    el.style.willChange = 'transform';
  });

  animate();

  // Remove will-change when mouse leaves section to free GPU memory
  section.addEventListener('mouseleave', () => {
    setTimeout(() => {
      layerData.forEach(({ el }) => {
        el.style.willChange = 'auto';
      });
    }, 2000);
  });

  section.addEventListener('mouseenter', () => {
    layerData.forEach(({ el }) => {
      el.style.willChange = 'transform';
    });
  });
})();
