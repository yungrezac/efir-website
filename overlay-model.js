(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ImmOverlayModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const types = [
    { id: 'top-likes', name: 'Топ по лайкам', description: 'Зрители, которые подарили эфиру больше всего лайков.', icon: 'heart', goal: false, unit: 'лайков' },
    { id: 'top-gifters', name: 'Топ дарителей', description: 'Рейтинг по сумме алмазов с момента подключения.', icon: 'crown', goal: false, unit: 'алмазов' },
    { id: 'like-goal', name: 'Цель по лайкам', description: 'Цель и прогресс по лайкам с момента подключения.', icon: 'heart', goal: true, unit: 'лайков' },
    { id: 'follow-goal', name: 'Цель по подпискам', description: 'Новые подписки с момента подключения к эфиру.', icon: 'users', goal: true, unit: 'подписок' },
    { id: 'biggest-gift', name: 'Самый большой подарок', description: 'Самый дорогой единичный подарок и его отправитель.', icon: 'gift', goal: false, unit: 'алмазов' },
    { id: 'gift-combo', name: 'Самое большое комбо', description: 'Рекорд по количеству подарков в одной серии.', icon: 'bolt', goal: false, unit: 'подарков' }
  ];
  const categoryNames = { minimal: 'Минимализм', neon: 'Свет и неон', gaming: 'Игровые', creative: 'Креативные', premium: 'Премиум' };
  const styles = [
    { id: 'glass', name: 'Стекло', category: 'minimal', description: 'Тонкие светлые линии и мягкий блеск цифр.', accent: '#c0ceff', layout: 'list' },
    { id: 'neon', name: 'Неоновый контур', category: 'neon', description: 'Бирюзовые штрихи и деликатное неоновое свечение.', accent: '#63f5e5', layout: 'list' },
    { id: 'minimal', name: 'Чистая линия', category: 'minimal', description: 'Только имена, цифры и одна тонкая линия.', accent: '#e2e8ff', layout: 'list' },
    { id: 'podium', name: 'Пьедестал', category: 'premium', description: 'Три лидера в центре с небольшими золотыми отметками.', accent: '#efc56d', layout: 'podium' },
    { id: 'broadcast', name: 'Прямой эфир', category: 'minimal', description: 'Короткий цветной штрих и строгие горизонтали.', accent: '#ff6479', layout: 'list' },
    { id: 'editorial', name: 'Редакция', category: 'premium', description: 'Засечки, курсивные номера и журнальная типографика.', accent: '#e9ddc5', layout: 'list' },
    { id: 'arcade', name: 'Аркада', category: 'gaming', description: 'Пиксельные уголки, рубленые цифры и сегменты цели.', accent: '#cfef51', layout: 'list' },
    { id: 'terminal', name: 'Терминал', category: 'gaming', description: 'Моноширинные строки с лаконичными зелёными акцентами.', accent: '#6cff98', layout: 'list' },
    { id: 'hologram', name: 'Голограмма', category: 'neon', description: 'Угловые метки и небольшой круговой индикатор.', accent: '#88f5ff', layout: 'ring' },
    { id: 'luxury', name: 'Золото', category: 'premium', description: 'Золотые засечки, симметрия и тонкие двойные линии.', accent: '#dfbd78', layout: 'centered' },
    { id: 'ribbon', name: 'Лента', category: 'creative', description: 'Розовые штрихи и лёгкая ступенчатая композиция.', accent: '#fb96b4', layout: 'list' },
    { id: 'split', name: 'Дуэт', category: 'minimal', description: 'Отдельная колонка значений с тонким разделителем.', accent: '#bbefa9', layout: 'split' },
    { id: 'capsule', name: 'Капсулы', category: 'minimal', description: 'Округлые отметки мест и мягкая форма прогресса.', accent: '#d6d9ff', layout: 'list' },
    { id: 'sticker', name: 'Стикеры', category: 'creative', description: 'Выразительный контур букв и маленькие наклонные акценты.', accent: '#f6de59', layout: 'list' },
    { id: 'brutal', name: 'Брутализм', category: 'creative', description: 'Крупные рубленые цифры и чёткие угловатые штрихи.', accent: '#d7ff3f', layout: 'list' },
    { id: 'paper', name: 'От руки', category: 'creative', description: 'Рукописный заголовок, свободные штрихи и пунктир.', accent: '#b9d8ff', layout: 'list' },
    { id: 'orbit', name: 'Орбита', category: 'neon', description: 'Тонкие орбиты аватаров и светящаяся круговая цель.', accent: '#c6aaff', layout: 'ring' },
    { id: 'retro', name: 'Ретро-поп', category: 'creative', description: 'Тёплая типографика и три короткие цветные полосы.', accent: '#ffc391', layout: 'centered' },
    { id: 'scoreboard', name: 'Табло', category: 'gaming', description: 'Ровная колонка счёта и компактные спортивные номера.', accent: '#ffc34e', layout: 'list' },
    { id: 'blueprint', name: 'Чертёж', category: 'gaming', description: 'Тонкие технические отметки и шкала с делениями.', accent: '#a0d9ff', layout: 'list' },
    { id: 'flame', name: 'На огне', category: 'neon', description: 'Наклонные цифры, тёплый градиент и огненный штрих.', accent: '#ffad62', layout: 'list' },
    { id: 'frost', name: 'Ледник', category: 'premium', description: 'Холодные блики, лёгкие буквы и кристальные грани.', accent: '#afefff', layout: 'centered' },
    { id: 'bubble', name: 'Облако', category: 'creative', description: 'Округлый шрифт, воздушные маркеры и пастельные акценты.', accent: '#e0bdff', layout: 'ring' },
    { id: 'cassette', name: 'Микстейп', category: 'gaming', description: 'Кассетные отметки и тонкая шкала эквалайзера.', accent: '#ffba78', layout: 'list' }
  ];
  const finite = (value, fallback, min, max) => value !== '' && value !== null && Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
  const defaultConfig = Object.freeze({ type: 'top-likes', style: 'glass', title: '', goal: 10000, limit: 5, accent: '', showAvatars: true, showSecondary: false, compact: true, enabled: true, width: 420 });

  function normalizeConfig(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    const type = types.find(item => item.id === raw.type) || types[0];
    const style = styles.find(item => item.id === raw.style) || styles[0];
    return {
      type: type.id,
      style: style.id,
      title: String(raw.title || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80),
      goal: Math.round(finite(raw.goal, type.id === 'follow-goal' ? 100 : 10000, 1, 1000000000)),
      limit: Math.round(finite(raw.limit, 5, 1, 10)),
      accent: /^#[0-9a-f]{6}$/i.test(raw.accent || '') ? raw.accent.toLowerCase() : '',
      showAvatars: raw.showAvatars !== false,
      showSecondary: raw.showSecondary === true,
      compact: raw.compact !== false,
      enabled: raw.enabled !== false,
      width: 420
    };
  }

  function dimensions(raw) {
    const config = normalizeConfig(raw);
    // Include the host's 20px padding and all rows; empty canvas remains transparent.
    const titleAllowance = config.title.length > 28 ? 50 : 0;
    return { width: 460, height: config.type.startsWith('top-') ? Math.max(340, 112 + config.limit * (config.compact ? 46 : 58)) + titleAllowance : config.type.endsWith('-goal') ? 240 + titleAllowance : 280 + titleAllowance };
  }

  function createDemoState() {
    return {
      likes: 6840, follows: 68, viewers: 1248,
      topLikes: [
        { id: 'demo-1', name: 'Александра', avatar: '', value: 2480 },
        { id: 'demo-2', name: 'max.live', avatar: '', value: 1720 },
        { id: 'demo-3', name: 'Полина', avatar: '', value: 1260 },
        { id: 'demo-4', name: 'Даня', avatar: '', value: 840 },
        { id: 'demo-5', name: 'Соня ✦', avatar: '', value: 540 }
      ],
      topGifters: [
        { id: 'demo-1', name: 'Александра', avatar: '', value: 15800 },
        { id: 'demo-2', name: 'max.live', avatar: '', value: 7400 },
        { id: 'demo-3', name: 'Полина', avatar: '', value: 3650 },
        { id: 'demo-4', name: 'Даня', avatar: '', value: 2100 },
        { id: 'demo-5', name: 'Соня ✦', avatar: '', value: 850 }
      ],
      biggestGift: { name: 'Александра', avatar: '', giftName: 'Галактика', giftImage: '', diamonds: 1000, repeatCount: 1, totalDiamonds: 1000 },
      giftCombo: { name: 'max.live', avatar: '', giftName: 'Роза', giftImage: '', diamonds: 1, repeatCount: 128, totalDiamonds: 128 },
      updatedAt: 0
    };
  }

  return { types, styles, categoryNames, defaultConfig, normalizeConfig, dimensions, createDemoState };
});
