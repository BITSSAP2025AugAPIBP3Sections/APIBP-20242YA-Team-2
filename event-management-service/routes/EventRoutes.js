// routes/EventRoutes.js (Enhanced with Stakeholder Documentation)

const express = require("express");
const router = express.Router();
const eventController = require("../controllers/EventController");
const { authenticate } = require("../middleware/auth");

// ======================================================================
// API SCOPE DOCUMENTATION
// ======================================================================
/**
 * @openapi
 * x-api-scope:
 *   scope-in:
 *     - Event CRUD operations (Create, Read, Update, Delete)
 *     - Event search and discovery
 *     - RSVP management (register/cancel attendance)
 *     - Event listing by host or attendee
 *     - Public event browsing without authentication
 *   scope-out:
 *     - Event payment processing (handled by separate Payment Service)
 *     - Event ticket generation (handled by Ticketing Service)
 *     - Event analytics and reporting (handled by Analytics Service)
 *     - Event notifications (handled by Notification Service)
 *     - Event recommendations (handled by Discovery & Recommendation Service)
 *     - Social sharing features (handled by User & Social Service)
 *   rationale:
 *     This service focuses solely on event lifecycle management and attendance tracking.
 *     Payment, ticketing, and notification features are intentionally excluded to maintain
 *     service boundaries and follow microservices architecture principles.
 */

/**
 * @openapi
 * tags:
 *   - name: Events
 *     description: Event browse and management APIs
 *     x-stakeholders:
 *       primary:
 *         - Event Organizers (create and manage events)
 *         - Event Attendees (browse and RSVP to events)
 *       secondary:
 *         - System Administrators (monitor event data)
 *         - Marketing Teams (analyze event trends)
 * 
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

// ======================================================================
// PUBLIC READ ENDPOINTS
// ======================================================================

/**
 * @openapi
 * /events/search:
 *   get:
 *     tags: [Events]
 *     summary: Search events
 *     description: |
 *       Search for events using various filters like query text, date, and category.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Event Attendees (browse events to attend)
 *       - ✅ Event Organizers (research similar events)
 *       - ✅ Anonymous Users (discover events without login)
 *       - ✅ Marketing Teams (analyze event landscape)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ No restrictions - This is a public endpoint
 *       - ❌ Does NOT require authentication
 *       - ❌ Does NOT require any special permissions
 *       
 *       **BUSINESS RULES:**
 *       - Returns only published/active events
 *       - Results are paginated (default 50 per page)
 *       - Search is case-insensitive
 *     parameters:
 *       - in: query
 *         name: query
 *         schema: { type: string }
 *         description: Free text search query (searches title and description)
 *         example: "tech conference"
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: Filter events from this date onwards
 *         example: "2024-02-01"
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Event category filter
 *         example: "Technology"
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
 *     description: |
 *       Retrieve all events that a specific user has RSVP'd to attend.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Event Attendees (view their own attendance list)
 *       - ✅ Event Organizers (see who's attending their events)
 *       - ✅ System Administrators (monitor user activity)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ Anonymous Users (must provide valid userId)
 *       - ❌ Does NOT require authentication (public profile data)
 *       - ⚠️  Note: In production, consider adding privacy controls
 *       
 *       **BUSINESS RULES:**
 *       - Returns only future events (past events excluded by default)
 *       - Includes cancelled events if user hasn't withdrawn RSVP
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: User ID whose attending list is requested
 *         example: "123e4567-e89b-12d3-a456-426614174000"
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
 *     description: |
 *       Retrieve all events created by a specific event organizer/host.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Event Organizers (view their own created events)
 *       - ✅ Event Attendees (browse events by specific organizer)
 *       - ✅ Marketing Teams (analyze organizer activity)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ No restrictions - This is a public endpoint
 *       - ❌ Does NOT require authentication
 *       - ⚠️  Shows only published events (drafts are hidden)
 *       
 *       **BUSINESS RULES:**
 *       - Returns events in chronological order (upcoming first)
 *       - Includes past events for historical reference
 *     parameters:
 *       - in: query
 *         name: hostId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Host user ID
 *         example: "456e7890-e89b-12d3-a456-426614174001"
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
 *     description: |
 *       Retrieve a list of all published events in the system.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Event Attendees (browse all available events)
 *       - ✅ Anonymous Users (discover events)
 *       - ✅ System Administrators (monitor event catalog)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ No restrictions - This is a public endpoint
 *       - ⚠️  Results are paginated to prevent performance issues
 *       
 *       **BUSINESS RULES:**
 *       - Returns only active/published events
 *       - Sorted by creation date (newest first)
 *       - Maximum 100 events per request
 *     responses:
 *       200:
 *         description: List of all events
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/EventListResponse' }
 */
router.get("/", eventController.getAllEvents);

