require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Store = require('../models/Store');
const Category = require('../models/Category');
const Subscription = require('../models/Subscription');
const Product = require('../models/Product');
const logger = require('./logger');

const categories = [
  { name: 'Qurilish materiallari', nameUz: 'Qurilish materiallari', nameRu: 'Строительные материалы', slug: 'qurilish-materiallari', icon: '🏗️', order: 1 },
  { name: 'Metallurgiya', nameUz: 'Metallurgiya', nameRu: 'Металлургия', slug: 'metallurgiya', icon: '🔩', order: 2 },
  { name: 'Elektr jihozlari', nameUz: 'Elektr jihozlari', nameRu: 'Электрооборудование', slug: 'elektr-jihozlari', icon: '⚡', order: 3 },
  { name: 'Santexnika', nameUz: 'Santexnika', nameRu: 'Сантехника', slug: 'santexnika', icon: '🚿', order: 4 },
  { name: 'Yog\'och materiallari', nameUz: 'Yog\'och materiallari', nameRu: 'Деревянные материалы', slug: 'yogoch-materiallari', icon: '🪵', order: 5 },
  { name: 'Bo\'yoq va laklar', nameUz: 'Bo\'yoq va laklar', nameRu: 'Краски и лаки', slug: 'boyoq-va-laklar', icon: '🎨', order: 6 },
  { name: 'Plitka va keramika', nameUz: 'Plitka va keramika', nameRu: 'Плитка и керамика', slug: 'plitka-va-keramika', icon: '🪴', order: 7 },
  { name: 'Asbob-uskunalar', nameUz: 'Asbob-uskunalar', nameRu: 'Инструменты', slug: 'asbob-uskunalar', icon: '🔧', order: 8 },
  { name: 'Eshik va derazalar', nameUz: 'Eshik va derazalar', nameRu: 'Двери и окна', slug: 'eshik-va-derazalar', icon: '🚪', order: 9 },
  { name: 'Tom yopqich', nameUz: 'Tom yopqich', nameRu: 'Кровля', slug: 'tom-yopqich', icon: '🏠', order: 10 }
];

const subscriptionPlans = [
  {
    name: 'basic',
    displayName: 'Basic',
    displayNameUz: 'Asosiy',
    price: 100000,
    durationDays: 30,
    maxProducts: 50,
    maxVehicles: 1,
    maxImages: 5,
    features: ['50 ta mahsulot', '1 ta avtomobil', '5 ta rasm/mahsulot', 'Asosiy statistika'],
    featuresUz: ['50 ta mahsulot', '1 ta avtomobil', '5 ta rasm/mahsulot', 'Asosiy statistika'],
    color: '#4CAF50',
    order: 1
  },
  {
    name: 'silver',
    displayName: 'Silver',
    displayNameUz: 'Kumush',
    price: 200000,
    durationDays: 30,
    maxProducts: 200,
    maxVehicles: 3,
    maxImages: 10,
    features: ['200 ta mahsulot', '3 ta avtomobil', '10 ta rasm/mahsulot', 'Kengaytirilgan statistika', 'Tanlangan do\'konlar ro\'yxatida'],
    featuresUz: ['200 ta mahsulot', '3 ta avtomobil', '10 ta rasm/mahsulot', 'Kengaytirilgan statistika', 'Tanlangan do\'konlar ro\'yxatida'],
    color: '#9E9E9E',
    order: 2
  },
  {
    name: 'gold',
    displayName: 'Gold',
    displayNameUz: 'Oltin',
    price: 300000,
    durationDays: 30,
    maxProducts: 999999,
    maxVehicles: 999999,
    maxImages: 20,
    features: ['Cheksiz mahsulot', 'Cheksiz avtomobil', '20 ta rasm/mahsulot', 'Premium statistika', 'Birinchi qatorda ko\'rsatish', 'Priority qo\'llab-quvvatlash', 'Telegram bot bildirishnomalar'],
    featuresUz: ['Cheksiz mahsulot', 'Cheksiz avtomobil', '20 ta rasm/mahsulot', 'Premium statistika', 'Birinchi qatorda ko\'rsatish', 'Priority qo\'llab-quvvatlash', 'Telegram bot bildirishnomalar'],
    color: '#FFD700',
    order: 3
  }
];

