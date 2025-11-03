const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const express = require("express");
const axios = require("axios");
const gql = require("graphql-tag");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");


// --- CONFIGURATION (Internal Service Addresses) ---
const USS_URL = process.env.USS_URL || "http://user-social-service:80";
const EMS_URL = process.env.EMS_URL || "http://event-management-service:80";
const DRS_URL =
  process.env.DRS_URL || "http://discovery-recommendation-service:80";

// --- HELPER FUNCTION: Standardizes User data output ---
const mapUser = (data) => ({
  id: data.user_id || data.id,
  username: data.username,
  // bio: data.bio,
  isOrganization: data.is_organization ?? false,
  followersCount: data.followers_count ?? 0,
});


// --- TYPE DEFINITIONS (SCHEMA) ---
const typeDefs = gql`
  # 1. Base Types (User and Organization)
  type User {
    id: ID!
    username: String!
    bio: String
    isOrganization: Boolean!
    followersCount: Int
    # Note: 'following' resolver is omitted for brevity but would require a separate REST call
    # following: [User] 
    recommendations: [Event!]
    
    # NEW FIELDS FOR USER DASHBOARD:
    attendingEvents: [Event!]
    createdEvents: [Event!]
  }

  # 2. Event Types
  type Event {
    id: ID!
    title: String!
    description: String
    location: String
    dateTime: String!
    attendeesCount: Int
    host: User! # Nested Type (The host's full public profile)
    isAttending(requesterId: ID!): Boolean! # <--- NEW FIELD FOR RSVP CHECK
  }

  # 3. Root Queries (Entry Points)
  type Query {
    event(id: ID!): Event
    user(id: ID!): User
    trendingEvents: [Event!]
    searchEvents(query: String): [Event!]
  }
`;