/**
 * @openapi
 * /events/{event_id}:
 *   get:
 *     tags: [Events]
 *     summary: Get event by ID
 *     description: |
 *       Retrieve detailed information about a specific event.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Event Attendees (view event details before RSVP)
 *       - ✅ Event Organizers (preview their event page)
 *       - ✅ Anonymous Users (browse event details)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ No restrictions - This is a public endpoint
 *       - ❌ Does NOT require authentication
 *       
 *       **BUSINESS RULES:**
 *       - Returns full event details including attendee count
 *       - Includes host information
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Unique event identifier
 *         example: "789e0123-e89b-12d3-a456-426614174002"
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

// ======================================================================
// AUTHENTICATED/AUTHORIZED ENDPOINTS
// ======================================================================

router.use(authenticate); // All routes below require JWT token

/**
 * @openapi
 * /events:
 *   post:
 *     tags: [Events]
 *     summary: Create a new event
 *     description: |
 *       Create a new event. The authenticated user becomes the event host/organizer.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Event Organizers (create events they will host)
 *       - ✅ Organizations (create events on behalf of their organization)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ Anonymous Users (must be authenticated)
 *       - ❌ Suspended/Banned Users (account must be in good standing)
 *       - ❌ Unverified Users (email verification may be required)
 *       - ⚠️  Rate limits apply (max 10 events per hour per user)
 *       
 *       **BUSINESS RULES:**
 *       - User creating the event automatically becomes the host
 *       - Event date must be in the future
 *       - Title and location are mandatory
 *       - Host can create unlimited events (subject to rate limits)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateEventRequest' }
 *           example:
 *             title: "Annual Tech Summit 2024"
 *             description: "Join us for the biggest tech event of the year"
 *             date_time: "2024-06-15T09:00:00Z"
 *             location: "San Francisco Convention Center"
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/EventResponse' }
 *       400:
 *         description: Missing required fields or invalid data
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
 * @openapi
 * /events/{event_id}:
 *   put:
 *     tags: [Events]
 *     summary: Update an event
 *     description: |
 *       Update an existing event. Only the event host can modify their event.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Event Organizers (update their own events)
 *       - ✅ System Administrators (modify any event if needed)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ Anonymous Users (must be authenticated)
 *       - ❌ Event Attendees (cannot modify events they don't host)
 *       - ❌ Other Event Organizers (can only modify their own events)
 *       - ❌ Users who are not the event host
 *       
 *       **BUSINESS RULES:**
 *       - Only the original host can update the event
 *       - Cannot change host_id after creation
 *       - Cannot update events that have already ended
 *       - Attendees are notified of significant changes
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Event ID to update
 *         example: "789e0123-e89b-12d3-a456-426614174002"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateEventRequest' }
 *           example:
 *             title: "Annual Tech Summit 2024 - Updated"
 *             date_time: "2024-06-16T09:00:00Z"
 *     responses:
 *       200:
 *         description: Event updated successfully
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
 * @openapi
 * /events/{event_id}:
 *   delete:
 *     tags: [Events]
 *     summary: Delete an event
 *     description: |
 *       Permanently delete an event. Only the event host can delete their event.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Event Organizers (delete their own events)
 *       - ✅ System Administrators (remove inappropriate events)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ Anonymous Users (must be authenticated)
 *       - ❌ Event Attendees (cannot delete events they're attending)
 *       - ❌ Other Event Organizers (can only delete their own events)
 *       - ❌ Users who are not the event host
 *       
 *       **BUSINESS RULES:**
 *       - Only the original host can delete the event
 *       - All attendees are notified of cancellation
 *       - RSVPs are automatically cancelled
 *       - Deletion is permanent and cannot be undone
 *       - Consider using "cancel" status instead of deletion for events with attendees
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Event ID to delete
 *         example: "789e0123-e89b-12d3-a456-426614174002"
 *     responses:
 *       200:
 *         description: Event deleted successfully
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
 * @openapi
 * /events/{event_id}/rsvp:
 *   post:
 *     tags: [Events]
 *     summary: RSVP to an event
 *     description: |
 *       Register attendance for an event. User must be authenticated.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Event Attendees (register to attend events)
 *       - ✅ Regular Users (RSVP to events they're interested in)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ Anonymous Users (must be authenticated)
 *       - ❌ Event Hosts (cannot RSVP to their own events - they're already attending)
 *       - ❌ Banned Users (account must be in good standing)
 *       - ❌ Users who already RSVP'd (duplicate RSVPs not allowed)
 *       
 *       **BUSINESS RULES:**
 *       - User ID is extracted from JWT token
 *       - Cannot RSVP to past events
 *       - Cannot RSVP twice to the same event
 *       - Host is automatically considered attending (no RSVP needed)
 *       - RSVP count is incremented immediately
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Event ID to RSVP to
 *         example: "789e0123-e89b-12d3-a456-426614174002"
 *     responses:
 *       200:
 *         description: RSVP recorded successfully
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
 * @openapi
 * /events/{event_id}/rsvp:
 *   delete:
 *     tags: [Events]
 *     summary: Cancel RSVP
 *     description: |
 *       Cancel a previously made RSVP. User must be authenticated.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Event Attendees (cancel their attendance)
 *       - ✅ Regular Users (withdraw from events)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ Anonymous Users (must be authenticated)
 *       - ❌ Users who haven't RSVP'd (cannot cancel non-existent RSVP)
 *       - ❌ Event Hosts (cannot cancel RSVP to their own events)
 *       
 *       **BUSINESS RULES:**
 *       - User ID is extracted from JWT token
 *       - Can only cancel your own RSVP
 *       - RSVP count is decremented immediately
 *       - Can cancel RSVP even for past events (for record keeping)
 *       - Host is notified of cancellation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Event ID to cancel RSVP for
 *         example: "789e0123-e89b-12d3-a456-426614174002"
 *     responses:
 *       200:
 *         description: RSVP cancelled successfully
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
 *     description: |
 *       Check if the authenticated user has RSVP'd to a specific event.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Event Attendees (check their RSVP status)
 *       - ✅ Frontend Applications (display RSVP button state)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ Anonymous Users (must be authenticated)
 *       - ⚠️  Can only check your own RSVP status
 *       
 *       **BUSINESS RULES:**
 *       - Returns boolean indicating RSVP status
 *       - User ID is extracted from JWT token
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Event ID to check RSVP status for
 *         example: "789e0123-e89b-12d3-a456-426614174002"
 *     responses:
 *       200:
 *         description: RSVP status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isRsvped:
 *                   type: boolean
 *                   description: Whether the user has RSVP'd to this event
 *                   example: true
 */
router.get('/:event_id/rsvp-status', authenticate, eventController.checkRsvpStatus);

module.exports = router;
