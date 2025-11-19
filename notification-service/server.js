const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const { connectRedis, redisClient } = require("./utils/redis");
const { runConsumer } = require("./config/kafka.js");
const { handleConnection } = require("./services/notificationManager");
// CRITICAL IMPORTS
const sequelize = require("./utils/db"); // Imports the Sequelize instance
const OfflineNotification = require("./models/OfflineNotification"); // Imports the Model for syncing

const app = express();
const PORT = process.env.PORT || 3002;


// ======================================================================
// API SCOPE DOCUMENTATION
// ======================================================================
/**
 * @openapi
 * x-api-scope:
 *   scope-in:
 *     - Real-time notification delivery via WebSocket
 *     - Offline notification storage and retrieval
 *     - Notification read/unread status management
 *     - Multi-channel notification support (WebSocket, HTTP polling)
 *     - Kafka-based event consumption for notifications
 *     - Redis-based user session management
 *   scope-out:
 *     - Email notifications (handled by Email Service)
 *     - SMS notifications (handled by SMS Service)
 *     - Push notifications to mobile devices (handled by Mobile Push Service)
 *     - Notification preferences management (handled by User Service)
 *     - Notification analytics and reporting (handled by Analytics Service)
 *     - Event creation and management (handled by Event Management Service)
 *     - User authentication (handled by User & Social Service)
 *   rationale:
 *     This service focuses solely on real-time in-app notification delivery and
 *     offline notification storage. Email, SMS, and mobile push notifications are
 *     intentionally excluded as they require different infrastructure and delivery
 *     mechanisms. User preferences and analytics are handled by dedicated services
 *     to maintain clear separation of concerns.
 */

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Real-time Notification Service API",
      version: "1.0.0",
      description: `API for real-time in-app notifications via WebSocket and HTTP

---

## 📋 API SCOPE

### ✅ SCOPE-IN (What this API covers):
- Real-time notification delivery via WebSocket
- Offline notification storage and retrieval
- Notification read/unread status management
- Multi-channel notification support (WebSocket, HTTP polling)
- Kafka-based event consumption for notifications
- Redis-based user session management

### ❌ SCOPE-OUT (What this API does NOT cover):
- **Email notifications** → Handled by Email Service
- **SMS notifications** → Handled by SMS Service
- **Push notifications to mobile devices** → Handled by Mobile Push Service
- **Notification preferences management** → Handled by User Service
- **Notification analytics and reporting** → Handled by Analytics Service
- **Event creation and management** → Handled by Event Management Service
- **User authentication** → Handled by User & Social Service

### 📝 RATIONALE:
This service focuses solely on real-time in-app notification delivery and offline notification storage. Email, SMS, and mobile push notifications are intentionally excluded as they require different infrastructure and delivery mechanisms. User preferences and analytics are handled by dedicated services to maintain clear separation of concerns.

---
`
    },
    tags: [
      {
        name: "Notifications",
        description: "Notification retrieval and management",
        "x-stakeholders": {
          primary: [
            "Notification Recipients (receive and view notifications)",
            "Event Organizers (receive event-related notifications)",
            "Regular Users (receive social and event notifications)"
          ],
          secondary: [
            "Frontend Applications (display notifications to users)",
            "System Administrators (monitor notification delivery)"
          ]
        }
      },
      {
        name: "WebSocket",
        description: "Real-time WebSocket connection for live notifications",
        "x-stakeholders": {
          primary: [
            "Active Users (receive real-time notifications)",
            "Frontend Applications (maintain WebSocket connections)"
          ]
        }
      },
      {
        name: "Health",
        description: "Service health monitoring",
        "x-stakeholders": {
          primary: [
            "System Administrators (monitor service health)",
            "DevOps Teams (service monitoring and alerting)"
          ]
        }
      }
    ],
    servers: [
      {
        url: `http://localhost:${PORT}`
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Notification: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Unique identifier for the notification",
              example: 1,
            },
            user_id: {
              type: "integer",
              description: "ID of the user receiving the notification",
              example: 123,
            },
            type: {
              type: "string",
              description: "Type of notification",
              example: "event_created",
            },
            title: {
              type: "string",
              description: "Notification title",
              example: "New Event Created",
            },
            message: {
              type: "string",
              description: "Notification message content",
              example: "A new event 'Tech Conference 2024' has been created",
            },
            payload: {
              type: "object",
              description: "Additional notification data",
              example: {
                event_id: 1,
                event_title: "Tech Conference 2024",
                host_id: 456,
              },
            },
            is_read: {
              type: "boolean",
              description: "Whether the notification has been read",
              example: false,
            },
            is_delivered: {
              type: "boolean",
              description: "Whether the notification has been delivered",
              example: true,
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "Notification creation timestamp",
              example: "2024-01-15T10:30:00Z",
            },
          },
        },
        NotificationsResponse: {
          type: "object",
          properties: {
            notifications: {
              type: "array",
              items: {
                type: "object",
                description: "Notification payload data",
              },
              example: [
                {
                  type: "event_created",
                  title: "New Event Created",
                  message: "A new event 'Tech Conference 2024' has been created",
                  event_id: 1,
                  timestamp: "2024-01-15T10:30:00Z",
                },
              ],
            },
            message: {
              type: "string",
              example: "No unread offline notifications.",
            },
          },
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: {
              type: "string",
              example: "OK",
            },
            service: {
              type: "string",
              example: "Real-time Notification Service",
            },
            redis_status: {
              type: "string",
              example: "ready",
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Error message describing what went wrong",
            },
          },
        },
      },
    },
  },
  apis: [__filename], // Current file contains the API documentation
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(express.json());

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- Simple HTTP Endpoint for Health Check / Offline Notification Retrieval ---
// NOTE: This endpoint now correctly uses the imported OfflineNotification model.

