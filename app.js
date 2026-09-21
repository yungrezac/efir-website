(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionToggle = document.getElementById('motion-toggle');
  let savedMotion = null;
  try { savedMotion = localStorage.getItem('efir-motion-paused'); } catch { /* Storage may be unavailable in a local preview. */ }
  let motionPaused = reducedMotion.matches || savedMotion === 'true';
  const motionAllowed = () => !motionPaused && !document.hidden;

  function setMotion(paused, persist = false) {
    motionPaused = paused || reducedMotion.matches;
    root.classList.toggle('motion-paused', motionPaused);
    motionToggle.setAttribute('aria-pressed', String(motionPaused));
    motionToggle.disabled = reducedMotion.matches;
    const label = reducedMotion.matches
      ? 'Анимации отключены в настройках устройства'
      : motionPaused ? 'Включить анимации' : 'Выключить анимации';
    motionToggle.setAttribute('aria-label', label);
    motionToggle.title = label;
    if (persist) {
      savedMotion = String(paused);
      try { localStorage.setItem('efir-motion-paused', String(paused)); } catch { /* Optional preference. */ }
    }
  }
  setMotion(motionPaused);
  motionToggle.addEventListener('click', () => setMotion(!motionPaused, true));
  reducedMotion.addEventListener('change', (event) => setMotion(event.matches || savedMotion === 'true'));
  document.addEventListener('visibilitychange', () => root.classList.toggle('page-hidden', document.hidden));

  // Content stays visible if JavaScript or IntersectionObserver is unavailable.
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          if (motionAllowed()) {
            const element = entry.target;
            element.classList.add('is-revealing');
            const settle = event => {
              if (event.target !== element) return;
              element.classList.remove('is-revealing');
              element.removeEventListener('animationend', settle);
              element.removeEventListener('animationcancel', settle);
            };
            element.addEventListener('animationend', settle);
            element.addEventListener('animationcancel', settle);
          }
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.09 });
    document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
    root.classList.add('js-ready');

    const activityObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('in-view', entry.isIntersecting));
    }, { rootMargin: '60px' });
    document.querySelectorAll('.hero-art, .project-visual').forEach((element) => activityObserver.observe(element));
  } else {
    document.querySelectorAll('.hero-art, .project-visual').forEach((element) => element.classList.add('in-view'));
  }

  const progress = document.getElementById('page-progress');
  let scrollScheduled = false;
  function updateProgress() {
    const distance = root.scrollHeight - window.innerHeight;
    const amount = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0;
    progress.style.transform = `scaleX(${amount})`;
    scrollScheduled = false;
  }
  function scheduleProgress() {
    if (!scrollScheduled) {
      scrollScheduled = true;
      requestAnimationFrame(updateProgress);
    }
  }
  window.addEventListener('scroll', scheduleProgress, { passive: true });
  window.addEventListener('resize', scheduleProgress, { passive: true });
  updateProgress();

  const hero = document.querySelector('.hero');
  const parallax = document.getElementById('hero-parallax');
  let pointerFrame = 0;
  hero.addEventListener('pointermove', (event) => {
    if (!motionAllowed() || !finePointer.matches || pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      const bounds = hero.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      parallax.style.setProperty('--rotate-x', `${-y * 7}deg`);
      parallax.style.setProperty('--rotate-y', `${x * 9}deg`);
      pointerFrame = 0;
    });
  }, { passive: true });
  hero.addEventListener('pointerleave', () => {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    parallax.style.setProperty('--rotate-x', '0deg');
    parallax.style.setProperty('--rotate-y', '0deg');
  });
  document.querySelectorAll('[data-preview-scene]').forEach((scene) => {
    scene.addEventListener('pointermove', (event) => {
      if (!motionAllowed() || !finePointer.matches) return;
      const bounds = scene.getBoundingClientRect();
      scene.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`);
      scene.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`);
    }, { passive: true });
  });

  const wave = document.getElementById('voice-wave');
  const bars = document.createDocumentFragment();
  for (let index = 0; index < 43; index += 1) {
    const bar = document.createElement('i');
    const envelope = Math.sin((index / 42) * Math.PI);
    const height = 8 + envelope * (18 + Math.abs(Math.sin(index * 1.83)) * 43);
    bar.style.setProperty('--bar-height', `${height.toFixed(1)}px`);
    bar.style.setProperty('--bar-delay', `${(-index * 0.17).toFixed(2)}s`);
    bar.style.setProperty('--bar-opacity', (0.35 + envelope * 0.65).toFixed(2));
    bars.appendChild(bar);
  }
  wave.appendChild(bars);

  document.getElementById('year').textContent = new Date().getFullYear();
  // The relative file works on static hosting and when index.html is opened directly.
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    fetch('./release.json', { cache: 'no-cache' })
      .then((response) => response.ok ? response.json() : null)
      .then((release) => {
        if (!release) return;
        if (release.url === 'https://github.com/yungrezac/efirlauncher/releases/latest/download/EFIR-Launcher-Setup.exe') {
          document.querySelectorAll('.download-link').forEach(link => { link.href = release.url; });
        }
        if (typeof release.version === 'string' && /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(release.version)) {
          document.querySelectorAll('[data-release-version]').forEach((element) => { element.textContent = `v${release.version}`; });
        }
        if (Number.isFinite(release.bytes) && release.bytes > 0) {
          const size = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(release.bytes / 1024 / 1024);
          document.querySelectorAll('[data-release-size]').forEach((element) => { element.textContent = `· ${size} МБ`; });
        }
      })
      .catch(() => { /* Download links work independently of optional version metadata. */ });
  }
})();
