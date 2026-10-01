(() => {
  'use strict';
  const normalize = value => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{2,39}$/.test(value.trim().toLowerCase()) ? value.trim().toLowerCase() : null;
  const isHome = location.pathname === '/' || location.pathname === '/index.html';
  const landing = document.querySelector('.lp-hero, .creator-page, .portrait-page, .creator-hero, .creator-main, .brand');
  const slug = normalize(location.pathname.split('/').filter(Boolean)[0]?.replace(/\.html$/, ''));
  if (!isHome && slug && landing) {
    for (const link of document.querySelectorAll('a[href]')) {
      try {
        const target = new URL(link.href, location.href);
        if ((target.origin === location.origin || target.origin === 'https://efirlive.pro') && ['/', '/index.html'].includes(target.pathname)) {
          target.searchParams.set('ref', slug);
          link.href = target.href;
        }
      } catch { /* Unrelated link. */ }
    }
    return;
  }
  if (!isHome) return;
  const storageKey = 'efir-referral-entry';
  const query = new URLSearchParams(location.search);
  let code = normalize(query.get('ref')), fromLink = Boolean(code);
  try {
    if (code) localStorage.setItem(storageKey, JSON.stringify({ code, received_at: Date.now() }));
    else if (!query.has('ref')) {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && Date.now() - saved.received_at >= 0 && Date.now() - saved.received_at < 30 * 86400000) code = normalize(saved.code);
      else localStorage.removeItem(storageKey);
    }
  } catch { /* The code still works with storage disabled. */ }
  if (!code) return;
  const section = document.createElement('section');
  section.className = 'section-shell';
  section.setAttribute('aria-labelledby', 'referral-entry-title');
  section.style.cssText = 'position:relative;z-index:3;margin:24px auto;padding:24px;border:1px solid #baff683d;border-radius:24px;background:#181c16;scroll-margin-top:100px';
  const title = document.createElement('h2');
  title.id = 'referral-entry-title';
  title.textContent = 'Ваш код автора';
  title.style.cssText = 'font-size:24px;line-height:1.2;margin:0 0 12px';
  const text = document.createElement('p');
  text.textContent = 'После установки и входа в EFIR подтвердите этот код в разделе «Код автора». Он добавит TIMER и IMMWIGET в каталог. Для запуска нужна подписка.';
  text.style.cssText = 'max-width:780px;line-height:1.5;margin-bottom:16px';
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;align-items:center';
  const value = document.createElement('input');
  value.value = code;
  value.readOnly = true;
  value.setAttribute('aria-label', 'Код автора');
  value.style.cssText = 'min-width:160px;max-width:100%;border:1px solid #697060;background:#101510;color:#c3ff77;border-radius:10px;padding:14px;font:600 18px monospace';
  value.onclick = () => value.select();
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'button button-primary';
  copy.textContent = 'Скопировать код';
  const open = document.createElement('a');
  open.className = 'button';
  open.href = 'efir://referral?code=' + encodeURIComponent(code);
  open.textContent = 'Открыть в EFIR';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.style.cssText = 'margin:12px 0 0;line-height:1.5';
  status.textContent = '«Открыть в EFIR» работает после установки новой версии лаунчера. Код можно ввести вручную.';
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(code); status.textContent = 'Код скопирован. Вставьте его в EFIR → Код автора.'; }
    catch { value.focus(); value.select(); status.textContent = 'Код выделен. Скопируйте его и вставьте в EFIR → Код автора.'; }
  };
  row.append(value, copy, open);
  section.append(title, text, row, status);
  const main = document.querySelector('main');
  if (!main) return;
  main.prepend(section);
  function trackArrival() {
    let session;
    try { session = sessionStorage.getItem('efir-landing-session'); if (!/^[a-f0-9-]{36}$/.test(session || '')) { session = crypto.randomUUID(); sessionStorage.setItem('efir-landing-session', session); } }
    catch { session = crypto.randomUUID(); }
    fetch('https://qpoyojxupblhjeqbvqfr.supabase.co/rest/v1/rpc/landing_referral_track', { method: 'POST', keepalive: true, headers: { apikey: 'sb_publishable_QxJKRVOdn07hduJkqcbciw_oUADNl-C', 'Content-Type': 'application/json' }, body: JSON.stringify({ p_slug: code, p_session: session }) }).catch(() => {});
  }
  if (fromLink) {
    if (document.visibilityState !== 'hidden') trackArrival();
    else document.addEventListener('visibilitychange', function visible() {
      if (document.visibilityState !== 'hidden') { trackArrival(); document.removeEventListener('visibilitychange', visible); }
    });
  }
})();