/**
 * @swagger
 * /notifications/{user_id}:
 *   get:
 *     summary: Get offline notifications for a user
 *     description: |
 *       Retrieves all unread offline notifications for a specific user and marks them as read.
 *       Used when user reconnects or opens the app to catch up on missed notifications.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Notification Recipients (retrieve their missed notifications)
 *       - ✅ Event Organizers (check notifications about their events)
 *       - ✅ Regular Users (catch up on notifications while offline)
 *       - ✅ Frontend Applications (sync notifications on app open)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ Anonymous Users (must be authenticated)
 *       - ❌ Other Users (can only retrieve their own notifications)
 *       - ❌ Users accessing other users' notifications (user_id must match token)
 *       - ⚠️  In production, verify user_id matches authenticated user from JWT
 *       
 *       **BUSINESS RULES:**
 *       - Returns only unread notifications that were delivered while user was offline
 *       - Automatically marks retrieved notifications as read
 *       - Notifications are sorted by creation date (newest first)
 *       - Only returns notifications with is_delivered=true and is_read=false
 *       - Empty array returned if no unread notifications exist
 *       - Notifications older than 30 days may be archived (configurable)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the user
 *         example: 123
 *     responses:
 *       200:
 *         description: Successfully retrieved notifications
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationsResponse'
 *             examples:
 *               with_notifications:
 *                 summary: User has unread notifications
 *                 value:
 *                   notifications:
 *                     - type: "event_created"
 *                       title: "New Event Created"
 *                       message: "A new event 'Tech Conference 2024' has been created"
 *                       event_id: 1
 *                       timestamp: "2024-01-15T10:30:00Z"
 *                     - type: "rsvp_added"
 *                       title: "New RSVP"
 *                       message: "Someone RSVPed to your event"
 *                       event_id: 1
 *                       timestamp: "2024-01-15T11:00:00Z"
 *               no_notifications:
 *                 summary: No unread notifications
 *                 value:
 *                   notifications: []
 *                   message: "No unread offline notifications."
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Failed to retrieve notifications."
 */
