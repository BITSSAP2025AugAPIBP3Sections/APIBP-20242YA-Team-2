const express = require("express");
const router = express.Router();
const discoveryController = require("../controllers/DiscoveryController");
// NOTE: We don't need authentication middleware here yet, as authentication
// is typically handled by the API Gateway before hitting this service.

// This router handles requests prefixed with /recommendations (as defined in server.js)

/**
 * @openapi
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       properties:
 *         event_id:
 *           type: string
 *           description: Unique identifier for the event
 *           example: "evt_123456789"
 *         title:
 *           type: string
 *           description: Event title
 *           example: "Tech Conference 2024"
 *         host_id:
 *           type: string
 *           description: ID of the event host/organizer
 *           example: "org_987654321"
 *         category:
 *           type: string
 *           description: Event category
 *           example: "Technology"
 *         description_keywords:
 *           type: array
 *           items:
 *             type: string
 *           description: Keywords extracted from event description
 *           example: ["tech", "conference", "networking", "innovation"]
 *         recent_rsvps:
 *           type: number
 *           description: Number of recent RSVPs for trending calculation
 *           example: 150
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Event creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Event last update timestamp
 *     
 *     RecommendationResponse:
 *       type: object
 *       properties:
 *         results:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Event'
 *           description: Array of recommended events
 *         message:
 *           type: string
 *           description: Response message
 *           example: "Personalized recommendations based on your interests"
 *         total:
 *           type: number
 *           description: Total number of recommendations
 *           example: 10
 *         user_id:
 *           type: string
 *           description: User ID for personalized recommendations
 *           example: "user_123456789"
 *     
 *     TrendingResponse:
 *       type: object
 *       properties:
 *         results:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Event'
 *           description: Array of trending events
 *         message:
 *           type: string
 *           description: Response message
 *           example: "Top trending events globally"
 *         total:
 *           type: number
 *           description: Total number of trending events
 *           example: 20
 *         last_updated:
 *           type: string
 *           format: date-time
 *           description: When the trending data was last calculated
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 *           example: "Internal server error"
 *         code:
 *           type: number
 *           description: Error code
 *           example: 500
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Error timestamp
 * 
 * tags:
 *   - name: Discovery & Recommendations
 *     description: Event discovery and personalized recommendation endpoints
 */

// ----------------------------------------------------------------------
// 1. GENERAL DISCOVERY (Global Data)
// ----------------------------------------------------------------------

/**
 * @route GET /recommendations/trending
 * @description Retrieves a globally cached list of the most popular events.
 * @access Public
 */

/**
 * @openapi
 * /recommendations/trending:
 *   get:
 *     tags:
 *       - Discovery & Recommendations
 *     summary: Get trending events
 *     description: Retrieves a globally cached list of the most popular events based on recent RSVP activity and engagement metrics
 *     responses:
 *       200:
 *         description: Successfully retrieved trending events
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrendingResponse'
 *             examples:
 *               success:
 *                 summary: Successful response with trending events
 *                 value:
 *                   results:
 *                     - event_id: "evt_123456789"
 *                       title: "Tech Conference 2024"
 *                       host_id: "org_987654321"
 *                       category: "Technology"
 *                       description_keywords: ["tech", "conference", "networking"]
 *                       recent_rsvps: 150
 *                       createdAt: "2024-01-15T10:00:00Z"
 *                       updatedAt: "2024-01-20T15:30:00Z"
 *                     - event_id: "evt_987654321"
 *                       title: "Music Festival Summer"
 *                       host_id: "org_123456789"
 *                       category: "Music"
 *                       description_keywords: ["music", "festival", "outdoor"]
 *                       recent_rsvps: 200
 *                       createdAt: "2024-01-10T08:00:00Z"
 *                       updatedAt: "2024-01-18T12:00:00Z"
 *                   message: "Top trending events globally"
 *                   total: 20
 *                   last_updated: "2024-01-20T16:00:00Z"
 *               empty:
 *                 summary: No trending data available
 *                 value:
 *                   results: []
 *                   message: "No trending data available."
 *                   total: 0
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/trending", discoveryController.getTrendingEvents);

// ----------------------------------------------------------------------
// 2. PERSONALIZED RECOMMENDATIONS (Requires a User ID)
// ----------------------------------------------------------------------

/**
 * @route GET /recommendations/:user_id
 * @description Retrieves a personalized list of recommended events for the user.
 * @access Public (or handled by Gateway auth)
 */

/**
 * @openapi
 * /recommendations/{user_id}:
 *   get:
 *     tags:
 *       - Discovery & Recommendations
 *     summary: Get personalized recommendations
 *     description: Retrieves a personalized list of recommended events for a specific user based on their interests, RSVP history, and followed organizations. Falls back to trending events if no personalized data is available.
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the user
 *         example: "user_123456789"
 *     responses:
 *       200:
 *         description: Successfully retrieved personalized recommendations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecommendationResponse'
 *             examples:
 *               personalized:
 *                 summary: Personalized recommendations available
 *                 value:
 *                   results:
 *                     - event_id: "evt_111222333"
 *                       title: "AI Workshop for Beginners"
 *                       host_id: "org_444555666"
 *                       category: "Technology"
 *                       description_keywords: ["AI", "machine learning", "workshop"]
 *                       recent_rsvps: 75
 *                       createdAt: "2024-01-12T09:00:00Z"
 *                       updatedAt: "2024-01-19T14:00:00Z"
 *                     - event_id: "evt_777888999"
 *                       title: "Startup Networking Event"
 *                       host_id: "org_101112131"
 *                       category: "Business"
 *                       description_keywords: ["startup", "networking", "entrepreneur"]
 *                       recent_rsvps: 120
 *                       createdAt: "2024-01-14T11:00:00Z"
 *                       updatedAt: "2024-01-21T10:00:00Z"
 *                   message: "Personalized recommendations based on your interests"
 *                   total: 15
 *                   user_id: "user_123456789"
 *               fallback_trending:
 *                 summary: Fallback to trending events (cache miss)
 *                 value:
 *                   results:
 *                     - event_id: "evt_123456789"
 *                       title: "Tech Conference 2024"
 *                       host_id: "org_987654321"
 *                       category: "Technology"
 *                       description_keywords: ["tech", "conference", "networking"]
 *                       recent_rsvps: 150
 *                       createdAt: "2024-01-15T10:00:00Z"
 *                       updatedAt: "2024-01-20T15:30:00Z"
 *                   message: "Showing trending events (personalized data not available)"
 *                   total: 20
 *                   user_id: "user_123456789"
 *               cold_start:
 *                 summary: No data available (cold start)
 *                 value:
 *                   results: []
 *                   message: "No personalized or trending recommendations available."
 *                   total: 0
 *                   user_id: "user_123456789"
 *       400:
 *         description: Invalid user ID parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Invalid user ID format"
 *               code: 400
 *               timestamp: "2024-01-20T16:30:00Z"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:user_id", discoveryController.getRecommendations);

module.exports = router;
