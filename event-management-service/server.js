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
            description: `API documentation for Event Management Service

---

## 📋 API SCOPE

### ✅ SCOPE-IN (What this API covers):
- Event CRUD operations (Create, Read, Update, Delete)
- Event search and discovery
- RSVP management (register/cancel attendance)
- Event listing by host or attendee
- Public event browsing without authentication

### ❌ SCOPE-OUT (What this API does NOT cover):
- **Event payment processing** → Handled by Payment Service
- **Event ticket generation** → Handled by Ticketing Service
- **Event analytics and reporting** → Handled by Analytics Service
- **Event notifications** → Handled by Notification Service
- **Event recommendations** → Handled by Discovery & Recommendation Service
- **Social sharing features** → Handled by User & Social Service

### 📝 RATIONALE:
This service focuses solely on event lifecycle management and attendance tracking. Payment, ticketing, and notification features are intentionally excluded to maintain service boundaries and follow microservices architecture principles.

---
`,
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