# Swagger Documentation Guide

## Overview
This guide explains how we've enhanced our Swagger/OpenAPI documentation to include stakeholder information, access restrictions, and API scope definitions as requested.

## Documentation Structure

### 1. API Scope Documentation (Scope-In & Scope-Out)

At the top of each route file, we define what's included and excluded from the API:

```javascript
/**
 * @openapi
 * x-api-scope:
 *   scope-in:
 *     - Feature 1 (what it does)
 *     - Feature 2 (what it does)
 *   scope-out:
 *     - Feature X (handled by Service Y)
 *     - Feature Z (handled by Service W)
 *   rationale:
 *     Explanation of why certain features are excluded
 */
```

**Purpose:** This helps management understand:
- What the API covers
- What it intentionally doesn't cover
- Why certain features are out of scope
- Which other services handle excluded features

### 2. Stakeholder Documentation

For each endpoint, we specify:

#### ✅ Who CAN use the endpoint:
```javascript
**STAKEHOLDERS:**
- ✅ Event Organizers (create events they will host)
- ✅ Event Attendees (browse events to attend)
- ✅ System Administrators (monitor event data)
```

#### ❌ Who CANNOT use the endpoint:
```javascript
**ACCESS RESTRICTIONS:**
- ❌ Anonymous Users (must be authenticated)
- ❌ Event Attendees (cannot modify events they don't host)
- ❌ Suspended/Banned Users (account must be in good standing)
```

### 3. Business Rules

Each endpoint also includes business rules that govern its behavior:

```javascript
**BUSINESS RULES:**
- User creating the event automatically becomes the host
- Event date must be in the future
- Title and location are mandatory
```

## Implementation Pattern

### For Public Endpoints:
```javascript
/**
 * @openapi
 * /events/search:
 *   get:
 *     summary: Search events
 *     description: |
 *       Brief description of what the endpoint does.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Event Attendees (browse events to attend)
 *       - ✅ Anonymous Users (discover events without login)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ No restrictions - This is a public endpoint
 *       
 *       **BUSINESS RULES:**
 *       - Returns only published/active events
 *       - Results are paginated
 */
```

### For Authenticated Endpoints:
```javascript
/**
 * @openapi
 * /events:
 *   post:
 *     summary: Create a new event
 *     security: [{ bearerAuth: [] }]
 *     description: |
 *       Brief description of what the endpoint does.
 *       
 *       **STAKEHOLDERS:**
 *       - ✅ Event Organizers (create events they will host)
 *       
 *       **ACCESS RESTRICTIONS:**
 *       - ❌ Anonymous Users (must be authenticated)
 *       - ❌ Suspended/Banned Users (account must be in good standing)
 *       
 *       **BUSINESS RULES:**
 *       - User creating the event automatically becomes the host
 */
```

## Stakeholder Types

We use specific stakeholder names instead of generic "USER":

### Primary Stakeholders:
- **Event Organizers** - Users who create and manage events
- **Event Attendees** - Users who browse and RSVP to events
- **Organizations** - Business entities hosting events
- **System Administrators** - Platform administrators

### Secondary Stakeholders:
- **Marketing Teams** - Analyze event trends and data
- **Anonymous Users** - Non-authenticated visitors
- **Frontend Applications** - Client apps consuming the API

## Benefits

1. **Clear Scope Definition**: Management knows exactly what each service does and doesn't do
2. **Stakeholder Clarity**: No ambiguity about who can use each endpoint
3. **Access Control Documentation**: Security requirements are explicit
4. **Business Logic Transparency**: Rules are documented alongside technical specs
5. **Better Communication**: Developers, PMs, and stakeholders speak the same language

## Viewing the Documentation

1. Start the service:
   ```bash
   cd event-management-service
   npm start
   ```

2. Open Swagger UI:
   ```
   http://localhost:3001/api-docs
   ```

3. The stakeholder information and access restrictions appear in the endpoint descriptions

## Next Steps

Apply this pattern to all services:
- ✅ Event Management Service (COMPLETED)
- ⏳ User & Social Service
- ⏳ Discovery & Recommendation Service
- ⏳ Notification Service
- ⏳ GraphQL Gateway Service

## Questions?

If you need to add more stakeholder types or modify the documentation structure, update the pattern in this guide and apply consistently across all services.
