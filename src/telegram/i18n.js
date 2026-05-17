// Telegram bot — 3-language translations (uz / ru / en)

const btn = {
  uz: {
    login:        '🔐 Kirish',
    register:     "📝 Ro'yxatdan o'tish",
    about:        'ℹ️ Bot haqida',
    stores:       "🏪 Do'konlar",
    search:       '🔍 Qidiruv',
    myOrders:     '🛒 Buyurtmalarim',
    orders:       '📋 Buyurtmalar',
    deliveries:   '🚚 Yetkazmalarim',
    profile:      '👤 Profilim',
    myStore:      "🏬 Mening do'konim",
    subscription: '💳 Obuna',
    stats:        '📊 Statistika',
    dashboard:    '📊 Dashboard',
    logout:       '❌ Chiqish',
    back:         '⬅️ Orqaga',
    lang:         '🌐 Til',
  },
  ru: {
    login:        '🔐 Войти',
    register:     '📝 Регистрация',
    about:        'ℹ️ О боте',
    stores:       '🏪 Магазины',
    search:       '🔍 Поиск',
    myOrders:     '🛒 Мои заказы',
    orders:       '📋 Заказы',
    deliveries:   '🚚 Мои доставки',
    profile:      '👤 Профиль',
    myStore:      '🏬 Мой магазин',
    subscription: '💳 Подписка',
    stats:        '📊 Статистика',
    dashboard:    '📊 Дашборд',
    logout:       '❌ Выйти',
    back:         '⬅️ Назад',
    lang:         '🌐 Язык',
  },
  en: {
    login:        '🔐 Login',
    register:     '📝 Register',
    about:        'ℹ️ About',
    stores:       '🏪 Stores',
    search:       '🔍 Search',
    myOrders:     '🛒 My Orders',
    orders:       '📋 Orders',
    deliveries:   '🚚 My Deliveries',
    profile:      '👤 Profile',
    myStore:      '🏬 My Store',
    subscription: '💳 Subscription',
    stats:        '📊 Statistics',
    dashboard:    '📊 Dashboard',
    logout:       '❌ Logout',
    back:         '⬅️ Back',
    lang:         '🌐 Language',
  },
};

