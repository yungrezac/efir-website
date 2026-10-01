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
  function trackArrival() {
    let session;
    try { session = sessionStorage.getItem('efir-landing-session'); if (!/^[a-f0-9-]{36}$/.test(session || '')) { session = crypto.randomUUID(); sessionStorage.setItem('efir-landing-session', session); } }
    catch { session = crypto.randomUUID(); }
    // Retry the same event identity: the database deduplicates successful deliveries.
    const body = JSON.stringify({ p_slug: code, p_session: session });
    async function send(attempt = 0) {
      try {
        const response = await fetch('https://qpoyojxupblhjeqbvqfr.supabase.co/rest/v1/rpc/landing_referral_track', { method: 'POST', keepalive: true, headers: { apikey: 'sb_publishable_QxJKRVOdn07hduJkqcbciw_oUADNl-C', 'Content-Type': 'application/json' }, body });
        if (!response.ok) throw new Error('Referral tracking HTTP ' + response.status);
      } catch (error) {
        if (attempt < 2) setTimeout(() => send(attempt + 1), 1500 * (attempt + 1));
        else console.warn('Не удалось учесть переход по коду автора:', error.message);
      }
    }
    send();
  }
  if (fromLink) {
    if (document.visibilityState !== 'hidden') trackArrival();
    else document.addEventListener('visibilitychange', function visible() {
      if (document.visibilityState !== 'hidden') { trackArrival(); document.removeEventListener('visibilitychange', visible); }
    });
  }
  // A closed homepage still preserves the code and records the arrival.
  if (document.currentScript?.hasAttribute('data-tracking-only')) return;
  const section = document.createElement('section');
  section.className = 'section-shell';
  section.setAttribute('aria-labelledby', 'referral-entry-title');
  section.style.cssText = 'position:relative;z-index:3;margin:16px auto;padding:16px 20px;border:1px solid #baff683d;border-radius:18px;background:#181c16;display:flex;flex-wrap:wrap;gap:10px 20px;align-items:center';
  const title = document.createElement('h2');
  title.id = 'referral-entry-title';
  title.textContent = 'Ваш промокод';
  title.style.cssText = 'font-size:18px;line-height:1.2;margin:0';
  const text = document.createElement('p');
  text.textContent = 'Загружаем приложения…';
  text.style.cssText = 'flex-basis:100%;font-size:14px;line-height:1.5;margin:0;color:#aab69e';
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;align-items:center';
  const value = document.createElement('input');
  value.value = code;
  value.readOnly = true;
  value.setAttribute('aria-label', 'Промокод');
  value.style.cssText = 'width:150px;max-width:100%;border:1px solid #697060;background:#101510;color:#c3ff77;border-radius:10px;padding:9px 12px;font:600 16px monospace';
  value.onclick = () => value.select();
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'button button-primary';
  copy.textContent = 'Скопировать';
  copy.style.cssText = 'min-height:40px;min-width:0;width:auto;padding:9px 16px;font-size:14px';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.style.cssText = 'flex-basis:100%;margin:0;font-size:14px;line-height:1.5';
  status.hidden = true;
  copy.onclick = async () => {
    status.hidden = false;
    try { await navigator.clipboard.writeText(code); status.textContent = 'Скопировано'; }
    catch { value.focus(); value.select(); status.textContent = 'Нажмите Ctrl+C, чтобы скопировать.'; }
  };
  row.append(value, copy);
  section.append(title, row, text, status);
  const main = document.querySelector('main');
  if (!main) return;
  main.prepend(section);
  fetch('https://qpoyojxupblhjeqbvqfr.supabase.co/rest/v1/rpc/referral_code_info', {method:'POST',headers:{apikey:'sb_publishable_QxJKRVOdn07hduJkqcbciw_oUADNl-C','Content-Type':'application/json'},body:JSON.stringify({p_code:code})})
    .then(response=>{if(!response.ok)throw Error('unavailable');return response.json();})
    .then(info=>{text.textContent=info?(info.apps?.length?'В каталоге: '+info.apps.map(a=>a.name).join(', ')+'. Для запуска нужна подписка.':'Для этого промокода пока не выбраны приложения.'):'Промокод сейчас недоступен.';})
    .catch(()=>{text.textContent='Список приложений появится при применении промокода в EFIR.';});
})();
