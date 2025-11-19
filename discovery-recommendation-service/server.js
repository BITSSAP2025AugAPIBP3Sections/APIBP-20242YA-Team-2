const express = require("express");
const { connectMongoDB, connectRedis } = require("./config/db");
const { runConsumer } = require("./config/kafka");
const discoveryRoutes = require("./routes/DiscoveryRoutes");
const { calculateAndCacheTrending } = require("./workers/recommenderWorker"); // NEW IMPORT
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const PORT = 3003; // DRS Port

app.use(express.json());
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});


// Swagger setup
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Discovery & Recommendation Service API",
      version: "1.0.0",
      description: `API documentation for Discovery & Recommendation Service - provides trending events and personalized recommendations

---

## 📋 API SCOPE

### ✅ SCOPE-IN (What this API covers):
- Trending events discovery (global popularity)
- Personalized event recommendations (user-specific)
- Real-time recommendation calculation
- Redis-based caching for performance
- Kafka-based event data ingestion

### ❌ SCOPE-OUT (What this API does NOT cover):
- **Event creation and management** → Handled by Event Management Service
- **User profile management** → Handled by User & Social Service
- **Event RSVP functionality** → Handled by Event Management Service
- **Event search by text/filters** → Handled by Event Management Service
- **User notifications** → Handled by Notification Service
- **Event analytics and reporting** → Handled by Analytics Service

### 📝 RATIONALE:
This service focuses solely on event discovery and personalized recommendations using machine learning algorithms and caching strategies. It consumes event data via Kafka but does not manage events directly. Search functionality is intentionally excluded as it's better handled by the Event Management Service with direct database access.

---
`,
    },
    servers: [{ url: "http://localhost:3003" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token obtained from login (handled by API Gateway)",
        },
      },
    },
  },
  apis: ["./routes/*.js", "./controllers/*.js"],
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/recommendations", discoveryRoutes);

const RECALC_INTERVAL_MS = 60000 * 30; // Recalculate every 30 minutes
// --- Initialization ---
async function bootstrap() {
  try {
    await connectMongoDB();
    await connectRedis();

    await runConsumer(); // Start Kafka consumer for data ingestion

    // --- NEW: Start the background calculation worker ---
    calculateAndCacheTrending(); // Run immediately on startup
    setInterval(calculateAndCacheTrending, RECALC_INTERVAL_MS); // Run periodically
    // --- END NEW ---

    app.listen(PORT, () => {
      console.log(`Discovery & Recommendation Service running on port ${PORT}`);
      console.log(`Swagger UI available at: http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error("DRS Service failed to start:", err);
    process.exit(1);
  }
}

bootstrap();
