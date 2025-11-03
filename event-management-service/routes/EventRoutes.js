// routes/EventRoutes.js (Updated)

// NOTE: This assumes 'authenticate' and 'authorizeHost' (a custom middleware) are defined.
const express = require("express");
const router = express.Router();
const eventController = require("../controllers/EventController");
const { authenticate } = require("../middleware/auth"); // Import authentication middleware

// ----------------------------------------------------------------------
// 1. PUBLIC READ ENDPOINTS
// ----------------------------------------------------------------------

// Search endpoint is public for general browsing

/**
 * @openapi
 * tags:
 *   - name: Events
 *     description: Event browse and management APIs
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       properties:
 *         event_id: { type: string, format: uuid }
 *         title: { type: string, maxLength: 255 }
 *         description: { type: string }
 *         host_id: { type: string, format: uuid }
 *         date_time: { type: string, format: date-time }
 *         location: { type: string, maxLength: 255 }
 *         attendees_count: { type: integer, minimum: 0 }
 *       required: [event_id, title, host_id, date_time, location, attendees_count]
 *     CreateEventRequest:
 *       type: object
 *       properties:
 *         title: { type: string, maxLength: 255 }
 *         description: { type: string }
 *         date_time: { type: string, format: date-time }
 *         location: { type: string, maxLength: 255 }
 *       required: [title, date_time, location]
 *     UpdateEventRequest:
 *       type: object
 *       properties:
 *         title: { type: string, maxLength: 255 }
 *         description: { type: string }
 *         date_time: { type: string, format: date-time }
 *         location: { type: string, maxLength: 255 }
 *     EventResponse:
 *       type: object
 *       properties:
 *         event_id: { type: string, format: uuid }
 *         message: { type: string }
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *     EventListResponse:
 *       type: array
 *       items: { $ref: '#/components/schemas/Event' }
 */

/**
 * @openapi
 * /events/search:
 *   get:
 *     tags: [Events]
 *     summary: Search events
 *     parameters:
 *       - in: query
 *         name: query
 *         schema: { type: string }
 *         description: Free text search query
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: Filter events from this date onwards
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Event category filter
 *     responses:
 *       200:
 *         description: List of events matching search criteria
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/EventListResponse' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get("/search", eventController.searchEvents);

/**
 * @openapi
 * /events/attending:
 *   get:
 *     tags: [Events]
 *     summary: List events a user is attending
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: User ID whose attending list is requested
 *     responses:
 *       200:
 *         description: Events the user is attending
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/EventListResponse' }
 *       400:
 *         description: Missing or invalid userId
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get("/attending", eventController.getEventsAttending);

/**
 * @openapi
 * /events/created:
 *   get:
 *     tags: [Events]
 *     summary: List events created by a host
 *     parameters:
 *       - in: query
 *         name: hostId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Host user ID
 *     responses:
 *       200:
 *         description: Events created by the host
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/EventListResponse' }
 *       400:
 *         description: Missing or invalid hostId
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get("/created", eventController.getEventsCreated);

/**
 * @openapi
 * /events:
 *   get:
 *     tags: [Events]
 *     summary: Get all events
 *     responses:
 *       200:
 *         description: List of all events
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/EventListResponse' }
 */
router.get("/", eventController.getAllEvents);

// Retrieve single event details is public
// Retrieve single event details is public
/**
 * @openapi
 * /events/{event_id}:
 *   get:
 *     tags: [Events]
 *     summary: Get event by ID
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Event details
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Event' }
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get("/:event_id", eventController.getEvent);

// ----------------------------------------------------------------------
// 2. AUTHENTICATED/AUTHORIZED ENDPOINTS
// ----------------------------------------------------------------------

router.use(authenticate); // All routes below this line require a JWT token

/**
 * @route POST /events
 * @description Creates a new event (Authenticated User is the Host).
 */

/**
 * @openapi
 * /events:
 *   post:
 *     tags: [Events]
 *     summary: Create a new event
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateEventRequest' }
 *     responses:
 *       201:
 *         description: Event created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/EventResponse' }
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post("/", eventController.createEvent);

/**
 * @route PUT /events/:event_id
 * @description Updates an existing event. Authorization check happens *inside* the controller.
 */

/**
 * @openapi
 * /events/{event_id}:
 *   put:
 *     tags: [Events]
 *     summary: Update an event
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateEventRequest' }
 *     responses:
 *       200:
 *         description: Event updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       400:
 *         description: No changes made or invalid fields provided
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Forbidden - Not the event host
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.put("/:event_id", eventController.updateEvent);

/**
 * @route DELETE /events/:event_id
 * @description Deletes an event. Authorization check happens *inside* the controller.
 */

/**
 * @openapi
 * /events/{event_id}:
 *   delete:
 *     tags: [Events]
 *     summary: Delete an event
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Event deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Forbidden - Not the event host
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.delete("/:event_id", eventController.deleteEventById);

/**
 * @route POST /events/:event_id/rsvp
 * @description Records a user's participation in an event.
 * @access Authenticated (The user_id is taken from the token)
 */

/**
 * @openapi
 * /events/{event_id}/rsvp:
 *   post:
 *     tags: [Events]
 *     summary: RSVP to an event
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: RSVP recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: User is already registered for this event
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post("/:event_id/rsvp", eventController.rsvpToEvent);

/**
 * @route DELETE /events/:event_id/rsvp
 * @description Removes a user's participation record (cancels RSVP).
 * @access Authenticated
 */

/**
 * @openapi
 * /events/{event_id}/rsvp:
 *   delete:
 *     tags: [Events]
 *     summary: Cancel RSVP
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: RSVP cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: RSVP not found for this user and event
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.delete("/:event_id/rsvp", eventController.cancelRsvp);

/**
 * @openapi
 * /events/{event_id}/rsvp-status:
 *   get:
 *     tags: [Events]
 *     summary: Check current user's RSVP status for an event
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: RSVP status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isRsvped:
 *                   type: boolean
 */
router.get('/:event_id/rsvp-status', authenticate, eventController.checkRsvpStatus);


module.exports = router;
