(() => {
  'use strict';

  // A browser version of the overlay in tiktimer/timer.html. Both placements
  // share one clock; the website supplies sample gift events instead of IPC.
  const previews = [...document.querySelectorAll('[data-tiktimer-preview]')];
  const root = document.documentElement;
  const state = { timeLeft: 3600, multiplier: { isActive: false, value: 2, timeLeft: 0 } };
  let elapsed = 0;

  function formatTime(totalSeconds) {
    const h = Math.floor(Math.abs(totalSeconds) / 3600);
    const m = Math.floor((Math.abs(totalSeconds) % 3600) / 60);
    const s = Math.abs(totalSeconds) % 60;
    return `${totalSeconds < 0 ? '-' : ''}${[h, m, s].map(value => String(value).padStart(2, '0')).join(':')}`;
  }

  const views = previews.map(preview => {
    const stage = preview.querySelector('.tt-stage');
    const timer = preview.querySelector('.tt-timer');
    const multiplier = document.createElement('div');
    multiplier.className = 'tt-multiplier';
    multiplier.hidden = true;
    const label = document.createElement('span');
    label.className = 'tt-multiplier-label';
    label.textContent = '⚡ ПРИБАВЛЯЕТ (x2)';
    const duration = document.createElement('span');
    duration.className = 'tt-multiplier-time';
    multiplier.append(label, duration);
    timer.appendChild(multiplier);
    return { preview, stage, time: preview.querySelector('.tt-time'), multiplier, duration };
  });

  function resizePreview(preview) {
    // Fit the source's 1000×560 composition with proportional header space.
    const scale = Math.max(0, Math.min(preview.clientWidth / 1000, (preview.clientHeight - 40 * preview.clientWidth / 1000) / 560, 1));
    preview.style.setProperty('--tt-scale', scale);
  }
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(entries => entries.forEach(({ target }) => resizePreview(target)));
    previews.forEach(preview => observer.observe(preview));
  } else {
    window.addEventListener('resize', () => previews.forEach(resizePreview), { passive: true });
  }
  previews.forEach(resizePreview);

  function render() {
    // timer.html applies the multiplier color before the final-five-minute red.
    const color = state.multiplier.isActive ? '#34d399' : state.timeLeft > 0 && state.timeLeft <= 300 ? '#ef4444' : '#ffffff';
    const rgb = color === '#34d399' ? '52,211,153' : color === '#ef4444' ? '239,68,68' : '255,255,255';
    views.forEach(view => {
      view.time.textContent = formatTime(state.timeLeft);
      view.time.style.color = color;
      view.time.style.textShadow = `var(--tt-shadow), 0px 10px 40px rgba(${rgb},.4), 0px 0px 60px rgba(${rgb},.3)`;
      view.multiplier.hidden = !state.multiplier.isActive;
      view.duration.textContent = formatTime(state.multiplier.timeLeft);
    });
  }

  function showGift(seconds) {
    views.forEach(({ preview, stage }) => {
      if (!preview.closest('.in-view')) return;
      const alert = document.createElement('span');
      alert.className = 'tt-alert';
      alert.textContent = `+${seconds} сек`;
      stage.appendChild(alert);
      alert.addEventListener('animationend', () => alert.remove(), { once: true });
      alert.addEventListener('animationcancel', () => alert.remove(), { once: true });
    });
  }

  render();
  setInterval(() => {
    if (document.hidden || root.classList.contains('motion-paused') || !previews.some(preview => preview.closest('.in-view'))) return;
    elapsed += 1;
    state.timeLeft -= 1;
    if (state.multiplier.isActive) {
      state.multiplier.timeLeft -= 1;
      state.multiplier.isActive = state.multiplier.timeLeft > 0;
    }
    // The real multiplier affects gifted seconds, never the countdown speed.
    if (elapsed % 100 === 20) {
      state.multiplier.isActive = true;
      state.multiplier.timeLeft = 60;
    }
    if (elapsed % 10 === 8) {
      const seconds = 60 * (state.multiplier.isActive ? state.multiplier.value : 1);
      state.timeLeft += seconds;
      showGift(seconds);
    }
    render();
  }, 1000);
})();
