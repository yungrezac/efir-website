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
  // These outlines are static artwork, selected only from the validated catalog.
  const marks = {
    speech:'<path d="M8 8h32v24H23L12 41v-9H8Z"/><path d="M15 16h18M15 23h12"/>',
    thought:'<path d="M10 29C0 24 5 12 14 13C14 3 29 3 32 12C45 8 50 27 38 31H15"/><circle cx="10" cy="37" r="3"/><circle cx="5" cy="44" r="1"/>',
    burst:'<path d="m24 3 4 12 12-7-5 13 11 4-12 5 4 12-12-7-5 11-4-13-12 5 7-12L2 20l13-2-2-12 11 9Z"/>',
    panels:'<path d="M4 5h40v38H4ZM4 18h40M21 18v25"/><path d="m29 25 8 10M9 25l6 0M9 31h6"/>',
    speed:'<path d="m5 8 16 9M2 21l17 2M6 35l15-7M28 5l13 6-7 23-14 8 8-17Z"/>',
    dots:'<circle cx="14" cy="14" r="8"/><circle cx="34" cy="13" r="3"/><circle cx="30" cy="31" r="11"/><circle cx="9" cy="34" r="3"/>',
    pencil:'<path d="m8 34 3-10L32 3l11 11-21 21-14 5 3-7M28 7l11 11M12 25l11 10M10 39l-4 4"/>',
    blocks:'<path d="M4 24h20v20H4ZM24 24h20v20H24ZM14 4h20v20H14ZM20 11h8M9 31h10M30 31h8"/>',
    jelly:'<path d="M9 31C2 13 15 2 26 7c12-8 24 12 14 26-9 11-27 12-31-2Z"/><path d="M15 20q4-8 10-7M18 30q7 5 13-2"/>',
    cloud:'<path d="M11 37C-3 35 0 17 13 17c-1-18 27-18 28 0 11 0 10 20-1 20Z"/>',
    candy:'<path d="M27 44V15c0-9-13-9-13 0v7H5v-8C5-7 37-4 37 15v29ZM7 9l8 4M9 3l9 5M23 2l8 6M27 16l10 5M27 28l10 5"/>',
    balloons:'<ellipse cx="16" cy="15" rx="10" ry="13"/><ellipse cx="36" cy="22" rx="9" ry="11"/><path d="m14 28 3 4 2-4M16 32q-8 10 7 13M34 33l2 3 2-3M36 36q5 9-3 10"/>',
    confetti:'<path d="m7 17 16 19-21 9ZM17 8l4 5M32 5l-2 8M39 22l6 3M28 29l4 4M15 21q2-13 12-9M27 23q17-16 17-7"/><circle cx="38" cy="39" r="2"/>',
    pinwheel:'<path d="m24 23 1-20L42 13 24 23l20 2-10 17-10-19-1 20L6 33l18-10-20-2L14 4l10 19v23"/><circle cx="24" cy="23" r="3"/>',
    train:'<path d="M4 19h16v17H4ZM21 11h17v25H20M26 4h10v7M7 23h7M26 17h7v8h-7ZM2 38h42"/><circle cx="10" cy="39" r="5"/><circle cx="31" cy="39" r="5"/>',
    rocket:'<path d="M17 31C12 14 26 5 42 4c-1 16-10 30-27 25ZM17 19 6 21l-3 11 13-1M28 30l-1 13-11 2 2-13M11 34l-7 9M7 32l-5 5"/><circle cx="31" cy="15" r="5"/>',
    ufo:'<ellipse cx="24" cy="25" rx="22" ry="8"/><path d="M11 21c0-22 26-22 26 0M17 35l-5 10M24 35v11M31 35l5 10"/><circle cx="12" cy="25" r="1"/><circle cx="24" cy="27" r="1"/><circle cx="36" cy="25" r="1"/>',
    saturn:'<circle cx="24" cy="24" r="14"/><path d="M13 17C-11 31 9 45 32 31S48 11 36 13M14 33c16-4 21-7 25-12"/>',
    constellation:'<path d="m8 11 19 5 14-11-5 28-17 9-11-31 28 22M24 16l3-4 3 4-3 4ZM5 11l3-3 3 3-3 3ZM16 42l3-3 3 3-3 3Z"/>',
    meteor:'<path d="M29 25c-8-8-18-3-18 5s12 13 17 6c10-8 13-15 17-31L27 19M20 17 35 2M13 18 24 7M7 24l9-13"/><circle cx="19" cy="30" r="5"/>',
    cat:'<path d="M8 23 5 5l15 11h8L43 5l-3 19c10 24-41 26-32-1ZM16 25h1M31 25h1m-9 5 3 0-1 3ZM12 31 1 28M12 36l-11 3M36 31l11-3M36 36l11 3"/>',
    bear:'<circle cx="10" cy="10" r="7"/><circle cx="38" cy="10" r="7"/><circle cx="24" cy="26" r="19"/><ellipse cx="24" cy="32" rx="9" ry="7"/><path d="M16 22h1M31 22h1m-10 7 4 0-2 4v4"/>',
    bunny:'<path d="M13 25C-3-10 17-8 21 20C22-9 45-7 32 25c22 26-40 28-19 0Z"/><path d="M16 31h1M30 31h1m-9 5h4l-2 3"/>',
    fox:'<path d="M6 21 3 3l18 11h7L45 3l-3 20-18 22ZM6 21l12 5 6 19 7-19 11-3M15 21h1M32 21h1m-11 17h4"/>',
    paw:'<ellipse cx="8" cy="20" rx="5" ry="7"/><ellipse cx="18" cy="10" rx="5" ry="7"/><ellipse cx="31" cy="10" rx="5" ry="7"/><ellipse cx="41" cy="20" rx="5" ry="7"/><path d="M11 34c13-28 37 6 24 10-7 2-9-5-15-1-11 8-19-1-9-9Z"/>',
    gamepad:'<path d="M13 11h22c12 0 17 36 6 31l-10-8H17L7 42C-4 47 1 11 13 11Z"/><path d="M8 22h12M14 16v12M31 20h1M38 26h1"/>',
    pixel:'<path d="M3 25v-8h8V9h8V2h15v8h7v9h5v20H4v-7H1v-7ZM10 28h5M23 28h5M36 28h5"/>',
    scroll:'<path d="M10 9V5h32v29M10 9H5c-6 0-4 9 3 8h3v23h23c11 0 12-11 4-11H11M18 13h16M18 20h13"/>',
    shield:'<path d="M24 3 5 10v17l19 18 19-18V10ZM24 11l4 8 9 1-7 6 2 10-8-5-8 5 2-10-7-6 9-1Z"/>',
    treasure:'<path d="M3 23c0-27 42-27 42 0v20H3ZM3 23h42M13 5v18M35 5v18M21 21h6v12h-6ZM3 34h8v9M37 43v-9h8"/>',
    waveform:'<path d="M2 24h6l4-14 7 28 7-35 7 42 6-21h7M2 43h8M40 4h6"/>',
    vinyl:'<circle cx="24" cy="24" r="21"/><circle cx="24" cy="24" r="14"/><circle cx="24" cy="24" r="6"/><circle cx="24" cy="24" r="1"/><path d="M8 16a19 19 0 0 1 9-9M33 41a19 19 0 0 0 9-9"/>',
    piano:'<path d="M3 6h42v36H3ZM10 6v36M17 6v36M24 6v36M31 6v36M38 6v36M8 6v20h5V6M22 6v20h5V6M36 6v20h5V6"/>',
    boombox:'<path d="M3 14h42v29H3ZM11 14V5h25v9M19 19h11v7H19"/><circle cx="11" cy="31" r="5"/><circle cx="37" cy="31" r="5"/><path d="M21 34h2M28 34h2"/>',
    headphones:'<path d="M7 24V20C7-3 41-3 41 20v12M7 24H3v15h9V24ZM36 24h9v15h-9ZM41 39c0 6-9 7-17 7"/>',
    racing:'<path d="M8 46V4M8 7c12-10 23 10 34 0v23c-12 8-23-10-34 0M19 5v24M30 10v23M8 18c12-10 23 10 34 0"/>',
    chevrons:'<path d="m5 5 17 19L5 43M22 5l17 19-17 19M37 5l9 10M37 43l9-10"/>',
    medal:'<circle cx="24" cy="18" r="15"/><path d="m12 29-5 16 12-4 5 5 5-5 12 4-5-16M24 8l3 6 7 1-5 4 1 7-6-3-6 3 1-7-5-4 7-1Z"/>',
    stadium:'<rect x="3" y="8" width="42" height="32" rx="16"/><rect x="8" y="13" width="32" height="22" rx="11"/><path d="M20 8v5M20 35v5M28 8v5M28 35v5"/>',
    finish:'<path d="M6 45V4M42 45V4M6 9h36v16H6M14 9v16M23 9v16M32 9v16M6 17h36"/>',
    leaf:'<path d="M7 42C-5 11 21 1 42 4 44 30 34 45 7 42ZM5 44 36 10M16 33l-1-13M25 25l13-1"/>',
    flower:'<circle cx="24" cy="24" r="7"/><path d="M18 18C3-2 39-4 30 18c23-12 24 23 1 12 10 24-27 22-13 1-26 12-23-25 0-13Z"/>',
    wave:'<path d="M1 30c14 0 9-22 26-24-9 7-6 13 3 10 7-3 15 3 17 12M1 37c7 6 13-6 20 0s13-6 26 0M1 44c7 6 13-6 20 0s13-6 26 0"/>',
    sunrise:'<path d="M3 35h42M11 35a13 13 0 0 1 26 0M24 3v7M7 11l5 5M41 11l-5 5M1 25h6M41 25h6M9 42h30"/>',
    mountains:'<path d="m1 40 16-33 13 23 8-13 9 23H1ZM11 19l6 5 5-6M34 23l4 5 4-4"/>',
    origami:'<path d="m2 21 44-17-13 40-12-17ZM21 27 46 4M21 27l-1 15 7-7M2 21l13 2"/>',
    stamp:'<path d="M3 3h7l3 4 3-4h7l3 4 3-4h7l3 4 3-4h3v42h-7l-3-4-3 4h-7l-3-4-3 4h-7l-3-4-3 4H3ZM10 12h27v24H10Z"/><path d="m13 31 9-11 5 7 5-4 3 8"/>',
    photo:'<path d="m7 2 36 5-6 39L1 41ZM12 10l23 3-3 19-23-3Z"/><path d="m11 26 8-9 5 6 5-2 4 8M13 36l13 2"/>',
    ticket:'<path d="M3 9h42v10c-9 0-9 10 0 10v10H3V29c9 0 9-10 0-10ZM33 9v5M33 19v5M33 29v5M33 39v-1M12 16h13M12 22h9"/>',
    bookmark:'<path d="M10 3h28v43L24 36 10 46ZM17 12h14M17 19h14M17 26h8"/>'
  };
  const frames = {
    speech:'M27 8H373Q392 8 392 28V256Q392 276 372 276H110L72 294l8-18H27Q8 276 8 256V28Q8 8 27 8Z',
    thought:'M39 28C10 20 3 53 15 68C-2 90 2 120 14 137C0 159 0 194 16 210C4 243 20 270 48 270C67 294 100 280 114 272C143 292 166 288 184 277C211 291 249 293 271 273C302 289 330 282 341 271C379 280 401 249 383 220C405 192 393 166 387 150C402 125 400 94 385 76C398 46 379 17 352 28C321 0 293 8 275 22C250 0 217 8 200 19C171-1 137 0 118 23C93 8 55 4 39 28Z',
    burst:'M18 17 50 23 74 6 105 20 143 6 177 17 209 4 243 18 281 7 312 21 351 7 370 24 392 17 381 53 395 79 384 108 396 139 383 171 395 202 380 236 392 271 360 270 335 293 302 280 266 293 235 278 198 295 162 280 127 293 95 278 56 291 38 272 8 280 19 245 4 215 17 185 4 153 17 119 4 88 18 60Z',
    panels:'M10 8H390V292H10ZM10 32h27M363 268h27M10 70l-5 0M395 230h-5',
    sketch:'M15 17 390 9 383 286 8 291 15 17M9 10 385 17 393 293 17 283',
    jelly:'M38 15C92 4 139 20 190 12C247 0 311 20 359 12C393 9 398 56 385 99C376 146 400 210 386 252C380 291 337 294 293 282C240 268 205 296 152 285C99 275 43 299 19 278C-5 250 18 204 10 156C0 111-1 31 38 15Z',
    scallop:'M28 20Q40 0 62 16Q83 1 104 16Q125 1 146 16Q168 1 190 16Q211 1 232 16Q253 1 274 16Q295 1 316 16Q338 0 357 19Q390 6 384 48Q400 74 384 99Q399 124 384 149Q399 174 384 199Q402 225 384 251Q393 290 358 279Q337 297 315 281Q294 297 273 281Q252 297 231 281Q210 297 189 281Q168 297 147 281Q126 297 105 281Q84 297 63 281Q39 297 25 279Q0 293 15 253Q-1 225 15 201Q-1 175 15 150Q-1 125 15 100Q-1 75 15 51Q3 19 28 20Z',
    train:'M9 8H391V290H9ZM18 298H382M55 289v8M120 289v8M280 289v8M345 289v8M48 296h29M107 296h29M267 296h29M332 296h29',
    cat:'M24 42 25 5 71 32H329L375 5l1 37Q392 47 392 68V263Q392 285 370 285H30Q8 285 8 263V68Q8 47 24 42ZM8 177l-7-3M8 194l-7 3M392 177l7-3M392 194l7 3',
    bear:'M27 33C-6-4 63-12 63 27H337c0-39 69-31 36 6Q391 42 391 65V270Q391 289 370 289H30Q9 289 9 270V65Q9 42 27 33Z',
    gamepad:'M34 15H366Q381 15 386 39l10 214Q399 285 373 285l-27-14H54l-27 14Q1 285 4 253L14 39Q19 15 34 15ZM10 142h13M16 135v14M380 137h1M386 146h1',
    pixel:'M28 8H372V20H390V40H399V258H390V279H372V292H28V279H10V258H1V40H10V20H28Z',
    scroll:'M22 30V8H369Q394 8 391 30H375V275Q371 298 347 291H30Q4 291 9 277H27V27H10Q4 5 27 8M28 278H348Q364 278 358 290',
    treasure:'M18 17H382V283H18ZM18 46h30V17M352 17v29h30M18 254h30v29M352 283v-29h30M184 17v9h32v-9',
    boombox:'M10 17H390V292H10ZM43 17V5H357V17M10 61h14M10 75h14M376 61h14M376 75h14',
    origami:'M28 15H360L387 42V282H14V29ZM360 15v28h27M14 263l19 19M372 282l15-15',
    postcard:'M15 5H385V295H15ZM23 11H377V289H23M17 35h5M17 67h5M17 99h5M17 131h5M17 163h5M17 195h5M17 227h5M17 259h5M378 35h5M378 67h5M378 99h5M378 131h5M378 163h5M378 195h5M378 227h5M378 259h5',
    ticket:'M11 13H389V120C367 120 367 163 389 163V286H11V163C33 163 33 120 11 120ZM338 14v17M338 45v17M338 251v17M338 280v6'
  };
  const mark = name => '<svg class="ov-mark" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (marks[name] || marks.speech) + '</svg>';
  const frame = name => '<svg class="ov-form" viewBox="0 0 400 300" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true"><path vector-effect="non-scaling-stroke" d="' + frames[name] + '"/></svg>';
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
    const followers = state.followers;
    if(config.type==='follow-goal'&&(followers===null||followers===undefined||followers===''||!Number.isFinite(Number(followers))||Number(followers)<0)){
      return '<div class="ov-goal-unavailable"><span class="ov-unknown-count">— <small>/ ' + formatScore(config.goal) + '</small></span><span>Ожидаем число подписчиков</span></div>';
    }
    const value = number(config.type === 'like-goal' ? state.likes : followers);
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
      (style.mark ? ' ov-new-style' : '') + (style.frame ? ' ov-framed' : '') +
      (config.compact ? ' ov-compact' : '') + (!config.showAvatars ? ' ov-no-avatars' : '') + (!config.showSecondary ? ' ov-no-secondary' : '') +
      '" style="--ov-accent:' + (config.accent || style.accent) + '" aria-label="' + text(heading) + '">' +
      (style.frame ? frame(style.frame) : '') +
      '<header class="ov-heading"><span class="ov-heading-icon">' + (style.mark ? mark(style.mark) : icon(type.icon)) + '</span><h2 title="' + text(heading) + '">' + text(heading) + '</h2></header>' +
      '<div class="ov-content">' + body + '</div></section>';
  }
  return { html, escapeHtml, safeImage };
});
