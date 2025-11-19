const express = require("express");
const router = express.Router();
const userController = require("../controllers/UserController");
const { authenticate, authorizeUserAccess } = require("../middleware/auth"); // Import middleware

// ======================================================================
// API SCOPE DOCUMENTATION
// ======================================================================
/**
 * @openapi
 * x-api-scope:
 *   scope-in:
 *     - User registration and authentication (signup/login)
 *     - User profile management (view public profiles)
 *     - Social connections (follow/unfollow users and organizations)
 *     - User search and discovery
 *     - Follower/Following list management
 *   scope-out:
 *     - User notifications (handled by Notification Service)
 *     - User event history (handled by Event Management Service)
 *     - User recommendations (handled by Discovery & Recommendation Service)
 *     - Password reset emails (handled by Notification Service)
 *     - User analytics and reporting (handled by Analytics Service)
 *     - Profile photo storage (handled by Media/Storage Service)
 *   rationale:
 *     This service focuses on user identity, authentication, and social graph management.
 *     Event-related features, notifications, and media storage are intentionally excluded
 *     to maintain clear service boundaries and follow microservices architecture principles.
 */

// ----------------------------------------------------------------------
// 1. PUBLIC ENDPOINTS
// ----------------------------------------------------------------------

/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: User registration, auth and social relations
 *     x-stakeholders:
 *       primary:
 *         - Regular Users (individuals using the platform)
 *         - Organizations (business entities and groups)
 *       secondary:
 *         - System Administrators (manage user accounts)
 *         - Marketing Teams (analyze user growth)
 *         - Profile Visitors (browse user profiles)
 * 
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the user
 *         username:
 *           type: string
 *           maxLength: 50
 *           description: Unique username
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 255
 *           description: User email address
 *         is_organization:
 *           type: boolean
 *           description: Whether the user is an organization
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: User creation timestamp
 *       required:
 *         - user_id
 *         - username
 *         - email
 *         - is_organization
 *     UserProfile:
 *       allOf:
 *         - $ref: '#/components/schemas/User'
 *         - type: object
 *           properties:
 *             followers_count:
 *               type: integer
 *               minimum: 0
 *               description: Number of followers
 *             following_count:
 *               type: integer
 *               minimum: 0
 *               description: Number of users being followed
 *     RegisterRequest:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *           maxLength: 50
 *           example: "johndoe"
 *         email:
 *           type: string
 *           format: email
 *           example: "john@example.com"
 *         password:
 *           type: string
 *           minLength: 6
 *           example: "securepassword123"
 *         is_organization:
 *           type: boolean
 *           default: false
 *           example: false
 *       required:
 *         - username
 *         - email
 *         - password
 *     LoginRequest:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "john@example.com"
 *         password:
 *           type: string
 *           example: "securepassword123"
 *       required:
 *         - email
 *         - password
 *     LoginResponse:
 *       type: object
 *       properties:
 *         user_id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         token:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     FollowRequest:
 *       type: object
 *       properties:
 *         target_user_id:
 *           type: string
 *           format: uuid
 *           example: "456e7890-e89b-12d3-a456-426614174001"
 *       required:
 *         - target_user_id
 *     FollowResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "Successfully followed user 456e7890-e89b-12d3-a456-426614174001"
 *     FollowingListResponse:
 *       type: object
 *       properties:
 *         following:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               username:
 *                 type: string
 *               is_organization:
 *                 type: boolean
 *     FollowersListResponse:
 *       type: object
 *       properties:
 *         followers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               username:
 *                 type: string
 *               is_organization:
 *                 type: boolean
 *     SearchResponse:
 *       type: object
 *       properties:
 *         results:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               username:
 *                 type: string
 *               is_organization:
 *                 type: boolean
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "An error occurred"
 */

