(() => {
  'use strict';
  const client = window.efirAdminClient, $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = n => Number(n || 0).toLocaleString('ru-RU');
  const duration = n => { const mins = Math.floor(Number(n || 0) / 60); return mins < 60 ? mins + ' мин' : Math.floor(mins / 60) + ' ч ' + (mins % 60) + ' мин'; };
  const appName = id => ({tiktimer:'TIMER',flappybird:'Flappy Gifts'}[id] || id);
  let last = null, seq = 0, enabled = false, refreshing = false, refreshTimer = null, appliedParams = null;
  $('analytics-from').value = new Date(Date.now() - 30 * 86400000).toISOString().slice(0,10);
  $('analytics-to').value = new Date().toISOString().slice(0,10);
  const empty = text => '<div class="table-empty"><strong>Пока нет данных</strong><p>' + text + '</p></div>';
  const table = (headers, rows, message) => rows.length ? '<table><thead><tr>' + headers.map(v => '<th scope="col">' + v + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(v => '<td>' + v + '</td>').join('') + '</tr>').join('') + '</tbody></table>' : empty(message);
  async function load(background = false) {
    if (!enabled) return;
    if (background && (refreshing || !appliedParams)) return;
    if (!background && $('analytics-from').value > $('analytics-to').value) { $('analytics-status').textContent = 'Начало периода должно быть раньше его окончания.'; return; }
    const id = ++seq;
    refreshing = true;
    if (!background) { $('analytics-status').textContent = 'Загружаем статистику…'; $('analytics-submit').disabled = true; $('analytics-export').disabled = true; }
    const params = background ? appliedParams : {p_from:$('analytics-from').value + 'T00:00:00Z', p_to:$('analytics-to').value + 'T23:59:59Z', p_user:$('analytics-user').value || null};
    try {
      const {data, error} = await client.rpc('admin_stream_analytics', params);
      if (id !== seq) return;
      if (error) throw error;
      last = data;
      appliedParams = params;
      $('analytics-status').textContent = 'Обновлено в ' + new Date().toLocaleTimeString('ru-RU') + ' · автообновление каждые 10 сек · период по UTC' + (data.streams.length === 1000 ? ' · показаны последние 1000 эфиров' : '');
      const users = new Map(data.users.map(u => [u.id,u]));
      if (!background && !params.p_user) $('analytics-user').replaceChildren(new Option('Все пользователи',''), ...data.users.map(u => new Option(u.name ? u.name + ' · ' + u.email : u.email,u.id)));
      $('analytics-summary').innerHTML = [
        ['Лаунчеров онлайн',num(data.users.filter(u => u.online).length)],
        ['Время приложений',duration(data.apps.reduce((s,r) => s + Number(r.seconds),0))],
        ['Эфиров за период',num(data.streams.length)],
        ['Получено алмазов',num(data.streams.reduce((s,r) => s + Number(r.diamonds),0))]
      ].map(([label,value]) => '<div><strong>' + value + '</strong><span>' + label + '</span></div>').join('');
      $('usage-count').textContent = 'Записей: ' + num(data.apps.length);
      $('streams-count').textContent = 'Эфиров: ' + num(data.streams.length);
      $('analytics-usage').innerHTML = table(['Пользователь','Приложение','Время использования'],data.apps.slice().sort((a,b) => b.seconds - a.seconds).map(a => {
        const u = users.get(a.user_id) || {};
        return [esc(u.name || u.email || a.user_id) + (u.name ? '<small>' + esc(u.email) + '</small>' : ''),esc(appName(a.app_id)),duration(a.seconds)];
      }), 'За выбранный период приложения ещё не использовались. Попробуйте другой период или пользователя.');
      $('analytics-streams').innerHTML = table(['Стример / аккаунт','Начало эфира','Наблюдался','Средний онлайн','Пик','Алмазы','Подарки','Лайки','Подписки'],data.streams.map(s => {
        const u = users.get(s.user_id) || {};
        return [(s.avatar?.startsWith('https://') ? '<img loading="lazy" alt="" referrerpolicy="no-referrer" src="' + esc(s.avatar) + '">' : '') + esc(s.nickname || s.username) + '<small>@' + esc(s.username) + ' · ' + esc(u.email || s.user_id) + '</small><small>' + esc([...new Set((s.apps || []).flat())].map(appName).join(', ')) + '</small>',esc(new Date(s.started_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})),duration(s.seconds),s.average_viewers === null ? 'Нет данных' : num(s.average_viewers),num(s.peak_viewers),num(s.diamonds),num(s.gifts),num(s.likes),num(s.follows)];
      }), 'Эфиры появятся после подключения стримера через обновлённый лаунчер.');
      $('analytics-export').disabled = false;
    } catch (error) {
      if (id !== seq) return;
      last = null;
      $('analytics-status').textContent = 'Не удалось загрузить статистику: ' + error.message + '. Нажмите «Применить», чтобы повторить.';
      $('analytics-export').disabled = true;
      $('analytics-summary').replaceChildren();
      $('analytics-usage').replaceChildren(); $('analytics-streams').replaceChildren();
      $('usage-count').textContent = ''; $('streams-count').textContent = '';
    } finally { if (id === seq) { refreshing = false; $('analytics-submit').disabled = false; } }
  }
  $('analytics-filter').onsubmit = e => { e.preventDefault(); load(); };
  $('analytics-export').onclick = () => {
    if (!last) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(last,null,2)],{type:'application/json'}));
    a.download = 'efir-statistics.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href),1000);
  };
  function refreshVisible() { if (enabled && !document.hidden && !$('analytics').hidden) load(true); }
  function start() { enabled = true; clearInterval(refreshTimer); refreshTimer = setInterval(refreshVisible, 10000); load(); }
  window.addEventListener('efir-admin-ready', start);
  document.addEventListener('visibilitychange', refreshVisible);
  window.addEventListener('focus', refreshVisible);
  window.addEventListener('hashchange', refreshVisible);
  window.addEventListener('pagehide', () => { clearInterval(refreshTimer); refreshTimer = null; });
  window.addEventListener('pageshow', () => { if (enabled && !refreshTimer) { refreshTimer = setInterval(refreshVisible, 10000); refreshVisible(); } });
  if (window.efirAdminReady) start();
  window.addEventListener('efir-admin-closed', () => {
    enabled = false; last = null; seq++; appliedParams = null; refreshing = false;
    clearInterval(refreshTimer); refreshTimer = null;
    for (const id of ['analytics-summary','analytics-usage','analytics-streams','analytics-status']) $(id).replaceChildren();
    $('analytics-user').replaceChildren(new Option('Все пользователи',''));
    $('analytics-submit').disabled = false; $('analytics-export').disabled = true;
  });
})();