// --- RESOLVER LOGIC (DATA FETCHING) ---
const resolvers = {
  Query: {
    // 1. Fetch Event by ID (Calls EMS)
    event: async (_, { id }) => {
      try {
        const response = await axios.get(`${EMS_URL}/events/${id}`);
        return response.data;
      } catch (e) {
        console.error("EMS Event Fetch Failed:", e.message);
        throw new Error(`Failed to fetch event with ID ${id}`);
      }
    },

    // 2. Fetch User by ID (Calls USS)
    user: async (_, { id }) => {
      try {
        // USS URL structure: /users/:id
        const response = await axios.get(`${USS_URL}/users/${id}`);
        return mapUser(response.data); // Use mapper to standardize output
      } catch (e) {
        console.error("USS User Fetch Failed:", e.message);
        throw new Error(`Failed to fetch user with ID ${id}`);
      }
    },

    // 3. Trending Events (Calls DRS, then calls EMS for detail)
    trendingEvents: async () => {
      try {
        const summaryResponse = await axios.get(`${DRS_URL}/recommendations/trending`);
        const eventSummaries = summaryResponse.data.results;
        return eventSummaries

      } catch (e) {
        console.error("DRS Trending Fetch Failed:", e.message);
        return [];
      }
    },

    // 4. Search Events (Calls EMS REST endpoint)
    searchEvents: async (_, { query }) => {
        try {
            const response = await axios.get(`${EMS_URL}/events/search?query=${query}`);
            // console.log(response,"data returned..from search")
            return response.data;
        } catch (e) {
            console.error("EMS Search Failed:", e.message);
            return [];
        }
    }
  },

  Event: {
    id: (parent) => parent.event_id || parent.id,
    dateTime: (parent) => parent.date_time,
    attendeesCount : (parent) => parent.attendees_count,
    host: async (parent) => {
      const hostId = parent.host_id;
      if (!hostId) return null;
      try {
        const response = await axios.get(`${USS_URL}/users/${hostId}`);
        return mapUser(response.data); 
      } catch (e) {
        console.error(`Error fetching host profile ${hostId}:`, e.message);
        return null;
      }
    },
    
    // Resolver for 'isAttending': Checks user's RSVP status via EMS
    isAttending: async (parent, args) => {
        const eventId = parent.event_id || parent.id;
        const requesterId = args.requesterId; 

        if (!requesterId) return false; 
        
        try {
            const response = await axios.get(
                `${EMS_URL}/events/${eventId}/rsvp-status`,
                { headers: { 'X-User-ID': requesterId } }
            );
            return response.data.isRsvped;
        } catch (e) {
            console.error(`Error checking attendance for ${requesterId} on event ${eventId}:`, e.message);
            return false;
        }
    }
  },

  User: {
    recommendations: async (parent) => {
      const userId = parent.user_id || parent.id; 
      if (!userId) return [];
      try {
        const response = await axios.get(`${DRS_URL}/recommendations/${userId}`);
        const eventSummaries = response.data.results || [];

        const eventPromises = eventSummaries.map(async (summary) => {
            try {
                const detailResponse = await axios.get(`${EMS_URL}/events/${summary.id || summary.event_id}`);
                return detailResponse.data;
            } catch (e) {
                console.warn(`Skipping recommendation ${summary.id}: Could not fetch details.`);
                return null;
            }
        });

        return (await Promise.all(eventPromises)).filter(Boolean);

      } catch (e) {
        console.error(`Error fetching recommendations for user ${userId}:`, e.message);
        return [];
      }
    },
    
    // NEW RESOLVER: Attending Events (MyEventsScreen tab)
    attendingEvents: async (parent) => {
        const userId = parent.user_id || parent.id;
        if (!userId) return [];
        try {
            const response = await axios.get(`${EMS_URL}/events/attending?userId=${userId}`);
            return response.data; // EMS should return an array of Event objects
        } catch (e) {
            console.error(`Error fetching attending events for ${userId}:`, e.message);
            return [];
        }
    },
    
    // NEW RESOLVER: Created Events (MyEventsScreen tab)
    createdEvents: async (parent) => {
        const userId = parent.user_id || parent.id;
        if (!userId) return [];
        try {
            // Assumes EMS has a REST endpoint: GET /events/created?hostId=...
            const response = await axios.get(`${EMS_URL}/events/created?hostId=${userId}`);
            return response.data; // EMS should return an array of Event objects
        } catch (e) {
            console.error(`Error fetching created events for ${userId}:`, e.message);
            return [];
        }
    }
  },
};

// --- STARTUP ---

const server = new ApolloServer({ typeDefs, resolvers });
const app = express();
const PORT = 3004;


// --- Swagger/OpenAPI setup (for operational REST endpoints) ---
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "GraphQL Gateway Service API",
      version: "1.0.0",
      description:
        "Gateway microservice exposing a GraphQL endpoint at /graphql. This OpenAPI spec documents operational REST endpoints (e.g. health).",
    },
    servers: [{ url: "http://localhost:3004" }],
  },
  apis: ["./server.js"],
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @openapi
 * components:
 *   schemas:
 *     GraphQLRequest:
 *       type: object
 *       required: [query]
 *       properties:
 *         query:
 *           type: string
 *           description: GraphQL query or mutation string
 *           example: |
 *             query GetEvent($id: ID!) {
 *               event(id: $id) {
 *                 id
 *                 title
 *                 description
 *                 location
 *                 dateTime
 *                 attendeesCount
 *                 host { id username isOrganization }
 *               }
 *             }
 *         variables:
 *           type: object
 *           additionalProperties: true
 *           nullable: true
 *           example: { "id": "123" }
 *         operationName:
 *           type: string
 *           nullable: true
 *           example: GetEvent
 *     GraphQLErrorLocation:
 *       type: object
 *       properties:
 *         line:
 *           type: integer
 *         column:
 *           type: integer
 *     GraphQLError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         locations:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/GraphQLErrorLocation'
 *         path:
 *           type: array
 *           items:
 *             oneOf:
 *               - type: string
 *               - type: integer
 *     GraphQLResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           nullable: true
 *           description: GraphQL response data following the schema for queried fields
 *           example:
 *             event: { id: "123", title: "Hackathon", attendeesCount: 42 }
 *         errors:
 *           type: array
 *           nullable: true
 *           items:
 *             $ref: '#/components/schemas/GraphQLError'
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         username:
 *           type: string
 *         isOrganization:
 *           type: boolean
 *     Event:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         title: { type: string }
 *         description: { type: string, nullable: true }
 *         location: { type: string, nullable: true }
 *         dateTime: { type: string }
 *         attendeesCount: { type: integer }
 *         host: { $ref: '#/components/schemas/User' }
 */