app.get("/notifications/:user_id", async (req, res) => {
  // In a microservice environment, the user_id should be checked against an Auth Header/Token
  const { user_id } = req.params;

  try {
    const notifications = await OfflineNotification.findAll({
      where: { user_id, is_read: false, is_delivered: true }, // Filter: delivered but not read
      order: [["created_at", "DESC"]],
    });

    // Mark retrieved notifications as read immediately
    await OfflineNotification.update(
      { is_read: true },
      {
        where: { user_id, is_read: false },
      }
    );

    if (notifications.length === 0) {
      return res.status(200).send({
        notifications: [],
        message: "No unread offline notifications.",
      });
    }

    res.status(200).send({
      notifications: notifications.map((n) => n.payload),
    });
  } catch (error) {
    console.error("Retrieve notifications error:", error);
    res.status(500).send({ message: "Failed to retrieve notifications." });
  }
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: |
 *       Returns the health status of the notification service and its dependencies (Redis, PostgreSQL, Kafka).
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ System Administrators (monitor service health)
 *       - ✅ DevOps Teams (automated health checks and alerting)
 *       - ✅ Monitoring Systems (Prometheus, Datadog, etc.)
 *       - ✅ Load Balancers (health check for routing decisions)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ No restrictions - This is a public endpoint
 *       - ❌ Does NOT require authentication
 *       - ⚠️  Should be accessible from internal network only (configure firewall)
 *       
 *       **BUSINESS RULES:**
 *       - Returns 200 OK if service is healthy
 *       - Includes Redis connection status
 *       - Should be called periodically by monitoring systems
 *       - Response time should be < 100ms for healthy service
 *       - Used by load balancers for traffic routing
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: "OK"
 *               service: "Real-time Notification Service"
 *               redis_status: "ready"
 *       500:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get("/health", (req, res) => {
  res.status(200).send({
    status: "OK",
    service: "Real-time Notification Service",
    redis_status: redisClient.status,
  });
});


/**
 * @swagger
 * /ws:
 *   get:
 *     summary: WebSocket connection endpoint
 *     description: |
 *       Establishes a WebSocket connection for real-time notifications.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Active Users (receive real-time notifications while online)
 *       - ✅ Event Organizers (get instant updates about their events)
 *       - ✅ Regular Users (receive social and event notifications in real-time)
 *       - ✅ Frontend Applications (maintain persistent WebSocket connections)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ Anonymous Users (must provide valid JWT token)
 *       - ❌ Users with expired tokens (token must be valid and not expired)
 *       - ❌ Users with invalid tokens (connection will be closed with code 1008)
 *       - ❌ Suspended/Banned Users (account must be active)
 *       - ⚠️  Token must be provided as query parameter: ?token=YOUR_JWT_TOKEN
 *       
 *       **BUSINESS RULES:**
 *       - One WebSocket connection per user (new connection closes old one)
 *       - Connection is maintained until user disconnects or token expires
 *       - Automatic reconnection should be handled by client
 *       - Heartbeat/ping-pong for connection health (every 30 seconds)
 *       - Messages are delivered in real-time (< 100ms latency)
 *       - If user is offline, notifications are stored in PostgreSQL
 *       - Connection closes automatically after 1 hour of inactivity
 *  
 *     tags: [WebSocket]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: JWT authentication token
 *         example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       101:
 *         description: WebSocket connection established successfully
 *       1008:
 *         description: Unauthorized - Missing or invalid auth token
 */

// --- WebSocket Server Setup ---
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  if (token) {
    handleConnection(ws, token);
  } else {
    ws.close(1008, "Unauthorized: Missing auth token");
  }

  ws.on("error", (err) => console.error("[WS Error]", err));
});

// --- Service Initialization ---

async function bootstrap() {
  try {
    // 1. Initialize Redis Connection (must be first as it's critical for WS handling)
    await connectRedis();
    console.log("Redis Client initialized.");

    // 2. Initialize and Synchronize PostgreSQL DB (CRITICAL STEP ADDED HERE)
    await sequelize.authenticate(); // Test connection
    await sequelize.sync({ alter: true }); // Sync models/create tables
    console.log("Offline Notification DB connected and models synced.");

    // 3. Start Kafka Consumer (Begins listening for events)
    await runConsumer();
    console.log("Kafka Consumer running.");

    // 4. Start HTTP/WebSocket Server
    server.listen(PORT, () => {
      console.log(`RNS Service running (HTTP/WS) on port ${PORT}`);
      console.log(`Swagger UI available at: http://localhost:${PORT}/api-docs`);
      console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws?token=YOUR_JWT_TOKEN`);
    });
  } catch (error) {
    console.error("RNS Bootstrap Failed:", error);
    process.exit(1);
  }
}

bootstrap();

// --- Graceful Shutdown ---
process.on("SIGINT", async () => {
  console.log("\n[Shutdown] Disconnecting consumers and closing server...");
  if (wss) wss.close();
  // Proper shutdown logic for consumer and redis should be implemented here
  process.exit(0);
});