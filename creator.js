(() => {
  'use strict';
  const dialog = document.getElementById('rules-dialog');
  document.getElementById('open-rules').addEventListener('click', () => dialog.showModal());
  for (const id of ['close-rules', 'rules-done']) document.getElementById(id).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
})();
