const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Stroy Market Uzbekistan API',
      version: '1.0.0',
      description: `
# Stroy Market Uzbekistan - Professional Construction Materials Marketplace

## Authentication
Use JWT Bearer token. Get token from /api/v1/auth/login endpoint.

## Roles
- **admin**: Full access to all endpoints
- **seller**: Manage own stores, products, vehicles, orders
- **client**: Browse, order, review products
- **driver**: Manage deliveries assigned to them

## Subscription Plans
| Plan | Price | Features |
|------|-------|---------|
| Basic | 100,000 UZS/month | 50 products, 1 vehicle |
| Silver | 200,000 UZS/month | 200 products, 3 vehicles, analytics |
| Gold | 300,000 UZS/month | Unlimited products, unlimited vehicles, priority support |
      `,
      contact: {
        name: 'Stroy Market UZ Support',
        email: 'admin@stroymarket.uz'
      },
      license: {
        name: 'MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}/api/v1`,
        description: 'Development server'
      },
      {
        url: 'https://api.stroymarket.uz/api/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'string' } }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            pages: { type: 'integer' },
            limit: { type: 'integer' }
          }
        }
      }
    },
    security: [{ BearerAuth: [] }]
  },
  apis: ['./src/routes/*.js', './src/models/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = (app) => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customSiteTitle: 'Stroy Market UZ API',
    customCss: '.swagger-ui .topbar { background-color: #ff6b35; }',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true
    }
  }));
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};