const msg = {
  uz: {
    chooseLang:     '🌐 Tilni tanlang:\n\nВыберите язык:\n\nChoose language:',
    langSet:        "✅ Til o'rnatildi: O'zbek 🇺🇿",
    welcomeNew:     () =>
      `🏗️ <b>Stroy Market Uzbekistan</b>\n\n` +
      `Qurilish materiallari bozorida xush kelibsiz!\n\n` +
      `🏪 Do'konlar  📦 Mahsulotlar  🛒 Buyurtma  🚚 Yetkazish\n\n` +
      `Davom etish uchun <b>Kirish</b> yoki <b>Ro'yxatdan o'tish</b> tugmasini bosing.`,
    welcomeBack:    (name) => `👋 Xush kelibsiz qaytib, <b>${name}</b>!`,
    alreadyIn:      (name) => `✅ Siz allaqachon kirgansiz, <b>${name}</b>`,
    notLoggedIn:    '⚠️ Avval kiring: /login',
    phonePrompt:    `📱 Telefon raqamingizni kiriting:\n<code>+998901234567</code>`,
    phoneWrong:     `❌ Format noto'g'ri. Namuna: <code>+998901234567</code>`,
    phoneNotFound:  "❌ Bu telefon raqam topilmadi.\n\nRo'yxatdan o'tish: /register",
    passPrompt:     '🔒 Parolni kiriting:',
    passWrong:      "❌ Parol noto'g'ri. Qayta urining:",
    loginOk:        (name) => `✅ <b>Xush kelibsiz, ${name}!</b> 🎉`,
    regName:        `✍️ <b>Ro'yxatdan o'tish</b>\n\nIsmingizni kiriting:`,
    regNameErr:     "❌ Ism 2-100 ta harf bo'lishi kerak:",
    regPhone:       `📱 Telefon raqam kiriting:\n<code>+998901234567</code>`,
    regPhoneExists: "❌ Bu raqam allaqachon ro'yxatdan o'tgan.\n\n/login",
    regPass:        "🔒 Parol o'rnating (kamida 6 ta belgi):",
    regPassErr:     "❌ Parol kamida 6 ta belgi bo'lishi kerak:",
    regOk:          (name) => `🎉 <b>Muvaffaqiyatli ro'yxatdan o'tdingiz!</b>\n\nXush kelibsiz, <b>${name}</b>!`,
    logoutOk:       '👋 Tizimdan chiqdingiz.',
    mainMenu:       '🏠 Bosh menyu',
    noOrders:       "📭 Buyurtmalar yo'q.",
    noStores:       "🏪 Do'konlar topilmadi.",
    noStore:        "📭 Sizda do'kon yo'q.\n\nAPI orqali yarating: POST /api/v1/stores",
    noProducts:     '📭 Mahsulotlar topilmadi.',
    noResults:      (q) => `❌ <b>${q}</b> bo'yicha natija topilmadi.`,
    searchPrompt:   "🔍 Qidiruv so'zini kiriting:",
    searchResults:  (q) => `🔍 <b>${q}</b> bo'yicha natijalar:\n\n`,
    ordersHeader:   '🛒 <b>Buyurtmalarim:</b>\n\n',
    storesHeader:   "🏪 <b>Do'konlar ro'yxati:</b>",
    storeNotFound:  "❌ Do'kon topilmadi",
    profileHeader:  '👤 <b>Profil</b>\n\n',
    subsHeader:     '💳 <b>Obuna rejalari:</b>\n\n',
    statsHeader:    (name) => `📊 <b>${name} statistikasi</b>\n\n`,
    trackNotFound:  (c) => `❌ <code>${c}</code> kodi bilan yetkazma topilmadi.`,
    trackHeader:    '📦 <b>Buyurtma kuzatuvi</b>\n\n',
    errGeneral:     (e) => `❌ Xatolik: ${e}`,
    helpText:
      `📖 <b>Buyruqlar:</b>\n\n` +
      `/start — Bosh menyu\n` +
      `/login — Kirish\n` +
      `/register — Ro'yxatdan o'tish\n` +
      `/orders — Buyurtmalarim\n` +
      `/stores — Do'konlar\n` +
      `/subscription — Obuna rejalari\n` +
      `/track KOD — Kuzatuv\n` +
      `/profile — Profilim\n` +
      `/lang — Til almashtirish\n` +
      `/logout — Chiqish\n` +
      `/help — Yordam\n\n` +
      `📞 Muammo bo'lsa: @Java_411`,
    aboutText:
      `🏗️ <b>Stroy Market Uzbekistan</b>\n\n` +
      `Qurilish materiallari bozori.\n\n` +
      `🏪 Sotuvchilar — do'kon oching\n` +
      `🛒 Mijozlar — buyurtma bering\n` +
      `🚚 Haydovchilar — yetkazing\n` +
      `💳 3 xil obuna rejasi\n\n` +
      `📞 Muammo: @Java_411`,
    statusLabels: {
      pending: '⏳ Kutilmoqda', confirmed: '✅ Tasdiqlandi',
      preparing: '👨‍🍳 Tayyorlanmoqda', delivering: '🚚 Yetkazilmoqda',
      delivered: '✔️ Yetkazildi', cancelled: '❌ Bekor qilindi',
    },
    deliveryStatus: {
      assigned: '📌 Tayinlandi', picked_up: '📦 Olindi',
      in_transit: "🚚 Yo'lda", delivered: '✅ Yetkazildi', failed: '❌ Muvaffaqiyatsiz',
    },
    roleLabels:   { admin: 'Admin 👑', seller: "Sotuvchi 🏪", client: "Mijoz 🛒", driver: "Haydovchi 🚗" },
    profileName:   'Ism',
    profilePhone:  'Telefon',
    profileEmail:  'Email',
    profileRole:   'Rol',
    profileSince:  "A'zo bo'lgan",
    storeProducts: 'Mahsulotlar',
    storeVehicles: 'Avtomobil',
    storeRating:   'Reyting',
    storePlan:     'Obuna',
    storeVerified: '✅ Tasdiqlangan',
    storeNotVerif: '⏳ Tasdiqlanmagan',
    storePhone:    'Tel',
    statsTotal:    'Jami buyurtmalar',
    statsPending:  'Kutilayotgan',
    statsDeliv:    'Yetkazilgan',
    statsRev:      'Daromad',
    subsUnlimited: 'Cheksiz',
    subsPerMonth:  '/oy',
    subsProducts:  'mahsulot',
    subsVehicles:  'avtomobil',
    trackCode:     'Kod',
    trackStatus:   'Holat',
    trackDriver:   'Haydovchi',
    trackVehicle:  'Avtomobil',
    trackMap:      "Xaritada ko'rish",
    trackAddr:     'Manzil',
    prodAvail:     'mavjud',
    delivery:      '🚚 Yetkazish',
  },

  ru: {
    chooseLang:     '🌐 Tilni tanlang:\n\nВыберите язык:\n\nChoose language:',
    langSet:        '✅ Язык установлен: Русский 🇷🇺',
    welcomeNew:     () =>
      `🏗️ <b>Stroy Market Uzbekistan</b>\n\n` +
      `Добро пожаловать на строительный рынок!\n\n` +
      `🏪 Магазины  📦 Товары  🛒 Заказы  🚚 Доставка\n\n` +
      `Нажмите <b>Войти</b> или <b>Регистрация</b> для продолжения.`,
    welcomeBack:    (name) => `👋 С возвращением, <b>${name}</b>!`,
    alreadyIn:      (name) => `✅ Вы уже вошли как <b>${name}</b>`,
    notLoggedIn:    '⚠️ Сначала войдите: /login',
    phonePrompt:    `📱 Введите номер телефона:\n<code>+998901234567</code>`,
    phoneWrong:     `❌ Неверный формат. Пример: <code>+998901234567</code>`,
    phoneNotFound:  '❌ Этот номер не найден.\n\nРегистрация: /register',
    passPrompt:     '🔒 Введите пароль:',
    passWrong:      '❌ Неверный пароль. Попробуйте ещё:',
    loginOk:        (name) => `✅ <b>Добро пожаловать, ${name}!</b> 🎉`,
    regName:        '✍️ <b>Регистрация</b>\n\nВведите ваше имя:',
    regNameErr:     '❌ Имя должно быть от 2 до 100 символов:',
    regPhone:       `📱 Введите номер телефона:\n<code>+998901234567</code>`,
    regPhoneExists: '❌ Этот номер уже зарегистрирован.\n\n/login',
    regPass:        '🔒 Установите пароль (минимум 6 символов):',
    regPassErr:     '❌ Пароль должен быть минимум 6 символов:',
    regOk:          (name) => `🎉 <b>Регистрация прошла успешно!</b>\n\nДобро пожаловать, <b>${name}</b>!`,
    logoutOk:       '👋 Вы вышли из системы.',
    mainMenu:       '🏠 Главное меню',
    noOrders:       '📭 Заказов нет.',
    noStores:       '🏪 Магазины не найдены.',
    noStore:        '📭 У вас нет магазина.\n\nСоздайте через API: POST /api/v1/stores',
    noProducts:     '📭 Товары не найдены.',
    noResults:      (q) => `❌ По запросу <b>${q}</b> ничего не найдено.`,
    searchPrompt:   '🔍 Введите поисковый запрос:',
    searchResults:  (q) => `🔍 Результаты по <b>${q}</b>:\n\n`,
    ordersHeader:   '🛒 <b>Мои заказы:</b>\n\n',
    storesHeader:   '🏪 <b>Список магазинов:</b>',
    storeNotFound:  '❌ Магазин не найден',
    profileHeader:  '👤 <b>Профиль</b>\n\n',
    subsHeader:     '💳 <b>Планы подписки:</b>\n\n',
    statsHeader:    (name) => `📊 <b>Статистика ${name}</b>\n\n`,
    trackNotFound:  (c) => `❌ Доставка с кодом <code>${c}</code> не найдена.`,
    trackHeader:    '📦 <b>Отслеживание заказа</b>\n\n',
    errGeneral:     (e) => `❌ Ошибка: ${e}`,
    helpText:
      `📖 <b>Команды:</b>\n\n` +
      `/start — Главное меню\n` +
      `/login — Войти\n` +
      `/register — Регистрация\n` +
      `/orders — Мои заказы\n` +
      `/stores — Магазины\n` +
      `/subscription — Подписки\n` +
      `/track КОД — Отслеживание\n` +
      `/profile — Профиль\n` +
      `/lang — Язык\n` +
      `/logout — Выйти\n` +
      `/help — Помощь\n\n` +
      `📞 Поддержка: @Java_411`,
    aboutText:
      `🏗️ <b>Stroy Market Uzbekistan</b>\n\n` +
      `Строительный рынок онлайн.\n\n` +
      `🏪 Продавцы — откройте магазин\n` +
      `🛒 Клиенты — делайте заказы\n` +
      `🚚 Водители — доставляйте\n` +
      `💳 3 плана подписки\n\n` +
      `📞 Вопросы: @Java_411`,
    statusLabels: {
      pending: '⏳ Ожидает', confirmed: '✅ Подтверждён',
      preparing: '👨‍🍳 Готовится', delivering: '🚚 Доставляется',
      delivered: '✔️ Доставлен', cancelled: '❌ Отменён',
    },
    deliveryStatus: {
      assigned: '📌 Назначен', picked_up: '📦 Забран',
      in_transit: '🚚 В пути', delivered: '✅ Доставлен', failed: '❌ Неудача',
    },
    roleLabels:   { admin: 'Админ 👑', seller: 'Продавец 🏪', client: 'Клиент 🛒', driver: 'Водитель 🚗' },
    profileName:   'Имя',
    profilePhone:  'Телефон',
    profileEmail:  'Email',
    profileRole:   'Роль',
    profileSince:  'Участник с',
    storeProducts: 'Товары',
    storeVehicles: 'Транспорт',
    storeRating:   'Рейтинг',
    storePlan:     'Подписка',
    storeVerified: '✅ Верифицирован',
    storeNotVerif: '⏳ Не верифицирован',
    storePhone:    'Тел',
    statsTotal:    'Всего заказов',
    statsPending:  'Ожидающих',
    statsDeliv:    'Доставленных',
    statsRev:      'Доход',
    subsUnlimited: 'Безлимит',
    subsPerMonth:  '/мес',
    subsProducts:  'товаров',
    subsVehicles:  'транспорт',
    trackCode:     'Код',
    trackStatus:   'Статус',
    trackDriver:   'Водитель',
    trackVehicle:  'Транспорт',
    trackMap:      'Смотреть на карте',
    trackAddr:     'Адрес',
    prodAvail:     'в наличии',
    delivery:      '🚚 Доставка',
  },

  en: {
    chooseLang:     '🌐 Tilni tanlang:\n\nВыберите язык:\n\nChoose language:',
    langSet:        '✅ Language set: English 🇬🇧',
    welcomeNew:     () =>
      `🏗️ <b>Stroy Market Uzbekistan</b>\n\n` +
      `Welcome to the construction materials marketplace!\n\n` +
      `🏪 Stores  📦 Products  🛒 Orders  🚚 Delivery\n\n` +
      `Press <b>Login</b> or <b>Register</b> to continue.`,
    welcomeBack:    (name) => `👋 Welcome back, <b>${name}</b>!`,
    alreadyIn:      (name) => `✅ You are already logged in as <b>${name}</b>`,
    notLoggedIn:    '⚠️ Please login first: /login',
    phonePrompt:    `📱 Enter your phone number:\n<code>+998901234567</code>`,
    phoneWrong:     `❌ Wrong format. Example: <code>+998901234567</code>`,
    phoneNotFound:  '❌ This phone number was not found.\n\nRegister: /register',
    passPrompt:     '🔒 Enter your password:',
    passWrong:      '❌ Wrong password. Try again:',
    loginOk:        (name) => `✅ <b>Welcome, ${name}!</b> 🎉`,
    regName:        '✍️ <b>Registration</b>\n\nEnter your name:',
    regNameErr:     '❌ Name must be 2-100 characters:',
    regPhone:       `📱 Enter phone number:\n<code>+998901234567</code>`,
    regPhoneExists: '❌ This number is already registered.\n\n/login',
    regPass:        '🔒 Set a password (minimum 6 characters):',
    regPassErr:     '❌ Password must be at least 6 characters:',
    regOk:          (name) => `🎉 <b>Successfully registered!</b>\n\nWelcome, <b>${name}</b>!`,
    logoutOk:       '👋 You have been logged out.',
    mainMenu:       '🏠 Main menu',
    noOrders:       '📭 No orders found.',
    noStores:       '🏪 No stores found.',
    noStore:        '📭 You have no store.\n\nCreate via API: POST /api/v1/stores',
    noProducts:     '📭 No products found.',
    noResults:      (q) => `❌ No results found for <b>${q}</b>.`,
    searchPrompt:   '🔍 Enter search query:',
    searchResults:  (q) => `🔍 Results for <b>${q}</b>:\n\n`,
    ordersHeader:   '🛒 <b>My Orders:</b>\n\n',
    storesHeader:   '🏪 <b>Stores list:</b>',
    storeNotFound:  '❌ Store not found',
    profileHeader:  '👤 <b>Profile</b>\n\n',
    subsHeader:     '💳 <b>Subscription plans:</b>\n\n',
    statsHeader:    (name) => `📊 <b>${name} Statistics</b>\n\n`,
    trackNotFound:  (c) => `❌ No delivery found with code <code>${c}</code>.`,
    trackHeader:    '📦 <b>Order Tracking</b>\n\n',
    errGeneral:     (e) => `❌ Error: ${e}`,
    helpText:
      `📖 <b>Commands:</b>\n\n` +
      `/start — Main menu\n` +
      `/login — Login\n` +
      `/register — Register\n` +
      `/orders — My orders\n` +
      `/stores — Stores\n` +
      `/subscription — Plans\n` +
      `/track CODE — Tracking\n` +
      `/profile — Profile\n` +
      `/lang — Language\n` +
      `/logout — Logout\n` +
      `/help — Help\n\n` +
      `📞 Support: @Java_411`,
    aboutText:
      `🏗️ <b>Stroy Market Uzbekistan</b>\n\n` +
      `Construction materials marketplace.\n\n` +
      `🏪 Sellers — open your store\n` +
      `🛒 Customers — place orders\n` +
      `🚚 Drivers — make deliveries\n` +
      `💳 3 subscription plans\n\n` +
      `📞 Support: @Java_411`,
    statusLabels: {
      pending: '⏳ Pending', confirmed: '✅ Confirmed',
      preparing: '👨‍🍳 Preparing', delivering: '🚚 Delivering',
      delivered: '✔️ Delivered', cancelled: '❌ Cancelled',
    },
    deliveryStatus: {
      assigned: '📌 Assigned', picked_up: '📦 Picked up',
      in_transit: '🚚 In transit', delivered: '✅ Delivered', failed: '❌ Failed',
    },
    roleLabels:   { admin: 'Admin 👑', seller: 'Seller 🏪', client: 'Customer 🛒', driver: 'Driver 🚗' },
    profileName:   'Name',
    profilePhone:  'Phone',
    profileEmail:  'Email',
    profileRole:   'Role',
    profileSince:  'Member since',
    storeProducts: 'Products',
    storeVehicles: 'Vehicles',
    storeRating:   'Rating',
    storePlan:     'Plan',
    storeVerified: '✅ Verified',
    storeNotVerif: '⏳ Not verified',
    storePhone:    'Phone',
    statsTotal:    'Total orders',
    statsPending:  'Pending',
    statsDeliv:    'Delivered',
    statsRev:      'Revenue',
    subsUnlimited: 'Unlimited',
    subsPerMonth:  '/month',
    subsProducts:  'products',
    subsVehicles:  'vehicles',
    trackCode:     'Code',
    trackStatus:   'Status',
    trackDriver:   'Driver',
    trackVehicle:  'Vehicle',
    trackMap:      'View on map',
    trackAddr:     'Address',
    prodAvail:     'available',
    delivery:      '🚚 Delivery',
  },
};

module.exports = { btn, msg };
