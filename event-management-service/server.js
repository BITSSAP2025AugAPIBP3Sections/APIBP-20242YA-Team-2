const express = require('express');
const eventRoutes = require('./routes/EventRoutes');
const sequelize = require('./utils/db');
const { connectProducer } = require('./config/kafka'); 
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const app = express();
const PORT = 3001; // Use a different port than USS (3000)

app.use(express.json());

// Swagger setup
const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Event Management Service API',
            version: '1.0.0',
            description: 'API documentation for Event Management Service',
        },
        servers: [
            { url: 'http://localhost:3001' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter JWT token obtained from login'
                }
            }
        }
    },
    apis: ['./routes/*.js', './controllers/*.js'],
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/events', eventRoutes);

sequelize.sync({ alter: true })
    .then(() => {
        console.log('Event DB connected and models synced.');
        return connectProducer(); 
    })

    .then(() => {
        app.listen(PORT, () => {
            console.log(`Event Management Service running on port ${PORT}`);
            console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
        });
    })
    .catch(err => {
        console.error('Service failed to start:', err);
        process.exit(1);
    });