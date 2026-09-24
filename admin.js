(() => {
  'use strict';
  const SUPABASE_URL = 'https://qpoyojxupblhjeqbvqfr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_QxJKRVOdn07hduJkqcbciw_oUADNl-C';
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window.efirAdminClient=client;
  const $ = id => document.getElementById(id);
  const state = { apps: [], users: [], selectedId: null, timer: 0 };
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const initials = user => (user.name || user.email || '?').trim().slice(0, 1).toUpperCase();
  let dashboardSequence = 0;
  const pages = {
    overview: ['Обзор', 'Основные показатели за выбранный период.'],
    users: ['Пользователи', 'Управляйте эксклюзивами и доступом к приложениям без подписки.'],
    streams: ['Эфиры', 'Зрители, подарки и активность стримеров.'],
    usage: ['Использование', 'Кто, какие приложения и сколько времени использует.']
  };
  function navigate(focus = false) {
    const key = location.hash.slice(1);
    const page = Object.hasOwn(pages, key) ? key : 'overview';
    document.querySelectorAll('[data-page]').forEach(link => {
      if (link.dataset.page === page) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    $('page-title').textContent = pages[page][0];
    $('page-description').textContent = pages[page][1];
    $('users-page').hidden = page !== 'users';
    $('analytics').hidden = page === 'users';
    ['overview', 'streams', 'usage'].forEach(key => $(key + '-page').hidden = key !== page);
    document.title = pages[page][0] + ' · EFIR ADMIN';
    if (focus && !$('admin-view').hidden) $('page-title').focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', () => navigate(true));
  navigate();

  function toast(message, error = false) {
    const node = $('toast');
    node.textContent = message; node.className = `toast show${error ? ' error' : ''}`;
    clearTimeout(state.timer); state.timer = setTimeout(() => node.className = 'toast', 2800);
  }
  function showLogin(message = '') {
    window.efirAdminReady = false;
    dashboardSequence++;
    state.users = []; state.apps = []; state.selectedId = null;
    $('users').replaceChildren(); $('apps').replaceChildren();
    window.dispatchEvent(new Event('efir-admin-closed'));
    $('login-view').hidden = false; $('admin-view').hidden = true; $('session').hidden = true;
    $('login-message').textContent = message;
  }
  async function showAdmin(session) {
    const { data, error } = await client.rpc('is_efir_admin');
    if (error || !data) { showLogin(error ? 'Не удалось проверить доступ. Попробуйте войти снова.' : 'У этого аккаунта нет прав администратора.'); return; }
    $('login-view').hidden = true; $('admin-view').hidden = false; $('session').hidden = false;
    $('session').style.display = 'flex'; $('admin-email').textContent = session.user.email || '';
    navigate();
    window.efirAdminReady = true;
    window.dispatchEvent(new Event('efir-admin-ready'));
    await loadDashboard();
  }
  async function loadDashboard(search = $('search').value.trim()) {
    const sequence = ++dashboardSequence;
    $('result-count').textContent = 'Загрузка…';
    const { data, error } = await client.rpc('admin_dashboard', { p_search: search });
    if (sequence !== dashboardSequence) return;
    if (error) {
      if (/ADMIN_REQUIRED|permission/i.test(error.message)) { await client.auth.signOut(); showLogin('У этого аккаунта нет прав администратора.'); return; }
      $('result-count').textContent = 'Не удалось загрузить';
      toast(`Не удалось загрузить данные: ${error.message}`, true); return;
    }
    state.apps = Array.isArray(data.apps) ? data.apps : [];
    state.users = Array.isArray(data.users) ? data.users : [];
    $('users-count').textContent = state.users.length; $('apps-count').textContent = state.apps.length;
    $('result-count').textContent = `Найдено: ${state.users.length}`;
    renderUsers();
    if (state.selectedId && state.users.some(user => user.id === state.selectedId)) renderAccess();
    else { state.selectedId = null; $('empty-state').hidden = false; $('user-access').hidden = true; }
  }
  function renderUsers() {
    $('users').innerHTML = state.users.map(user => {
      const grants = (user.exclusive_apps?.length || 0) + (user.access_apps?.length || 0);
      return `<button class="user-row ${user.id === state.selectedId ? 'active' : ''}" data-user="${esc(user.id)}"><span class="mini-avatar">${esc(initials(user))}</span><div><strong>${esc(user.name || user.email || 'Без имени')}</strong><small>${esc(user.email || user.id)}</small></div>${grants ? `<span class="badge">${grants}</span>` : ''}</button>`;
    }).join('') || '<div class="empty"><strong>Ничего не найдено</strong><p>Измените строку поиска.</p></div>';
    document.querySelectorAll('[data-user]').forEach(button => button.addEventListener('click', () => { state.selectedId = button.dataset.user; renderUsers(); renderAccess(); }));
  }
  function renderAccess() {
    const user = state.users.find(item => item.id === state.selectedId); if (!user) return;
    $('empty-state').hidden = true; $('user-access').hidden = false;
    $('selected-avatar').textContent = initials(user); $('selected-name').textContent = user.name || 'Пользователь';
    $('selected-email').textContent = user.email || 'Без почты'; $('selected-id').textContent = user.id;
    $('apps').innerHTML = state.apps.map(app => {
      const exclusive = user.exclusive_apps?.includes(app.id); const access = user.access_apps?.includes(app.id);
      const status = app.is_exclusive ? 'Эксклюзивное' : app.is_published ? 'Опубликовано' : 'Скрыто';
      return `<article class="app-row"><div class="app-meta"><strong>${esc(app.name)}</strong><small>${esc(app.id)} · ${status}</small></div><label class="toggle-label">Эксклюзив <input type="checkbox" data-kind="exclusive" data-app="${esc(app.id)}" ${exclusive ? 'checked' : ''}></label><label class="toggle-label access-toggle">Без подписки <input type="checkbox" data-kind="access" data-app="${esc(app.id)}" ${access ? 'checked' : ''}></label></article>`;
    }).join('');
    document.querySelectorAll('[data-kind]').forEach(input => input.addEventListener('change', () => setGrant(input)));
  }
  async function setGrant(input) {
    input.disabled = true;
    const params = { p_user_id: state.selectedId, p_app_id: input.dataset.app, p_kind: input.dataset.kind, p_enabled: input.checked };
    const { error } = await client.rpc('admin_set_app_grant', params);
    if (error) { input.checked = !input.checked; input.disabled = false; toast(`Не удалось сохранить: ${error.message}`, true); return; }
    const user = state.users.find(item => item.id === params.p_user_id); const key = params.p_kind === 'exclusive' ? 'exclusive_apps' : 'access_apps';
    if (user) user[key] = params.p_enabled ? [...new Set([...(user[key] || []), params.p_app_id])] : (user[key] || []).filter(id => id !== params.p_app_id);
    input.disabled = false; renderUsers(); toast(input.checked ? 'Доступ выдан' : 'Доступ отозван');
  }

  $('login-form').addEventListener('submit', async event => {
    event.preventDefault(); $('login-message').textContent = 'Входим…';
    const { data, error } = await client.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
    if (error) { $('login-message').textContent = 'Неверная почта или пароль.'; return; }
    await showAdmin(data.session);
  });
  $('sign-out').addEventListener('click', async () => { await client.auth.signOut(); showLogin(); });
  $('refresh').addEventListener('click', () => loadDashboard());
  let debounce; $('search').addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => loadDashboard(), 300); });
  client.auth.getSession().then(({ data }) => data.session ? showAdmin(data.session) : showLogin());
  client.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') showLogin(); });
})();
