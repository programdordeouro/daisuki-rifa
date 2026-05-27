/* ============================================================
   VIDEO.JS — Daisuki Confeitaria

   Filosofia: o vídeo toca EXATAMENTE como foi enviado.
   Scroll controla o tempo do vídeo. Nada mais.

   Ao FINAL do container (500vh percorridos):
   Uma única transição 3D cinematográfica e imersiva — dispara
   uma vez, animação suave e rápida, revela a seção abaixo.

   Mobile: autoplay loop sem scroll control.
   ============================================================ */

'use strict';

(function initVideoHero() {

  const video     = document.getElementById('hero-video');
  const container = document.getElementById('video-scroll-container');
  const overlay   = document.getElementById('video-overlay-text');
  const indicator = document.getElementById('scroll-indicator-video');

  if (!video || !container) return;

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  /* ═══════════════════════════════════════════════════════
     MOBILE — autoplay loop simples
  ═══════════════════════════════════════════════════════ */
  if (isMobile) {
    video.loop     = true;
    video.autoplay = true;
    video.muted    = true;
    video.play().catch(() => {});
    setTimeout(animateOverlay, 700);
    return;
  }

  /* ═══════════════════════════════════════════════════════
     DESKTOP — scrub puro
  ═══════════════════════════════════════════════════════ */

  video.pause();
  video.currentTime = 0;
  /* O vídeo não tem nenhum transform inline — fica como chegou */

  /* ─── Overlay de texto ──────────────────────────────── */
  let endTriggered = false;

  /* ─── ScrollTrigger ─────────────────────────────────── */
  function setupScrub() {
    if (!video.duration || isNaN(video.duration)) {
      setTimeout(setupScrub, 150);
      return;
    }

    const dur = video.duration;

    ScrollTrigger.create({
      trigger: container,
      start:   'top top',
      end:     'bottom bottom',
      scrub:   true,          // segue o scroll 1:1, sem lag artificial
      onUpdate(self) {
        const p = self.progress;

        /* ── Scrub: move o frame do vídeo ── */
        const target = p * dur;
        if (Math.abs(video.currentTime - target) > 0.033) {
          video.currentTime = target;
        }

        /* ── Overlay text: desaparece aos 20% ── */
        if (overlay) {
          const a = Math.max(0, 1 - p * 5);
          overlay.style.opacity   = a;
          overlay.style.transform = `translateY(${(1 - a) * -18}px)`;
        }

        /* ── Scroll indicator: some ao primeiro rolar ── */
        if (indicator && p > 0.02) {
          indicator.style.opacity        = '0';
          indicator.style.pointerEvents  = 'none';
        }
      },

      /* ── Transição final: dispara UMA vez ao sair do container ── */
      onLeave() {
        if (!endTriggered) {
          endTriggered = true;
          triggerCinematic();
        }
      },

      /* ── Se o usuário voltar ao topo, reseta ── */
      onEnterBack() {
        endTriggered = false;
      },
    });

    /* Overlay text animado ao carregar */
    setTimeout(animateOverlay, 400);
  }

  video.addEventListener('loadedmetadata', setupScrub, { once: true });
  video.addEventListener('canplay',        setupScrub, { once: true });
  setupScrub();

  /* ═══════════════════════════════════════════════════════
     TRANSIÇÃO 3D FINAL — dispara uma vez

     Sensação: câmera avança para dentro da tela,
     luz branca quente explode do centro,
     dissolve para o cream e a seção abaixo.
  ═══════════════════════════════════════════════════════ */
  function triggerCinematic() {
    const wrapper = video.parentElement;   // .video-sticky-wrapper

    /* 1. Veil creme que cobre a tela */
    const veil = document.createElement('div');
    Object.assign(veil.style, {
      position:      'fixed',
      inset:         '0',
      background:    'radial-gradient(ellipse at 50% 50%, #FDFAF6 0%, #F7F0E8 60%, #EDE0D0 100%)',
      zIndex:        '100',
      opacity:       '0',
      pointerEvents: 'none',
      willChange:    'opacity',
    });

    /* 2. Pote de chocolate — posicionado via left/top, offset via GSAP x */
    const pot = document.createElement('div');
    Object.assign(pot.style, {
      position:     'fixed',
      left:         'calc(50% - 55px)',
      top:          '30%',
      width:        '110px',
      height:       '95px',
      borderRadius: '10px 10px 26px 26px',
      background:   'linear-gradient(165deg, #4A2818 0%, #2C1810 55%, #1A0C06 100%)',
      boxShadow:    'inset 0 3px 10px rgba(255,255,255,0.07), 0 10px 40px rgba(0,0,0,0.55)',
      zIndex:       '102',
      opacity:      '0',
      willChange:   'transform, opacity',
    });

    /* 3. Blob de creme */
    const cream = document.createElement('div');
    Object.assign(cream.style, {
      position:     'fixed',
      left:         'calc(50% - 42px)',
      top:          '18%',
      width:        '105px',
      height:       '82px',
      borderRadius: '52% 48% 60% 40% / 46% 54% 42% 58%',
      background:   'radial-gradient(ellipse at 42% 36%, #FDF6EE 0%, #F0E4D5 55%, #E2D0BC 100%)',
      boxShadow:    '0 4px 18px rgba(44,24,16,0.14)',
      zIndex:       '102',
      opacity:      '0',
      willChange:   'transform, opacity',
    });

    /* 4. Brigadeiro */
    const brig = document.createElement('div');
    Object.assign(brig.style, {
      position:     'fixed',
      left:         'calc(50% + 22px)',
      top:          '24%',
      width:        '60px',
      height:       '60px',
      borderRadius: '50%',
      background:   'radial-gradient(ellipse at 36% 30%, #5D3018 0%, #2C1810 65%, #160A04 100%)',
      boxShadow:    '0 6px 22px rgba(0,0,0,0.5), inset 0 -3px 8px rgba(0,0,0,0.35)',
      zIndex:       '102',
      opacity:      '0',
      willChange:   'transform, opacity',
    });

    document.body.append(veil, pot, cream, brig);

    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });

    tl
      .set(wrapper, { transformStyle: 'preserve-3d', transformOrigin: '50% 50%' })

      /* Fase 1 — câmera avança 3D */
      .to(video, {
        scale:    1.12,
        filter:   'brightness(1.8) saturate(0.6)',
        duration: 0.55,
        ease:     'power3.in',
      })

      /* Fase 2 — flash creme */
      .to(veil, {
        opacity:  1,
        duration: 0.22,
        ease:     'power4.out',
      }, '-=0.22')

      /* Fase 3 — vídeo apagado */
      .set(video, { opacity: 0, scale: 1, filter: 'none' })

      /* Fase 4 — peças surgem abruptamente */
      .to([pot, cream, brig], {
        opacity:  1,
        duration: 0.08,
        ease:     'none',
      }, '+=0.06')

      /* Fase 5 — queda com gravidade */
      .to(pot, {
        y: '115vh', rotation: -24,
        duration: 1.1, ease: 'power2.in',
      }, 'fall')

      .to(cream, {
        y: '128vh', x: '-28px', rotation: 16,
        duration: 0.95, ease: 'power2.in',
      }, 'fall+=0.04')

      .to(brig, {
        y: '135vh', x: '28px', rotation: 380,
        duration: 0.88, ease: 'power2.in',
      }, 'fall+=0.09')

      /* Fade out das peças conforme caem */
      .to([pot, cream, brig], {
        opacity:  0,
        duration: 0.5,
        ease:     'power1.out',
      }, 'fall+=0.55')

      /* Veil dissolve revelando a seção abaixo */
      .to(veil, {
        opacity:  0,
        duration: 0.85,
        ease:     'power2.out',
      }, 'fall+=0.28')

      /* Cleanup */
      .call(() => {
        veil.remove();
        pot.remove();
        cream.remove();
        brig.remove();
        gsap.set(video, { clearProps: 'all' });
        gsap.set(wrapper, { clearProps: 'all' });
      });
  }

  /* ═══════════════════════════════════════════════════════
     OVERLAY TEXT — Splitting.js char-by-char reveal
  ═══════════════════════════════════════════════════════ */
  function animateOverlay() {
    if (!overlay || typeof Splitting === 'undefined') return;

    const targets = overlay.querySelectorAll('[data-splitting]');
    if (!targets.length) return;

    targets.forEach((el) => Splitting({ target: el, by: 'chars' }));

    const chars = overlay.querySelectorAll('.char');
    chars.forEach((c, i) => {
      Object.assign(c.style, {
        display:         'inline-block',
        opacity:         '0',
        transform:       'translateY(40px)',
        filter:          'blur(6px)',
        transition:      [
          `opacity  1.5s cubic-bezier(0.16,1,0.3,1) ${(i * 0.025).toFixed(3)}s`,
          `transform 1.5s cubic-bezier(0.16,1,0.3,1) ${(i * 0.025).toFixed(3)}s`,
          `filter    1.5s cubic-bezier(0.16,1,0.3,1) ${(i * 0.025).toFixed(3)}s`,
        ].join(','),
      });
    });

    requestAnimationFrame(() => requestAnimationFrame(() => {
      chars.forEach((c) => {
        c.style.opacity   = '1';
        c.style.transform = 'none';
        c.style.filter    = 'none';
      });
    }));
  }

})();
