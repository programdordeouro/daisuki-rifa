/* ============================================================
   CORE.JS — Daisuki Confeitaria
   Lenis, GSAP, Grain canvas, Cursor glow,
   Ambient particles, Scroll reveal, Navbar, Mobile detect
   ============================================================ */

'use strict';

// ─── Mobile detection ─────────────────────────────────────
const isMobile = window.matchMedia('(max-width: 768px)').matches;
const isTouch  = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

if (isTouch) document.body.classList.add('touch-device');

// ─── Lenis smooth scroll ──────────────────────────────────
let lenis;

function initLenis() {
  if (isMobile) return; // Disable on mobile for performance

  lenis = new Lenis({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  // GSAP ticker integration
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  window.addEventListener('beforeunload', () => {
    lenis.destroy();
  });

  return lenis;
}

// ─── GSAP + ScrollTrigger setup ───────────────────────────
function initGSAP() {
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

  // Sync Lenis with ScrollTrigger
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
  }
}

// ─── Grain canvas ─────────────────────────────────────────
function initGrain() {
  const canvas = document.getElementById('grain-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let frame = 0;
  const FPS_TARGET = 12;
  const interval = 1000 / FPS_TARGET;
  let lastTime = 0;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function drawGrain() {
    const w = canvas.width;
    const h = canvas.height;
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;
    const len  = data.length;

    for (let i = 0; i < len; i += 4) {
      const v = (Math.random() * 255) | 0;
      data[i]     = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function tick(timestamp) {
    if (timestamp - lastTime < interval) {
      requestAnimationFrame(tick);
      return;
    }
    lastTime = timestamp;
    drawGrain();
    frame++;
    requestAnimationFrame(tick);
  }

  resize();
  requestAnimationFrame(tick);
  window.addEventListener('resize', resize, { passive: true });
}

// ─── Cursor glow ──────────────────────────────────────────
function initCursorGlow() {
  if (isTouch) return;

  const glow = document.getElementById('cursor-glow');
  if (!glow) return;

  let mouseX = -200, mouseY = -200;
  let glowX  = -200, glowY  = -200;
  const LERP = 0.08;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    glow.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    if (!isTouch) glow.style.opacity = '1';
  });

  function animate() {
    glowX += (mouseX - glowX) * LERP;
    glowY += (mouseY - glowY) * LERP;
    glow.style.left = glowX + 'px';
    glow.style.top  = glowY + 'px';
    requestAnimationFrame(animate);
  }
  animate();
}

// ─── Ambient light particles ──────────────────────────────
function initAmbientParticles() {
  const footer = document.getElementById('footer');
  if (!footer) return;

  const canvas = document.getElementById('footer-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const particles = [];
  const COUNT = 10;

  function resize() {
    canvas.width  = footer.offsetWidth;
    canvas.height = footer.offsetHeight;
  }

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x:      Math.random() * 0.7 * (canvas.width || 1200), // 70% left side
      y:      Math.random() * (canvas.height || 400),
      size:   30 + Math.random() * 50,
      opacity: 0.04 + Math.random() * 0.05,
      blur:   20 + Math.random() * 30,
      vy:     0.2 + Math.random() * 0.4,
      phase:  Math.random() * Math.PI * 2,
      speed:  0.001 + Math.random() * 0.001,
    });
  }

  function drawParticles(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      // Drift upward
      p.y -= p.vy;
      if (p.y + p.size < 0) {
        p.y     = canvas.height + p.size;
        p.x     = Math.random() * 0.7 * canvas.width;
      }

      // Horizontal sine sway
      const sway = Math.sin(time * p.speed + p.phase) * 25;

      ctx.save();
      ctx.filter = `blur(${p.blur}px)`;
      const grad = ctx.createRadialGradient(
        p.x + sway, p.y, 0,
        p.x + sway, p.y, p.size
      );
      grad.addColorStop(0, `rgba(246, 215, 191, ${p.opacity})`);
      grad.addColorStop(1, 'rgba(246, 215, 191, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x + sway, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    requestAnimationFrame(drawParticles);
  }

  resize();
  requestAnimationFrame(drawParticles);
  window.addEventListener('resize', resize, { passive: true });
}

// ─── Scroll reveal ────────────────────────────────────────
function initScrollReveal() {
  const revealEls = document.querySelectorAll(
    '.reveal-text, .reveal-image, .reveal-card, .reveal-line'
  );

  const options = {
    threshold: 0.18,
    rootMargin: '0px 0px -40px 0px',
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el    = entry.target;
        const delay = el.style.transitionDelay || '0s';

        // Respect existing transition-delay from inline style
        const props = {
          opacity:   1,
          transform: 'none',
          filter:    'none',
        };

        if (el.classList.contains('reveal-line')) {
          el.style.transition = `transform 0.8s cubic-bezier(0.22,1,0.36,1) ${delay},
                                  opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}`;
        } else if (el.classList.contains('reveal-card')) {
          el.style.transition = `opacity 1s cubic-bezier(0.22,1,0.36,1) ${delay},
                                  transform 1s cubic-bezier(0.22,1,0.36,1) ${delay},
                                  filter 1s cubic-bezier(0.22,1,0.36,1) ${delay}`;
        } else if (el.classList.contains('reveal-image')) {
          el.style.transition = `opacity 1.4s cubic-bezier(0.22,1,0.36,1) ${delay},
                                  transform 1.4s cubic-bezier(0.22,1,0.36,1) ${delay},
                                  filter 1.4s cubic-bezier(0.22,1,0.36,1) ${delay}`;
        } else {
          el.style.transition = `opacity 1s cubic-bezier(0.22,1,0.36,1) ${delay},
                                  transform 1s cubic-bezier(0.22,1,0.36,1) ${delay}`;
        }

        requestAnimationFrame(() => {
          el.classList.add('revealed');
          Object.assign(el.style, props);
        });

        observer.unobserve(el);
      }
    });
  }, options);

  revealEls.forEach((el) => observer.observe(el));

  // Mobile: just show everything immediately
  if (isMobile) {
    revealEls.forEach((el) => {
      el.classList.add('revealed');
      el.style.opacity   = '1';
      el.style.transform = 'none';
      el.style.filter    = 'none';
    });
  }
}