/**
 * @openapi
 * /users/register:
 *   post:
 *     tags: [Users]
 *     summary: Register a user
 *     description: |
 *       Create a new user account (individual or organization).
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ New Users (create individual accounts)
 *       - ✅ Organizations (create organization accounts)
 *       - ✅ Anonymous Visitors (sign up for the platform)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ Already Authenticated Users (cannot register while logged in)
 *       - ❌ No restrictions - This is a public endpoint
 *       - ⚠️  Email and username must be unique
 *       
 *       **BUSINESS RULES:**
 *       - Username must be unique across the platform
 *       - Email must be unique and valid format
 *       - Password must be at least 6 characters
 *       - is_organization flag determines account type
 *       - Account is immediately active (no email verification required)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             username: "johndoe"
 *             email: "john@example.com"
 *             password: "securepassword123"
 *             is_organization: false
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: string
 *                   format: uuid
 *                   example: "123e4567-e89b-12d3-a456-426614174000"
 *                 username:
 *                   type: string
 *                   example: "johndoe"
 *                 message:
 *                   type: string
 *                   example: "User registered successfully."
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Missing required fields: username, email, and password."
 *       409:
 *         description: Username or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Username or email already exists."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/register", userController.registerUser);

/**
 * @openapi
 * /users/login:
 *   post:
 *     tags: [Users]
 *     summary: Login
 *     description: |
 *       Authenticate user and receive JWT access token.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Registered Users (login to access protected features)
 *       - ✅ Organizations (login to manage their account)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ Unregistered Users (must register first)
 *       - ❌ Suspended/Banned Users (account must be active)
 *       - ❌ No restrictions - This is a public endpoint
 *       
 *       **BUSINESS RULES:**
 *       - Returns JWT token valid for 24 hours
 *       - Token must be included in Authorization header for protected endpoints
 *       - Failed login attempts are logged for security
 *       - Both individual users and organizations use same login endpoint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "john@example.com"
 *             password: "securepassword123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             example:
 *               user_id: "123e4567-e89b-12d3-a456-426614174000"
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Missing email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Email and password are required."
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Invalid credentials."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/login", userController.loginUser);

/**
 * @openapi
 * /users/search:
 *   get:
 *     tags: [Users]
 *     summary: Search users
 *     description: |
 *       Search for users and organizations by username or filter by account type.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Regular Users (find other users to follow)
 *       - ✅ Organizations (discover other organizations)
 *       - ✅ Anonymous Visitors (browse users without login)
 *       - ✅ Event Organizers (find users to invite)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ No restrictions - This is a public endpoint
 *       - ❌ Does NOT require authentication
 *       
 *       **BUSINESS RULES:**
 *       - Search is case-insensitive
 *       - Can filter by type: 'organization', 'org', or 'user'
 *       - Returns basic profile info (no sensitive data)
 *       - Results are limited to 50 per query
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Username search query
 *         example: "john"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [organization, org, user]
 *         description: Filter by user type
 *         example: "organization"
 *     responses:
 *       200:
 *         description: List of matching users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResponse'
 *             example:
 *               results:
 *                 - user_id: "123e4567-e89b-12d3-a456-426614174000"
 *                   username: "johndoe"
 *                   is_organization: false
 *                 - user_id: "456e7890-e89b-12d3-a456-426614174001"
 *                   username: "john_company"
 *                   is_organization: true
 *       400:
 *         description: Search requires query or type parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Search requires a 'query' or 'type' parameter."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/search", userController.searchUsers);

// Profile viewing is public and should not require authentication
/**
 * @openapi
 * /users/{user_id}:
 *   get:
 *     tags: [Users]
 *     summary: Get public profile
 *     description: |
 *       Retrieve public profile information for any user or organization.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Profile Visitors (view user profiles)
 *       - ✅ Regular Users (check out other users)
 *       - ✅ Organizations (view user/org profiles)
 *       - ✅ Anonymous Visitors (browse profiles without login)
 *       - ✅ Event Organizers (view attendee profiles)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ No restrictions - This is a public endpoint
 *       - ❌ Does NOT require authentication
 *       - ⚠️  Only public profile data is returned (no email, password)
 *       
 *       **BUSINESS RULES:**
 *       - Returns username, user_id, is_organization flag
 *       - Includes follower and following counts
 *       - Does NOT return sensitive data (email, password)
 *       - Profile must exist and be active
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the user
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *             example:
 *               user_id: "123e4567-e89b-12d3-a456-426614174000"
 *               username: "johndoe"
 *               email: "john@example.com"
 *               is_organization: false
 *               created_at: "2024-01-15T10:00:00Z"
 *               followers_count: 25
 *               following_count: 10
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "User not found."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:user_id", userController.getProfile);

// ----------------------------------------------------------------------
// 2. AUTHENTICATED ENDPOINTS
// ----------------------------------------------------------------------

// Apply the 'authenticate' middleware to all routes *below* this line.
// This is the clean, correct place for it.
router.use(authenticate);

// --- Social Connections (All require authentication) ---

/**
 * @route POST /users/:user_id/follow
 * @description Creates a follow relationship. Requires both authenticate and authorize.
 * @access Authenticated & Authorized
 */

