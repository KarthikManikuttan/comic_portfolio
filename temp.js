
(function(){
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  gsap.registerPlugin(ScrollTrigger);

  // ==========================================
  // HAMBURGER MENU
  // ==========================================
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileNav = document.getElementById('mobileNav');
  hamburgerBtn.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
  });
  mobileNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => mobileNav.classList.remove('open'));
  });

  // ==========================================
  // SCROLL PROGRESS (GSAP)
  // ==========================================
  gsap.to('.scroll-progress', {
    width: '100%',
    ease: 'none',
    scrollTrigger: {
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.3
    }
  });

  // ==========================================
  // HERO ENTRANCE TIMELINE
  // ==========================================
  if (!reduceMotion) {
    const heroEls = gsap.utils.toArray('[data-hero]');
    const heroTl = gsap.timeline({ defaults: { ease: 'back.out(1.7)', duration: 0.7 } });

    gsap.set(heroEls, { opacity: 0, y: 30 });
    gsap.set('.burst', { opacity: 0, scale: 0.4, rotation: -40 });

    heroTl
      .to(heroEls[0], { opacity: 1, y: 0, duration: 0.5 }, 0.1)       // issue tag
      .to(heroEls[1], { opacity: 1, y: 0, duration: 0.8 }, 0.2)       // h1
      .to(heroEls[2], { opacity: 1, y: 0, scale: 1, rotation: 1.5, duration: 0.6 }, 0.4) // sub
      .to(heroEls[3], { opacity: 1, y: 0, duration: 0.5 }, 0.55)      // deck
      .to(heroEls[4], { opacity: 1, y: 0, duration: 0.5 }, 0.7)       // ctas
      .to(heroEls[5], { opacity: 1, y: 0, duration: 0.6 }, 0.8)       // terminal
      .to('.burst', {
        opacity: 1, scale: 1, rotation: 0,
        duration: 0.9, ease: 'elastic.out(1, 0.5)'
      }, 0.3);
  }

  // ==========================================
  // TERMINAL TYPING (unchanged)
  // ==========================================
  const terminalBody = document.getElementById('terminalBody');
  const terminalLines = [
    { text: '$ flutter run', cls: '' },
    { text: 'Compiling lib/main.dart...', cls: 'line' },
    { text: '✓ Built in 4.2s', cls: 'ok' }
  ];
  function typeTerminal() {
    if (reduceMotion) {
      terminalBody.innerHTML = terminalLines.map(l => `<div class="${l.cls}">${l.text}</div>`).join('');
      return;
    }
    let li = 0, ci = 0;
    terminalBody.innerHTML = '<div><span class="cursor"></span></div>';
    function step() {
      if (li >= terminalLines.length) return;
      const line = terminalLines[li];
      const current = line.text.slice(0, ci);
      terminalBody.innerHTML =
        terminalLines.slice(0, li).map(l => `<div class="${l.cls}">${l.text}</div>`).join('') +
        `<div class="${line.cls}">${current}<span class="cursor"></span></div>`;
      ci++;
      if (ci <= line.text.length) { setTimeout(step, 22); }
      else { li++; ci = 0; setTimeout(step, 260); }
    }
    step();
  }
  setTimeout(typeTerminal, 900);

  // ==========================================
  // TICKER (GSAP marquee)
  // ==========================================
  const tickerTrack = document.getElementById('tickerTrack');
  if (!reduceMotion) {
    gsap.to(tickerTrack, {
      xPercent: -50,
      repeat: -1,
      duration: 18,
      ease: 'none'
    });
  } else {
    gsap.to(tickerTrack, {
      xPercent: -50,
      repeat: -1,
      duration: 60,
      ease: 'none'
    });
  }

  // ==========================================
  // SECTION TITLE & KICKER REVEALS
  // ==========================================
  gsap.utils.toArray('.kicker').forEach(el => {
    gsap.from(el, {
      x: -40, opacity: 0, duration: 0.6, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });
  gsap.utils.toArray('.section-title').forEach(el => {
    gsap.from(el, {
      y: 50, opacity: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  // ==========================================
  // PANEL REVEALS (about, timeline, etc.)
  // ==========================================
  gsap.utils.toArray('.panel').forEach(panel => {
    gsap.from(panel, {
      y: 40, opacity: 0, rotation: gsap.utils.random(-2, 2), scale: 0.97,
      duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: panel, start: 'top 88%' }
    });
  });

  // ==========================================
  // ABOUT FACTS STAGGER
  // ==========================================
  gsap.from('.about-fact', {
    y: 20, opacity: 0, duration: 0.5, stagger: 0.12, ease: 'back.out(1.7)',
    scrollTrigger: { trigger: '.about-facts', start: 'top 90%' }
  });

  // ==========================================
  // EXPERIENCE TIMELINE
  // ==========================================
  gsap.from('.timeline-line', {
    scaleY: 0, transformOrigin: 'top',
    ease: 'none',
    scrollTrigger: {
      trigger: '.timeline',
      start: 'top 70%',
      end: 'bottom 40%',
      scrub: 1
    }
  });

  gsap.utils.toArray('.timeline-entry').forEach((entry, i) => {
    const fromX = i % 2 === 0 ? -80 : 80;
    gsap.from(entry, {
      x: fromX, opacity: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: entry, start: 'top 85%' }
    });
  });

  gsap.utils.toArray('.timeline-dot').forEach(dot => {
    gsap.from(dot, {
      scale: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)',
      scrollTrigger: { trigger: dot, start: 'top 85%' }
    });
  });

  // ==========================================
  // PLATFORM CHIPS STAGGER
  // ==========================================
  gsap.from('.platform-chip', {
    y: 20, opacity: 0, duration: 0.4, stagger: 0.1, ease: 'back.out(1.7)',
    scrollTrigger: { trigger: '.platform-row', start: 'top 88%' }
  });

  // ==========================================
  // POWERS GRID STAGGER
  // ==========================================
  gsap.from('.power', {
    y: 30, opacity: 0, scale: 0.95, duration: 0.5, stagger: 0.08, ease: 'back.out(1.5)',
    scrollTrigger: { trigger: '.powers-grid', start: 'top 88%' }
  });

  // ==========================================
  // PROJECT ROWS ENTRANCE
  // ==========================================
  gsap.utils.toArray('.project-row').forEach(row => {
    const info = row.querySelector('.project-info');
    const scene = row.querySelector('.mockup-scene');

    gsap.from(info, {
      x: -60, opacity: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: row, start: 'top 80%' }
    });
    gsap.from(scene, {
      x: 60, opacity: 0, scale: 0.9, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: row, start: 'top 80%' }
    });
  });

  // ==========================================
  // 3D PHONE MOCKUP — SCROLL & DRAG
  // ==========================================
  const mockups = document.querySelectorAll('[data-mockup]');
  mockups.forEach(mockup => {
    let scrollRotY = 0;
    let dragOffsetY = 0;
    let isDragging = false;
    let startX = 0;
    let startDragOffset = 0;
    let tiltX = 0;

    ScrollTrigger.create({
      trigger: mockup.closest('.project-row'),
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1.5,
      onUpdate: self => {
        scrollRotY = self.progress * 360;
        if (!isDragging) {
          gsap.set(mockup, { rotateY: scrollRotY + dragOffsetY, rotateX: tiltX });
        }
      }
    });

    const row = mockup.closest('.project-row');
    row.addEventListener('mousemove', e => {
      if (isDragging) return;
      const rect = row.getBoundingClientRect();
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      tiltX = -y * 8;
      gsap.to(mockup, { rotateX: tiltX, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
    });
    row.addEventListener('mouseleave', () => {
      if (isDragging) return;
      tiltX = 0;
      gsap.to(mockup, { rotateX: 0, duration: 0.6, ease: 'power2.out', overwrite: 'auto' });
    });

    mockup.addEventListener('pointerdown', e => {
      isDragging = true;
      startX = e.clientX;
      startDragOffset = dragOffsetY;
      mockup.setPointerCapture(e.pointerId);
      mockup.style.cursor = 'grabbing';
      e.preventDefault();
    });

    mockup.addEventListener('pointermove', e => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      dragOffsetY = startDragOffset + dx * 0.8;
      gsap.set(mockup, { rotateY: scrollRotY + dragOffsetY, rotateX: tiltX });
    });

    const endDrag = () => {
      isDragging = false;
      mockup.style.cursor = 'grab';
    };
    mockup.addEventListener('pointerup', endDrag);
    mockup.addEventListener('pointercancel', endDrag);
  });

  // ==========================================
  // FEATURE CARDS STAGGER
  // ==========================================
  gsap.from('.feature-card', {
    y: 50, opacity: 0, rotation: gsap.utils.random(-2, 2), duration: 0.8, stagger: 0.2, ease: 'power3.out',
    scrollTrigger: { trigger: '.featured-grid', start: 'top 85%' }
  });

  // ==========================================
  // ACHIEVEMENTS STAGGER
  // ==========================================
  gsap.from('.achievement', {
    y: 40, opacity: 0, scale: 0.92, duration: 0.6, stagger: 0.12, ease: 'back.out(1.5)',
    scrollTrigger: { trigger: '.achievements-grid', start: 'top 85%' }
  });

  // ==========================================
  // STAT COUNTERS (GSAP)
  // ==========================================
  gsap.utils.toArray('.stat .num').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    if (target === 0) {
      el.textContent = '0' + suffix;
      return;
    }
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 2,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
      onUpdate: () => { el.textContent = Math.round(obj.val) + suffix; }
    });
  });

  // ==========================================
  // SOCIAL CARDS STAGGER
  // ==========================================
  gsap.from('.social-card', {
    y: 30, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)',
    scrollTrigger: { trigger: '.social-grid', start: 'top 88%' }
  });

  // ==========================================
  // CONTACT PANEL
  // ==========================================
  gsap.from('.contact-panel', {
    y: 40, opacity: 0, scale: 0.97, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.contact-panel', start: 'top 88%' }
  });

  // ==========================================
  // FOOTER
  // ==========================================
  gsap.from('footer', {
    opacity: 0, duration: 0.6,
    scrollTrigger: { trigger: 'footer', start: 'top 95%' }
  });

  // ==========================================
  // GO TO TOP BUTTON
  // ==========================================
  const goTopBtn = document.getElementById('goTopBtn');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 600) {
      goTopBtn.classList.add('show');
    } else {
      goTopBtn.classList.remove('show');
    }
  }, { passive: true });
  if (goTopBtn) {
    goTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

})();
