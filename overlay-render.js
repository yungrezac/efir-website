(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./overlay-model.js'));
  else root.ImmOverlayRenderer = factory(root.ImmOverlayModel);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (model) {
  'use strict';

  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const text = (value, fallback = '', length = 80) => escapeHtml(String(value == null || value === '' ? fallback : value).slice(0, length));
  const number = value => Number.isFinite(Number(value)) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.round(Number(value)))) : 0;
  const format = value => number(value).toLocaleString('ru-RU');
  const compactNumber = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 });
  const formatScore = value => number(value) >= 1000000 ? compactNumber.format(number(value)) : format(value);
  function safeImage(value) {
    if (typeof value !== 'string' || value.length > 4096) return '';
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch (_) { return ''; }
  }
  const paths = {
    heart: '<path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>',
    crown: '<path d="m3 6 4.5 4L12 3l4.5 7L21 6l-2 13H5L3 6Z"/><path d="M6 22h12"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M17 4a4 4 0 0 1 0 8m2 3a6 6 0 0 1 3 6"/>',
    gift: '<path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13"/><path d="M12 8H7a3 3 0 1 1 3-3l2 3Zm0 0h5a3 3 0 1 0-3-3l-2 3Z"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z"/>',
    diamond: '<path d="m6 3-5 6 11 13L23 9l-5-6H6Zm-5 6h22M6 3l6 19 6-19M6 3l6 6 6-6"/>'
  };
  const icon = name => '<svg class="ov-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.gift) + '</svg>';
  function avatar(entry, index) {
    const source = safeImage(entry.avatar);
    const initial = Array.from(String(entry.name || '?').trim())[0] || '?';
    return '<span class="ov-avatar ov-avatar-' + (index % 5) + '"><span aria-hidden="true">' + text(initial) + '</span>' + (source ? '<img src="' + escapeHtml(source) + '" alt="" referrerpolicy="no-referrer" loading="eager">' : '') + '</span>';
  }
  function empty(message, name) {
    return '<div class="ov-empty">' + icon(name) + '<span>' + text(message) + '</span></div>';
  }
  function leaderboard(config, state, type) {
    const key = config.type === 'top-likes' ? 'topLikes' : 'topGifters';
    const entries = (Array.isArray(state[key]) ? state[key] : [])
      .filter(entry => entry && typeof entry === 'object')
      .map(entry => ({ ...entry, value: number(entry.value) }))
      .sort((a, b) => b.value - a.value).slice(0, config.limit);
    if (!entries.length) return empty(config.type === 'top-likes' ? 'Лайков пока нет' : 'Подарков пока нет', type.icon);
    return '<ol class="ov-ranking">' + entries.map((entry, index) =>
      '<li class="ov-row ov-place-' + (index + 1) + '"><span class="ov-rank" aria-label="Место ' + (index + 1) + '">' + (index + 1) + '</span>' +
      (config.showAvatars ? avatar(entry, index) : '') +
      '<strong class="ov-name" title="' + text(entry.name, 'Зритель', 64) + '">' + text(entry.name, 'Зритель', 64) + '</strong>' +
      '<span class="ov-score" title="' + format(entry.value) + ' ' + type.unit + '"><b>' + formatScore(entry.value) + '</b>' +
      icon(config.type === 'top-likes' ? 'heart' : 'diamond') +
      (config.showSecondary ? '<small class="ov-unit">' + type.unit + '</small>' : '') + '</span></li>'
    ).join('') + '</ol>';
  }
  function goal(config, state, type) {
    const value = number(state[config.type === 'like-goal' ? 'likes' : 'follows']);
    const percent = Math.min(100, Math.floor(value / config.goal * 100));
    const complete = value >= config.goal;
    return '<div class="ov-goal' + (complete ? ' ov-goal-complete' : '') + '" style="--ov-progress:' + percent + '%">' +
      '<div class="ov-dial" aria-hidden="true"><svg viewBox="0 0 100 100"><circle class="ov-dial-track" cx="50" cy="50" r="42"/>' +
      '<circle class="ov-dial-progress" cx="50" cy="50" r="42" pathLength="100" stroke-dasharray="' + percent + ' 100"/></svg><span>' + percent + '<small>%</small></span></div>' +
      '<div class="ov-goal-detail"><div class="ov-goal-count"><strong title="' + format(value) + '">' + formatScore(value) + '</strong><span>/ ' + formatScore(config.goal) + '</span>' +
      '<b class="ov-percent">' + percent + '%</b></div>' +
      '<div class="ov-track" role="progressbar" aria-label="' + text(type.name) + '" aria-valuemin="0" aria-valuemax="' + config.goal + '" aria-valuenow="' + Math.min(value, config.goal) + '"><span></span></div>' +
      (config.showSecondary ? '<p class="ov-goal-remaining">' + (complete ? 'Цель достигнута' : 'Осталось ' + format(config.goal - value)) + '</p>' : '') + '</div></div>';
  }
  function gift(config, state) {
    const combo = config.type === 'gift-combo';
    const item = state[combo ? 'giftCombo' : 'biggestGift'];
    if (!item || typeof item !== 'object' || (!number(item.diamonds) && !number(item.repeatCount))) return empty(combo ? 'Комбо пока нет' : 'Подарков пока нет', combo ? 'bolt' : 'gift');
    const source = safeImage(item.giftImage);
    const value = combo ? item.repeatCount : item.diamonds;
    return '<div class="ov-gift"><div class="ov-gift-art">' +
      (source ? '<img src="' + escapeHtml(source) + '" alt="' + text(item.giftName, 'Подарок', 80) + '" referrerpolicy="no-referrer">' : icon(combo ? 'gift' : 'diamond')) +
      '</div><div class="ov-gift-info"><strong class="ov-gift-name" title="' + text(item.giftName, 'Подарок', 80) + '">' + text(item.giftName, 'Подарок', 80) + '</strong>' +
      '<div class="ov-gift-meta"><span class="ov-gift-value" title="' + format(value) + (combo ? ' подарков' : ' алмазов') + '">' +
      (combo ? '<span class="ov-multiplier">×</span>' : icon('diamond')) + '<b>' + formatScore(value) + '</b></span>' +
      '<span class="ov-meta-divider" aria-hidden="true">·</span><span class="ov-sender">' + (config.showAvatars ? avatar(item, 0) : '') +
      '<strong title="' + text(item.name, 'Зритель', 64) + '">' + text(item.name, 'Зритель', 64) + '</strong></span></div>' +
      (config.showSecondary ? '<span class="ov-gift-detail">' + (combo ? format(item.totalDiamonds == null ? number(item.diamonds) * number(item.repeatCount) : item.totalDiamonds) + ' алмазов' : 'алмазов за один подарок') + '</span>' : '') + '</div></div>';
  }
  function html(rawConfig, rawState) {
    const config = model.normalizeConfig(rawConfig);
    if (!config.enabled) return '';
    const state = rawState && typeof rawState === 'object' ? rawState : {};
    const type = model.types.find(item => item.id === config.type);
    const style = model.styles.find(item => item.id === config.style);
    const heading = config.title || type.name;
    const body = config.type.startsWith('top-') ? leaderboard(config, state, type) : type.goal ? goal(config, state, type) : gift(config, state);
    return '<section class="imm-overlay ov-style-' + style.id + ' ov-type-' + type.id + ' ov-layout-' + style.layout +
      (config.compact ? ' ov-compact' : '') + (!config.showAvatars ? ' ov-no-avatars' : '') + (!config.showSecondary ? ' ov-no-secondary' : '') +
      '" style="--ov-accent:' + (config.accent || style.accent) + '" aria-label="' + text(heading) + '">' +
      '<header class="ov-heading"><span class="ov-heading-icon">' + icon(type.icon) + '</span><h2 title="' + text(heading) + '">' + text(heading) + '</h2></header>' +
      '<div class="ov-content">' + body + '</div></section>';
  }
  return { html, escapeHtml, safeImage };
});