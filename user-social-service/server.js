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
      description: 'API documentation for User & Social Service'
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