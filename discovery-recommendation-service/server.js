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
      description: "API documentation for Discovery & Recommendation Service - provides trending events and personalized recommendations",
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
