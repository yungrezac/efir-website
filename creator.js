(() => {
  'use strict';
  const dialog = document.getElementById('rules-dialog');
  if (dialog) {
  document.getElementById('open-rules').addEventListener('click', () => dialog.showModal());
  for (const id of ['close-rules', 'rules-done']) document.getElementById(id).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
  }
  for (const button of document.querySelectorAll('[data-copy]')) {
    const input = document.getElementById(button.dataset.copy);
    input.addEventListener('click', () => input.select());
    button.addEventListener('click', async () => {
      const status = document.getElementById('copy-status');
      const value = input.value.replace(/\s/g, '');
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        status.textContent = 'Номер ' + button.dataset.bank + ' скопирован';
      } catch {
        input.focus(); input.select();
        status.textContent = 'Номер выделен. Выберите «Копировать».';
      }
    });
  }
})();