const seed = async () => {
  try {
    await connectDB();
    logger.info('🌱 Seed jarayoni boshlandi...');

    // Categories
    logger.info('📁 Kategoriyalar yaratilmoqda...');
    await Category.deleteMany({});
    const createdCategories = await Category.insertMany(categories);
    logger.info(`✅ ${createdCategories.length} ta kategoriya yaratildi`);

    // Subscription plans
    logger.info('💳 Obuna rejalari yaratilmoqda...');
    await Subscription.deleteMany({});
    const createdSubs = await Subscription.insertMany(subscriptionPlans);
    logger.info(`✅ ${createdSubs.length} ta obuna rejasi yaratildi`);

    // Users
    logger.info('👥 Foydalanuvchilar yaratilmoqda...');

    // Admin
    const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL });
    let admin;
    if (!existingAdmin) {
      admin = await User.create({
        name: process.env.ADMIN_NAME || 'Super Admin',
        email: process.env.ADMIN_EMAIL || 'admin@stroymarket.uz',
        phone: process.env.ADMIN_PHONE || '+998901234567',
        password: process.env.ADMIN_PASSWORD || 'Admin@12345',
        role: 'admin',
        isActive: true
      });
      logger.info(`✅ Admin yaratildi: ${admin.email}`);
    } else {
      admin = existingAdmin;
      logger.info(`ℹ️  Admin allaqachon mavjud: ${admin.email}`);
    }

    // Seller
    const existingSeller = await User.findOne({ email: process.env.SELLER_EMAIL });
    let seller;
    if (!existingSeller) {
      seller = await User.create({
        name: process.env.SELLER_NAME || 'Toshkent Qurilish',
        email: process.env.SELLER_EMAIL || 'seller@stroymarket.uz',
        phone: process.env.SELLER_PHONE || '+998901234568',
        password: process.env.SELLER_PASSWORD || 'Seller@12345',
        role: 'seller',
        isActive: true
      });
      logger.info(`✅ Seller yaratildi: ${seller.email}`);
    } else {
      seller = existingSeller;
      logger.info(`ℹ️  Seller allaqachon mavjud: ${seller.email}`);
    }

    // Client
    const existingClient = await User.findOne({ email: process.env.CLIENT_EMAIL });
    let client;
    if (!existingClient) {
      client = await User.create({
        name: process.env.CLIENT_NAME || 'Abdullayev Jasur',
        email: process.env.CLIENT_EMAIL || 'client@stroymarket.uz',
        phone: process.env.CLIENT_PHONE || '+998901234569',
        password: process.env.CLIENT_PASSWORD || 'Client@12345',
        role: 'client',
        isActive: true
      });
      logger.info(`✅ Client yaratildi: ${client.email}`);
    } else {
      client = existingClient;
      logger.info(`ℹ️  Client allaqachon mavjud: ${client.email}`);
    }

    // Driver
    const existingDriver = await User.findOne({ phone: '+998901234570' });
    let driver;
    if (!existingDriver) {
      driver = await User.create({
        name: 'Karimov Bobur',
        phone: '+998901234570',
        password: 'Driver@12345',
        role: 'driver',
        isActive: true
      });
      logger.info(`✅ Haydovchi yaratildi: ${driver.phone}`);
    } else {
      driver = existingDriver;
      logger.info(`ℹ️  Haydovchi allaqachon mavjud: ${driver.phone}`);
    }

    // Store for seller
    let store = await Store.findOne({ owner: seller._id });
    if (!store) {
      store = await Store.create({
        name: 'Toshkent Qurilish Markazi',
        description: 'Toshkentdagi eng yirik qurilish materiallari do\'koni. Barcha turdagi qurilish materiallari mavjud.',
        owner: seller._id,
        category: createdCategories[0]._id,
        phone: '+998901234568',
        address: {
          region: 'Toshkent',
          city: 'Toshkent',
          district: 'Yunusobod tumani',
          street: 'Yunusobod ko\'chasi',
          house: '15',
          fullAddress: 'Toshkent sh., Yunusobod tumani, Yunusobod ko\'chasi 15',
          latitude: 41.3111,
          longitude: 69.2797
        },
        isVerified: true,
        subscriptionPlan: 'silver',
        maxProducts: 200,
        maxVehicles: 3,
        deliveryAvailable: true,
        deliveryFee: 15000,
        freeDeliveryFrom: 500000,
        paymentMethods: ['cash', 'card'],
        tags: ['qurilish', 'material', 'toshkent']
      });

      await User.findByIdAndUpdate(seller._id, { store: store._id });
      logger.info(`✅ Do\'kon yaratildi: ${store.name}`);

      // Sample products
      const sampleProducts = [
        {
          name: 'M400 Sement (50 kg)',
          description: 'Yuqori sifatli M400 markali sement. Qurilish ishlarida keng qo\'llaniladi.',
          price: 65000,
          unit: 'qop',
          quantity: 500,
          category: createdCategories[0]._id,
          store: store._id,
          isAvailable: true
        },
        {
          name: 'Qizil g\'isht',
          description: 'Standart o\'lchamdagi qurilish g\'ishtlari. 1 dona narxi.',
          price: 1200,
          unit: 'dona',
          quantity: 10000,
          category: createdCategories[0]._id,
          store: store._id,
          isAvailable: true
        },
        {
          name: 'Armatura 12mm (12 metr)',
          description: 'A400 markali armatura. Poydevor va to\'sinlarda ishlatiladi.',
          price: 95000,
          unit: 'metr',
          quantity: 1000,
          category: createdCategories[1]._id,
          store: store._id,
          isAvailable: true
        },
        {
          name: 'Sintetik bo\'yoq (10 litr)',
          description: 'Devor va shiftlar uchun premium sifatli bo\'yoq.',
          price: 185000,
          salePrice: 165000,
          unit: 'litr',
          quantity: 200,
          category: createdCategories[5]._id,
          store: store._id,
          isAvailable: true
        },
        {
          name: 'Santexnika quvur 32mm (1 metr)',
          description: 'Polipropilen quvur, issiq va sovuq suv uchun.',
          price: 12000,
          unit: 'metr',
          quantity: 500,
          category: createdCategories[3]._id,
          store: store._id,
          isAvailable: true
        }
      ];

      await Product.insertMany(sampleProducts);
      logger.info(`✅ ${sampleProducts.length} ta namunaviy mahsulot yaratildi`);
    } else {
      logger.info(`ℹ️  Do\'kon allaqachon mavjud: ${store.name}`);
    }

    logger.info('\n🎉 Seed muvaffaqiyatli yakunlandi!\n');
    logger.info('📋 Test akkountlar:');
    logger.info('┌─────────────────────────────────────────────────────────┐');
    logger.info('│  Admin:   admin@stroymarket.uz   | Admin@12345          │');
    logger.info('│  Seller:  seller@stroymarket.uz  | Seller@12345         │');
    logger.info('│  Client:  client@stroymarket.uz  | Client@12345         │');
    logger.info('│  Driver:  +998901234570          | Driver@12345         │');
    logger.info('└─────────────────────────────────────────────────────────┘');
    logger.info('📖 Swagger docs: http://localhost:5000/api/docs');

    process.exit(0);
  } catch (error) {
    logger.error('Seed xatosi:', error);
    process.exit(1);
  }
};

seed();