/**
 * @openapi
 * /graphql:
 *   post:
 *     summary: Execute a GraphQL operation
 *     description: |
 *       Send a GraphQL query or mutation. The GraphQL schema includes types `User`, `Event`, and root queries `event`, `user`, `trendingEvents`, `searchEvents`.
 *
 *       Example queries:
 *
 *       - Get event by ID:
 *         
 *         query GetEvent($id: ID!) {\n  event(id: $id) { id title description host { id username } }\n}
 *
 *       - Get user with recommendations:
 *         
 *         query GetUser($id: ID!) {\n  user(id: $id) { id username isOrganization recommendations { id title } }\n}
 *     tags:
 *       - GraphQL
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GraphQLRequest'
 *           examples:
 *             getEvent:
 *               summary: Fetch a single event
 *               value:
 *                 query: |
 *                   query GetEvent($id: ID!) {
 *                     event(id: $id) {
 *                       id
 *                       title
 *                       description
 *                       host { id username }
 *                     }
 *                   }
 *                 variables: { id: "123" }
 *                 operationName: GetEvent
 *             trending:
 *               summary: Trending events
 *               value:
 *                 query: |
 *                   query Trending {
 *                     trendingEvents { id title attendeesCount }
 *                   }
 *     responses:
 *       200:
 *         description: GraphQL execution result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GraphQLResponse'
 *             examples:
 *               success:
 *                 summary: Successful response
 *                 value:
 *                   data:
 *                     event:
 *                       id: "123"
 *                       title: "Hackathon"
 *                       description: "24-hour coding event"
 *                       host:
 *                         id: "u1"
 *                         username: "alice"
 *               error:
 *                 summary: Response with errors
 *                 value:
 *                   errors:
 *                     - message: "Field 'evnt' not found on type 'Query'"
 *                       locations: [{ line: 1, column: 8 }]
  *       400:
  *         description: Invalid GraphQL request (syntax error, missing query, or invalid variables)
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/GraphQLResponse'
  *             examples:
  *               syntaxError:
  *                 summary: GraphQL syntax error
  *                 value:
  *                   errors:
  *                     - message: "Syntax Error: Expected Name, found '}'"
  *                       locations: [{ line: 1, column: 20 }]
  *               missingQuery:
  *                 summary: Missing query field
  *                 value:
  *                   errors:
  *                     - message: "Must provide query string."
  *       500:
  *         description: Internal server error while processing the GraphQL operation
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/GraphQLResponse'
  *             examples:
  *               upstreamFailure:
  *                 summary: Downstream service failed
  *                 value:
  *                   errors:
  *                     - message: "Failed to fetch event with ID 123"
 */
/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     description: Returns service health status.
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
  *       503:
  *         description: Service is not ready or unhealthy
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 status:
  *                   type: string
  *                   example: unhealthy
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

async function startApolloServer() {
  await server.start();
  
  app.use(
    '/graphql',
    express.json(), 
    expressMiddleware(server)
  );

  app.listen({ port: PORT }, () => {
    console.log(`GraphQL Gateway Service ready at http://localhost:${PORT}/graphql`);
  });
  console.log(
      `Swagger UI available at: http://localhost:3004/api-docs`
    );
    console.log(
      `Health check available at: http://localhost:3004/health`
    );
}

startApolloServer();