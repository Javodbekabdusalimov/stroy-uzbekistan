const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const swaggerConfig = require('./src/config/swagger');
const errorHandler = require('./src/middleware/error.middleware');
const logger = require('./src/utils/logger');

// Routes
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const storeRoutes = require('./src/routes/store.routes');
const productRoutes = require('./src/routes/product.routes');
const orderRoutes = require('./src/routes/order.routes');
const subscriptionRoutes = require('./src/routes/subscription.routes');
const vehicleRoutes = require('./src/routes/vehicle.routes');
const commentRoutes = require('./src/routes/comment.routes');
const deliveryRoutes = require('./src/routes/delivery.routes');
const categoryRoutes = require('./src/routes/category.routes');
const adminRoutes = require('./src/routes/admin.routes');
const uploadRoutes = require('./src/routes/upload.routes');

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) }
  }));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger
swaggerConfig(app);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Stroy Market UZ API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
const API = `/api/${process.env.API_VERSION || 'v1'}`;
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/stores`, storeRoutes);
app.use(`${API}/products`, productRoutes);
app.use(`${API}/orders`, orderRoutes);
app.use(`${API}/subscriptions`, subscriptionRoutes);
app.use(`${API}/vehicles`, vehicleRoutes);
app.use(`${API}/comments`, commentRoutes);
app.use(`${API}/delivery`, deliveryRoutes);
app.use(`${API}/categories`, categoryRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/upload`, uploadRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Error handler
app.use(errorHandler);

module.exports = app;
