(() => {
  'use strict';
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  // The installer remains available without JavaScript or release metadata.
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  fetch('/release.json', { cache: 'no-cache' })
    .then(response => response.ok ? response.json() : null)
    .then(release => {
      if (!release) return;
      const downloadUrl = 'https://github.com/yungrezac/efirlauncher/releases/latest/download/EFIR-Launcher-Setup.exe';
      if (release.url === downloadUrl) {
        document.querySelectorAll('.download-link').forEach(link => { link.href = downloadUrl; });
      }
      if (Number.isFinite(release.bytes) && release.bytes > 0) {
        const size = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(release.bytes / 1024 / 1024);
        document.querySelectorAll('[data-release-size]').forEach(element => { element.textContent = ` · ${size} МБ`; });
      }
    })
    .catch(() => { /* Optional metadata must not block downloads. */ });
})();
