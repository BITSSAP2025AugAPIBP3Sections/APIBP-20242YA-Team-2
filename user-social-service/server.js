const express = require('express');
const userRoutes = require('./routes/UserRoutes');
const sequelize = require('./utils/db'); // Database connection and setup
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const PORT = 3000; // Microservice port

app.use(express.json());

// Swagger setup
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User & Social Service API',
      version: '1.0.0',
      description: `API documentation for User & Social Service

---

## 📋 API SCOPE

### ✅ SCOPE-IN (What this API covers):
- User registration and authentication (signup/login)
- User profile management (view public profiles)
- Social connections (follow/unfollow users and organizations)
- User search and discovery
- Follower/Following list management

### ❌ SCOPE-OUT (What this API does NOT cover):
- **User notifications** → Handled by Notification Service
- **User event history** → Handled by Event Management Service
- **User recommendations** → Handled by Discovery & Recommendation Service
- **Password reset emails** → Handled by Notification Service
- **User analytics and reporting** → Handled by Analytics Service
- **Profile photo storage** → Handled by Media/Storage Service

### 📝 RATIONALE:
This service focuses on user identity, authentication, and social graph management. Event-related features, notifications, and media storage are intentionally excluded to maintain clear service boundaries and follow microservices architecture principles.

---
`
    },
    servers: [
      { url: 'http://localhost:3000' }
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'],
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 1. Setup Routes
app.use('/users', userRoutes);

// 2. Start DB connection and Server
sequelize.sync({ alter: true }) // Sync models with database
    .then(() => {
        console.log('Database connected and models synced.');
        app.listen(PORT, () => {
            console.log(`User & Social Service running on port ${PORT}`);
            console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
        });
    })
    .catch(err => {
        console.error('Database connection failed:', err);
    });