// ─── Floral SVG draw-on ───────────────────────────────────
function initFloralDraw() {
  const paths = document.querySelectorAll('.hero-floral-icon .draw-path');
  if (!paths.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        paths.forEach((p) => p.classList.add('drawn'));
        observer.disconnect();
      }
    });
  }, { threshold: 0.5 });

  const icon = document.querySelector('.hero-floral-icon');
  if (icon) observer.observe(icon);
}

// ─── Navbar scroll behaviour ──────────────────────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrolled = window.scrollY > 60;
        navbar.classList.toggle('scrolled', scrolled);
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Hamburger
  const hamburger = document.getElementById('nav-hamburger');
  const navLinks  = document.getElementById('nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }
}

// ─── Scroll-to helpers (nav links) ────────────────────────
function initSmoothNav() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();

      if (lenis) {
        lenis.scrollTo(target, { offset: -72, duration: 1.6 });
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ─── Timeline reveal ──────────────────────────────────────
function initTimeline() {
  const section = document.getElementById('historia');
  if (!section) return;

  const items = section.querySelectorAll('.timeline-item');
  const line  = section.querySelector('.timeline-svg-line');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if (line) line.classList.add('drawn');

        items.forEach((item) => {
          const delay = parseInt(item.dataset.delay || 0, 10);
          setTimeout(() => item.classList.add('visible'), delay);
        });

        observer.disconnect();
      }
    });
  }, { threshold: 0.35 });

  observer.observe(section);
}

// ─── Form card glass reveal ───────────────────────────────
function initFormReveal() {
  const card = document.getElementById('rifa-form-card');
  if (!card) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        card.classList.add('revealed');
        observer.disconnect();
      }
    });
  }, { threshold: 0.2 });

  observer.observe(card);
}

// ─── Product card hover specular ──────────────────────────
function initProductCardSpecular() {
  const cards = document.querySelectorAll('.product-card');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
      const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });
  });
}

// ─── Product cards drop animation ────────────────────────
function initProductDrop() {
  const grid = document.getElementById('doces-grid');
  if (!grid) return;

  const cards = grid.querySelectorAll('.product-card');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        cards.forEach((card, i) => {
          setTimeout(() => {
            card.classList.add('visible');
            // Tiny shake on landing
            setTimeout(() => {
              card.style.transition = 'transform 0.08s ease';
              card.style.transform  = 'translateY(2px)';
              setTimeout(() => { card.style.transform = ''; }, 80);
            }, 750);
          }, i * 120);
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.4 });

  observer.observe(grid);
}

// ─── Historia photo parallax scroll ──────────────────────
function initHistoriaPhoto() {
  const photo = document.getElementById('historia-photo');
  if (!photo || isMobile) return;

  const img = photo.querySelector('img');
  if (!img) return;

  ScrollTrigger.create({
    trigger: '#historia',
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      const p = self.progress;
      const scale = 1.05 - (p * 0.05);
      img.style.transform = `scale(${scale})`;
    },
  });
}

// ─── Scroll indicator hide on first scroll ───────────────
function initScrollIndicatorVideo() {
  const indicator = document.getElementById('scroll-indicator-video');
  if (!indicator) return;

  const handler = () => {
    if (window.scrollY > 80) {
      indicator.style.opacity = '0';
      indicator.style.pointerEvents = 'none';
      window.removeEventListener('scroll', handler);
    }
  };
  window.addEventListener('scroll', handler, { passive: true });
}

// ─── Init all ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  lenis = initLenis();
  initGSAP();

  if (!isMobile) {
    initGrain();
    initCursorGlow();
  }

  initAmbientParticles();
  initScrollReveal();
  initFloralDraw();
  initNavbar();
  initSmoothNav();
  initTimeline();
  initFormReveal();
  initProductCardSpecular();
  initProductDrop();
  initHistoriaPhoto();
  initScrollIndicatorVideo();
});

// Export lenis for other modules
window.daisukiLenis = () => lenis;
