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
    { id: 'follow-goal', name: 'Цель по подписчикам', description: 'Общее число подписчиков TikTok и цель для аккаунта.', icon: 'users', goal: true, unit: 'подписчиков' },
    { id: 'biggest-gift', name: 'Самый большой подарок', description: 'Самый дорогой единичный подарок и его отправитель.', icon: 'gift', goal: false, unit: 'алмазов' },
    { id: 'gift-combo', name: 'Самое большое комбо', description: 'Рекорд по количеству подарков в одной серии.', icon: 'bolt', goal: false, unit: 'подарков' }
  ];
  const categoryNames = { minimal: 'Минимализм', neon: 'Свет и неон', gaming: 'Игровые', creative: 'Креативные', premium: 'Премиум', comics: 'Комиксы', toys: 'Игрушки', space: 'Космос', animals: 'Зверята', adventure: 'Приключения', music: 'Музыка', sport: 'Спорт', nature: 'Природа', paper: 'Бумага' };
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
  // New silhouettes stay transparent. Frames are strokes, never filled cards.
  const additions = [
    ['speech','Реплика','comics','Речевая рамка с хвостиком и округлыми отметками.','#ffce72','list','speech','speech'],
    ['thought','Мысли вслух','comics','Облачный контур и маленькие пузырьки мысли.','#c9c1ff','ring','thought','thought'],
    ['comic-burst','Бум!','comics','Зубчатый контур вспышки и выразительные цифры.','#ffe66b','list','burst','burst'],
    ['comic-strip','Кадры','comics','Углы комиксного кадра, широкие номера и диагонали.','#a9e8ff','list','panels','panels'],
    ['manga','Манга','comics','Штрихи скорости и наклонная чёрно-белая типографика.','#f5f5ff','list','','speed'],
    ['pop-dots','Поп-арт','comics','Растровые точки, круглые аватары и яркие числа.','#ffa7cf','list','','dots'],
    ['sketch','Скетч','comics','Двойной рисованный контур с неровными штрихами.','#fff0b2','list','sketch','pencil'],
    ['blocks','Кубики','toys','Квадратные жетоны, ступенчатые линии и игровой счёт.','#9edfff','list','','blocks'],
    ['jelly','Желе','toys','Мягкий асимметричный контур и тягучая линия цели.','#e9b8ff','list','jelly','jelly'],
    ['marshmallow','Зефир','toys','Пухлые фестоны, округлые буквы и воздушные числа.','#ffd2e9','list','scallop','cloud'],
    ['candy-cane','Леденец','toys','Полосатая шкала, конфетные завитки и круглые метки.','#ff9db9','list','','candy'],
    ['balloons','Шарики','toys','Контурные воздушные шары и круговая цель.','#ffd792','ring','','balloons'],
    ['confetti','Конфетти','toys','Редкие звёздочки и бумажные завитки вокруг данных.','#b2f0be','list','','confetti'],
    ['pinwheel','Вертушка','toys','Четыре бумажные лопасти и ромбовидные акценты.','#c4c2ff','list','','pinwheel'],
    ['toy-train','Паровозик','toys','Рельсы, маленькие колёса и сцепленные строки.','#ffcb91','list','train','train'],
    ['rocket','Ракета','space','Ракета на старте, косые штрихи и счёт до цели.','#ffbc91','list','','rocket'],
    ['ufo','Летающая тарелка','space','Орбитальная дуга и тонкие лучи вокруг значений.','#b3ffda','ring','','ufo'],
    ['saturn','Сатурн','space','Наклонные кольца, планеты-аватары и круглая цель.','#e3c0ff','ring','','saturn'],
    ['constellation','Созвездие','space','Метки-звёзды соединены тонкой линией рейтинга.','#c7e0ff','list','','constellation'],
    ['meteor','Метеор','space','Длинный хвост кометы и обтекаемые штрихи.','#9eefff','list','','meteor'],
    ['cat','Котик','animals','Кошачьи ушки над контуром и маленькие усы.','#ffd0e5','list','cat','cat'],
    ['bear','Мишка','animals','Круглые ушки и мягкие медвежьи жетоны.','#edc99f','list','bear','bear'],
    ['bunny','Зайчик','animals','Длинные ушки, лёгкие овалы и пастельные акценты.','#dfc8ff','list','','bunny'],
    ['fox','Лисёнок','animals','Острые ушки, треугольные метки и лисий хвост.','#ffc087','list','','fox'],
    ['paw','Лапки','animals','Следы лап вместо строгих ранговых меток.','#bce8d1','list','','paw'],
    ['gamepad','Геймпад','adventure','Контур контроллера, крестовина и игровые кнопки.','#b3cbff','list','gamepad','gamepad'],
    ['pixel-cloud','Пиксельное облако','adventure','Ступенчатый пиксельный силуэт и сегменты прогресса.','#c4f4ff','list','pixel','pixel'],
    ['quest','Свиток','adventure','Тонкий контур свитка и каллиграфические цифры.','#f6dfac','list','scroll','scroll'],
    ['shield','Щит','adventure','Маленькие щиты на местах и эмблема достижения.','#c1d7ff','list','','shield'],
    ['treasure','Сокровища','adventure','Уголки сундука, драгоценные метки и золотой счёт.','#ffe397','list','treasure','treasure'],
    ['waveform','Звуковая волна','music','Звуковая линия и ритмичные столбики у значений.','#ffb7df','list','','waveform'],
    ['vinyl','Винил','music','Концентрические дорожки пластинки и круговой индикатор.','#d1c7ff','ring','','vinyl'],
    ['piano','Клавиши','music','Клавиатура в шкале прогресса и строгий нотный ритм.','#f7f4ee','list','','piano'],
    ['boombox','Бумбокс','music','Две контурные колонки, частотные метки и стереосчёт.','#ffc3a4','list','boombox','boombox'],
    ['headphones','Наушники','music','Дуга наушников и мягкие круглые аватары.','#c7efff','list','','headphones'],
    ['racing','Гонка','sport','Клетчатый флаг, наклонные цифры и гоночные полосы.','#ffad96','list','','racing'],
    ['chevrons','Ускорение','sport','Стрелки-шевроны и динамичная ступенчатая композиция.','#c9f88c','list','','chevrons'],
    ['medals','Медали','sport','Тройка лидеров с медалями и лентами награждения.','#ffdf88','podium','','medal'],
    ['stadium','Стадион','sport','Овальные дорожки, командные номера и круговой счёт.','#b8f6c6','ring','','stadium'],
    ['finish-line','Финиш','sport','Лента между флажками и точная шкала результата.','#f4eaa6','list','','finish'],
    ['leaf','Листва','nature','Тонкие ветви, листовые контуры и лёгкие цифры.','#bee5ad','list','','leaf'],
    ['bloom','Цветение','nature','Контурные лепестки вокруг аватаров и цветочная цель.','#ffbfdf','ring','','flower'],
    ['wave','Волна','nature','Плавные морские линии и волнистая шкала прогресса.','#9ee7ff','list','','wave'],
    ['sunrise','Рассвет','nature','Полукруг солнца, тонкие лучи и тёплая типографика.','#ffdfa3','ring','','sunrise'],
    ['mountains','Горы','nature','Контурные вершины и треугольные метки высоты.','#c3e4e7','list','','mountains'],
    ['origami','Оригами','paper','Угловые бумажные сгибы, ромбы и острые штрихи.','#d6d1ff','list','origami','origami'],
    ['postcard','Открытка','paper','Почтовая перфорация, штемпель и аккуратный счёт.','#ffd6b2','list','postcard','stamp'],
    ['polaroid','Полароид','paper','Миниатюрные фоторамки аватаров и рукописная подпись.','#fff0d6','list','','photo'],
    ['ticket','Билет','paper','Прозрачный контур билета с вырезами и отрывной линией.','#c8e6fc','list','ticket','ticket'],
    ['bookmark','Закладка','paper','Узкая лента-закладка и книжная типографика.','#efbdd7','list','','bookmark']
  ];
  styles.push(...additions.map(([id,name,category,description,accent,layout,frame,mark])=>({id,name,category,description,accent,layout,frame,mark})));
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
      goal: Math.round(finite(raw.goal, type.id === 'follow-goal' ? 3500 : 10000, 1, 1000000000)),
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
    const style = styles.find(item=>item.id===config.style);
    const titleAllowance = config.title.length > 28 ? 50 : 0;
    const formAllowance = style.frame ? 85 : style.mark ? 35 : 0;
    return { width: 460, height: (config.type.startsWith('top-') ? Math.max(340, 112 + config.limit * (config.compact ? 46 : 58)) + titleAllowance : config.type.endsWith('-goal') ? 240 + titleAllowance : 280 + titleAllowance) + formAllowance };
  }

  function createDemoState() {
    return {
      likes: 6840, follows: 68, followers: 3000, viewers: 1248,
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