/**
 * @openapi
 * /users/{user_id}/follow:
 *   post:
 *     tags: [Users]
 *     summary: Follow a user
 *     description: |
 *       Create a follow relationship between authenticated user and target user/organization.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Regular Users (follow other users or organizations)
 *       - ✅ Organizations (follow other organizations or users)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ Anonymous Users (must be authenticated)
 *       - ❌ Users following themselves (cannot follow yourself)
 *       - ❌ Users who already follow the target (duplicate follows not allowed)
 *       - ❌ Suspended/Banned Users (account must be active)
 *       - ⚠️  Must be the authenticated user (user_id in path must match token)
 *       
 *       **BUSINESS RULES:**
 *       - user_id in path must match authenticated user's ID
 *       - Cannot follow yourself
 *       - Cannot follow the same user twice
 *       - Target user/organization must exist
 *       - Follower count is incremented immediately
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the user performing the follow action
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FollowRequest'
 *           example:
 *             target_user_id: "456e7890-e89b-12d3-a456-426614174001"
 *     responses:
 *       200:
 *         description: Successfully followed user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FollowResponse'
 *             example:
 *               status: "Successfully followed user 456e7890-e89b-12d3-a456-426614174001"
 *       400:
 *         description: Cannot follow yourself
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Cannot follow yourself."
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Target user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Target user/organization not found."
 *       409:
 *         description: Already following this user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Already following this user/organization."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/:user_id/follow",
  authenticate,
  authorizeUserAccess,
  userController.followUser
);

/**
 * @route DELETE /users/:user_id/follow/:target_user_id
 * @description Deletes a follow relationship.
 * @access Authenticated & Authorized
 */

/**
 * @openapi
 * /users/{user_id}/follow/{target_user_id}:
 *   delete:
 *     tags: [Users]
 *     summary: Unfollow a user
 *     description: |
 *       Remove follow relationship between authenticated user and target user/organization.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Regular Users (unfollow users or organizations)
 *       - ✅ Organizations (unfollow other accounts)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ Anonymous Users (must be authenticated)
 *       - ❌ Users who don't follow the target (cannot unfollow if not following)
 *       - ❌ Other Users (can only unfollow from your own account)
 *       - ⚠️  Must be the authenticated user (user_id in path must match token)
 *       
 *       **BUSINESS RULES:**
 *       - user_id in path must match authenticated user's ID
 *       - Follow relationship must exist
 *       - Follower count is decremented immediately
 *       - Can unfollow at any time
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the user performing the unfollow action
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: target_user_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the user to unfollow
 *         example: "456e7890-e89b-12d3-a456-426614174001"
 *     responses:
 *       200:
 *         description: Successfully unfollowed user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FollowResponse'
 *             example:
 *               status: "Successfully unfollowed user 456e7890-e89b-12d3-a456-426614174001"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Follow relationship not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Follow relationship not found."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  "/:user_id/follow/:target_user_id",
  authorizeUserAccess,
  userController.unfollowUser
);

/**
 * @route GET /users/:user_id/following
 * @description Gets the list of users and organizations followed by {user_id}.
 * @access Authenticated
 */

/**
 * @openapi
 * /users/{user_id}/following:
 *   get:
 *     tags: [Users]
 *     summary: List following
 *     description: |
 *       Get the list of users and organizations followed by the specified user.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Regular Users (view who they follow)
 *       - ✅ Organizations (view their following list)
 *       - ✅ Profile Visitors (see who a user follows)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ Anonymous Users (must be authenticated)
 *       - ⚠️  Currently requires authentication (consider making public for better UX)
 *       
 *       **BUSINESS RULES:**
 *       - Returns list of followed users and organizations
 *       - Includes basic profile info (user_id, username, is_organization)
 *       - Results are sorted by follow date (most recent first)
 *       - Empty array if user follows no one
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the user
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: List of users being followed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FollowingListResponse'
 *             example:
 *               following:
 *                 - user_id: "456e7890-e89b-12d3-a456-426614174001"
 *                   username: "jane_doe"
 *                   is_organization: false
 *                 - user_id: "789e0123-e89b-12d3-a456-426614174002"
 *                   username: "tech_company"
 *                   is_organization: true
 *       401:
 *         description: Unauthorized - Invalid or missing token
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
 */
router.get("/:user_id/following", userController.getFollowing);

/**
 * @route GET /users/:user_id/followers
 * @description Gets the list of followers for {user_id}.
 * @access Authenticated
 */

/**
 * @openapi
 * /users/{user_id}/followers:
 *   get:
 *     tags: [Users]
 *     summary: List followers
 *     description: |
 *       Get the list of followers for the specified user or organization.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Regular Users (view their followers)
 *       - ✅ Organizations (view who follows them)
 *       - ✅ Profile Visitors (see who follows a user)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ Anonymous Users (must be authenticated)
 *       - ⚠️  Currently requires authentication (consider making public for better UX)
 *       
 *       **BUSINESS RULES:**
 *       - Returns list of users/organizations following this account
 *       - Includes basic profile info (user_id, username, is_organization)
 *       - Results are sorted by follow date (most recent first)
 *       - Empty array if user has no followers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the user
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: List of followers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FollowersListResponse'
 *             example:
 *               followers:
 *                 - user_id: "456e7890-e89b-12d3-a456-426614174001"
 *                   username: "jane_doe"
 *                   is_organization: false
 *                 - user_id: "789e0123-e89b-12d3-a456-426614174002"
 *                   username: "tech_company"
 *                   is_organization: true
 *       401:
 *         description: Unauthorized - Invalid or missing token
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
 */
router.get("/:user_id/followers", userController.getFollowers);

module.exports = router;

/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */