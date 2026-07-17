# BusNirikshan

Passengers track buses on a live map. Drivers update location every 30 sec via a simple mobile form. Passengers see arrival time estimates for their stop.

## Deployed At:
https://busnirikshan.mauliksharma.org

## Key Features & Architecture

### 1. Real-Time Tracking & Synchronization
- **WebSocket + Redis Pub/Sub**: Driver updates location → POST to server → server publishes to Redis channel `bus:{busId}` → all Node instances push updates to connected clients. Implements canonical multi-instance WebSocket pattern.
- **GeoJSON & Geospatial Queries**: Backend uses MongoDB `2dsphere` indexes to efficiently query nearby buses and stops.
- **ETA Computation**: Haversine formula calculates live ETA in pure JS on the server based on GPS distance and estimated speeds.

### 2. Robust Security & Authentication
- **Email OTP Verification**: Registration requires a 6-digit OTP sent via email (Nodemailer), preventing spam and verifying real users.
- **Identity-Keyed Rate Limiting**: API throttling uses `userId` or `email` instead of just IP addresses, allowing fair use across CGNAT networks (e.g., universities or cellular).
- **JWT & Multi-Session Management**: Secure authentication with `access_token` (15m, stateless) and `refresh_token` (7d, HttpOnly cookie, stored in DB). Users can manage multiple sessions and utilize global logout (`/logout-all`).
- **Role-Based Access Control (RBAC)**: Distinct permissions for `user`, `driver`, and `admin` roles, properly enforced at the routing level.

### 3. Data Integrity & Codebase Organization
- **Strict Schema Validation**: Uses MongoDB ObjectIds for relational integrity between Buses, Stops, and Locations.
- **Centralized Utilities**: Modular separation of utilities (geolocation, validation, mailing, pagination).

### 4. CI/CD & Deployment
- **Automated Docker Hub Deployments**: GitHub Actions workflows automatically build and publish separate Docker images for the frontend and backend whenever code is pushed to the `main` branch.

## Deliverables
| Tech Concept | What Students Must Implement | 
|---|---|
| WebSocket + Redis Pub/Sub | Driver updates location → POST to server → server publishes to Redis channel `bus:{busId}` → all Node instances push update to connected clients. |
| MongoDB Time-Series for History | GPS updates stored in a time-series collection. Schema designed for efficient range queries ('show bus path for last 2 hours'). |
| Server-Side ETA Computation | ETA computed using the Haversine formula in pure JS on the server. |
| useMemo for Nearby Buses | List of buses near a given stop computed from the live location feed using `useMemo` in React. |
| Polling vs SSE vs WebSocket | Students implement all three approaches, benchmark latency and server load, and compare them. |
| Horizontal Scaling Proof | Verify that a location update from a driver on Node Instance A reaches a passenger connected to Node Instance B via Redis. |

## API Documentation

The backend server is accessible at:
- **Local Development:** `http://localhost:5000`
- **Production Server:** `https://busnirikshanapi.mauliksharma.org`

### Authentication & Request Headers
All protected routes require a JWT Access Token. Clients must submit this token in the `Authorization` HTTP header:
```http
Authorization: Bearer <access_token>
```
*Note: Refresh tokens are saved and rotated automatically using `HttpOnly`, `secure` (in production), Lax cookies named `refresh_token`.*

---

### Table of Contents
1. [Authentication (`/api/auth`)](#1-authentication-apiauth)
2. [User Management (`/api/user`)](#2-user-management-apiuser)
3. [Buses (`/api/buses`)](#3-buses-apibuses)
4. [Stops (`/api/stops`)](#4-stops-apistops)
5. [Routes (`/api/routes`)](#5-routes-apiroutes)
6. [Locations & Live Feeds (`/api/locations`)](#6-locations--live-feeds-apilocations)
7. [Drivers & Shifts (`/api/drivers`)](#7-drivers--shifts-apidrivers)
8. [ETA Board (`/api/eta`)](#8-eta-board-apieta)
9. [Analytics (`/api/analytics`)](#9-analytics-apianalytics)
10. [Alert Notifications (`/api/notifications`)](#10-alert-notifications-apinotifications)
11. [System Administration (`/api/admin`)](#11-system-administration-apiadmin)

---

### 1. Authentication (`/api/auth`)

#### **POST** `/api/auth/register/init`
- **Description:** Step 1 of registration. Validates email and password, hashes credentials, generates a 6-digit OTP, and emails it to the user.
- **Access:** Public
- **Request Body (JSON):**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "password": "Password123!",
    "role": "user", // "user" | "driver" | "admin"
    "rtc": "GSRTC"  // optional
  }
  ```
- **Responses:**
  - `200 OK`: `{"message": "OTP sent to your email. Please verify to complete registration."}`
  - `400 Bad Request`: Validation failure (missing fields, weak password, or duplicate email).
  - `500 Internal Server Error`

#### **POST** `/api/auth/register/verify`
- **Description:** Step 2 of registration. Validates the emailed OTP and registers the new user account in MongoDB.
- **Access:** Public
- **Request Body (JSON):**
  ```json
  {
    "email": "jane.doe@example.com",
    "otp": "123456"
  }
  ```
- **Responses:**
  - `201 Created`: `{"message": "Registration successful. You can now log in."}`
  - `400 Bad Request`: OTP incorrect, expired, or already used.
  - `500 Internal Server Error`

#### **POST** `/api/auth/login`
- **Description:** Authenticates user credentials. Returns a short-lived JSON Web Token (JWT) access token and signs a long-lived HTTP-only rotation refresh cookie.
- **Access:** Public
- **Request Body (JSON):**
  ```json
  {
    "email": "jane.doe@example.com",
    "password": "Password123!"
  }
  ```
- **Responses:**
  - `200 OK`: `{"message": "Login successful", "access_token": "<jwt_token_string>"}` + `Set-Cookie: refresh_token=...`
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: Invalid credentials.
  - `500 Internal Server Error`

#### **POST** `/api/auth/logout`
- **Description:** Logs out the user from their current active session by deleting the refresh token from the database and clearing the browser cookie.
- **Access:** Private (Authenticated User)
- **Cookies:** `refresh_token` (HTTP-only)
- **Responses:**
  - `200 OK`: `{"message": "Logout successful"}`
  - `401 Unauthorized`: Missing authentication credentials / refresh token cookie.
  - `500 Internal Server Error`

#### **POST** `/api/auth/logout-all`
- **Description:** Invalidates all refresh tokens issued to the user across all of their active devices.
- **Access:** Private (Authenticated User)
- **Responses:**
  - `200 OK`: `{"message": "Logged out from all devices successfully", "sessionsRevoked": 3}`
  - `401 Unauthorized`
  - `500 Internal Server Error`

#### **POST** `/api/auth/refresh`
- **Description:** Silent refresh handler. Verifies the existing refresh token, rotates it, sets a new refresh token cookie, and provides a fresh access token.
- **Access:** Public
- **Cookies:** `refresh_token` (HTTP-only)
- **Responses:**
  - `200 OK`: `{"message": "Token refreshed successfully", "access_token": "<new_jwt_string>"}`
  - `401 Unauthorized`: No refresh token provided.
  - `403 Forbidden`: Expired, invalid, or recycled token.
  - `500 Internal Server Error`

#### **POST** `/api/auth/forgot-password`
- **Description:** Generates and emails a 15-minute tokenized password reset hyperlink to the requested address.
- **Access:** Public
- **Request Body (JSON):**
  ```json
  {
    "email": "jane.doe@example.com"
  }
  ```
- **Responses:**
  - `200 OK`: `{"message": "Password reset link sent to your email"}` (Returns 200 even if the email does not exist to prevent user enumeration).
  - `400 Bad Request`: Missing email address.
  - `500 Internal Server Error`

#### **POST** `/api/auth/reset-password`
- **Description:** Resets the password using a valid reset token. Revokes all active refresh sessions for security.
- **Access:** Public
- **Request Body (JSON):**
  ```json
  {
    "token": "<reset_token_string>",
    "newPassword": "NewPassword123!"
  }
  ```
- **Responses:**
  - `200 OK`: `{"message": "Password reset successful. Please log in again on all your devices."}`
  - `400 Bad Request`: Password validation failed, or matches the previous password.
  - `403 Forbidden`: Invalid, used, or expired token.
  - `500 Internal Server Error`

---

### 2. User Management (`/api/user`)

#### **GET** `/api/user/:userId`
- **Description:** Retrieves user profile metadata.
- **Access:** Private (User owner, or Admin)
- **Path Parameters:**
  - `userId` (string, required): The hex ID of the user.
- **Responses:**
  - `200 OK`: `{"message": "Profile fetched successfully", "user": { "name": "Jane", "email": "jane@example.com", "role": "user", "rtc": "GSRTC", "createdAt": "..." }}`
  - `401 Unauthorized`
  - `403 Forbidden`: Attempting to access another user's profile without admin permissions.
  - `404 Not Found`

#### **PATCH** `/api/user/:userId`
- **Description:** Updates specific user parameters (e.g. name, rtc). Only admins are allowed to modify role and email variables.
- **Access:** Private (User owner, or Admin)
- **Path Parameters:**
  - `userId` (string, required)
- **Request Body (JSON):**
  ```json
  {
    "name": "Jane Smith",
    "rtc": "GSRTC",
    "isActive": true
  }
  ```
- **Responses:**
  - `200 OK`: `{"message": "User updated successfully", "user": { ... }}`
  - `400 Bad Request` / `403 Forbidden` / `404 Not Found`
  - `409 Conflict`: Email address is already registered.

#### **DELETE** `/api/user/:userId`
- **Description:** Deletes a user profile and cascades removal of all session tokens.
- **Access:** Private (User owner, or Admin)
- **Path Parameters:**
  - `userId` (string, required)
- **Responses:**
  - `200 OK`: `{"message": "User deleted successfully"}`
  - `401 Unauthorized` / `403 Forbidden` / `404 Not Found`

---

### 3. Buses (`/api/buses`)

#### **GET** `/api/buses`
- **Description:** Fetches a list of registered buses with caching. Supports pagination and filtering.
- **Access:** Private
- **Query Params:**
  - `rtc` (string/array, optional): Filter by RTC operator name.
  - `isActive` (boolean, optional): `true` or `false`.
  - `page` (number, optional, default: 1)
  - `limit` (number, optional, default: 50)
- **Responses:**
  - `200 OK`: `{"message": "Buses fetched successfully", "pagination": { "total": 1, "page": 1, ... }, "buses": [...]}`
  - `400 Bad Request`

#### **GET** `/api/buses/:busId`
- **Description:** Retrieves information on a specific bus.
- **Access:** Private
- **Path Parameters:**
  - `busId` (string, required)
- **Responses:**
  - `200 OK`: `{"message": "Bus fetched successfully", "bus": { ... }}`
  - `404 Not Found`

#### **POST** `/api/buses`
- **Description:** Registers a new bus into the system database.
- **Access:** Private (Admin Only)
- **Request Body (JSON):**
  ```json
  {
    "routeId": "65b2d8e4f5a3b2b8c9d01234",
    "rtc": "GSRTC",
    "routeName": "Route 10A",
    "registrationNumber": "GJ-01-XX-1234",
    "capacity": 50,
    "isActive": false
  }
  ```
- **Responses:**
  - `201 Created`: `{"message": "Bus created successfully", "bus": { ... }}`
  - `400 Bad Request`: Missing mandatory fields or invalid route ID.

#### **PATCH** `/api/buses/:busId`
- **Description:** Modifies properties of a bus registry, including manual geographical overrides.
- **Access:** Private (Admin Only)
- **Path Parameters:**
  - `busId` (string, required)
- **Request Body (JSON):** Supports all registry creation properties + optional coordinate update variables:
  ```json
  {
    "capacity": 60,
    "latitude": 23.0225,
    "longitude": 72.5714,
    "speed_kmh": 40,
    "heading_deg": 90
  }
  ```
- **Responses:**
  - `200 OK`
  - `400 Bad Request` / `404 Not Found`

#### **DELETE** `/api/buses/:busId`
- **Description:** Deletes a bus from the database registry.
- **Access:** Private (Admin Only)
- **Path Parameters:**
  - `busId` (string, required)
- **Responses:**
  - `200 OK`
  - `404 Not Found`

#### **GET** `/api/buses/:busId/status`
- **Description:** Retrieves near real-time state flags of a bus (`isActive`, `lastKnownLocation`).
- **Access:** Private
- **Path Parameters:**
  - `busId` (string, required)
- **Responses:**
  - `200 OK`: `{"message": "Bus status fetched successfully", "status": { "isActive": true, "lastKnownLocation": { ... } }}`
  - `404 Not Found`

#### **GET** `/api/buses/:busId/history`
- **Description:** Fetches the historical log of GPS location points recorded for a bus over a specified epoch timestamp range.
- **Access:** Private
- **Path Parameters:**
  - `busId` (string, required)
- **Query Params:**
  - `from` (number, required): Start timestamp in epoch milliseconds.
  - `to` (number, required): End timestamp in epoch milliseconds.
  - `page` (number, optional, default: 1)
  - `limit` (number, optional, default: 100)
- **Responses:**
  - `200 OK`: `{"message": "Bus history fetched successfully", "pagination": { ... }, "history": [...]}`
  - `400 Bad Request`: Missing or invalid epoch ranges.
  - `404 Not Found`: No logs found in this range.

#### **GET** `/api/buses/:busId/eta`
- **Description:** Computes the geographical distance and travel duration estimate from a bus to a target stop.
- **Access:** Private
- **Path Parameters:**
  - `busId` (string, required)
- **Query Params:**
  - `stopId` (string, required): Stop ID to check.
- **Responses:**
  - `200 OK`: `{"message": "ETA calculated successfully", "distance_km": 8.52, "speed_kmh": 40, "eta_minutes": 13}`
  - `400 Bad Request`: Bus location is unknown / invalid stop coordinates.
  - `404 Not Found`: Bus or stop not found.

---

### 4. Stops (`/api/stops`)

#### **GET** `/api/stops`
- **Description:** Returns cached bus stops.
- **Access:** Private
- **Query Params:**
  - `city` (string, optional)
  - `rtc` (string/array, optional)
  - `page` (number, optional)
  - `limit` (number, optional)
- **Responses:**
  - `200 OK`

#### **GET** `/api/stops/nearby`
- **Description:** Finds stops within a specified meters radius using a MongoDB geospatial query.
- **Access:** Private
- **Query Params:**
  - `longitude` (number, required)
  - `latitude` (number, required)
  - `radius` (number, optional, default: 5000): distance query boundary in meters.
- **Responses:**
  - `200 OK`: `{"message": "Nearby stops fetched successfully", "count": 3, "stops": [...]}`
  - `400 Bad Request`: Invalid coordinates or negative radius parameters.

#### **GET** `/api/stops/:stopId`
- **Description:** Fetches details of a specific stop.
- **Access:** Private
- **Path Parameters:**
  - `stopId` (string, required)
- **Responses:**
  - `200 OK`
  - `404 Not Found`

#### **POST** `/api/stops`
- **Description:** Registers a new stop.
- **Access:** Private (Admin Only)
- **Request Body (JSON):**
  ```json
  {
    "name": "Bus Stop A",
    "city": "Gandhinagar",
    "state": "Gujarat",
    "rtc": ["GSRTC"],
    "latitude": 23.2156,
    "longitude": 72.6369,
    "isActive": true
  }
  ```
- **Responses:**
  - `201 Created`
  - `400 Bad Request`

#### **PATCH** `/api/stops/:stopId`
- **Description:** Updates properties of a stop.
- **Access:** Private (Admin Only)
- **Path Parameters:**
  - `stopId` (string, required)
- **Responses:**
  - `200 OK`
  - `404 Not Found`

#### **DELETE** `/api/stops/:stopId`
- **Description:** Deletes a stop.
- **Access:** Private (Admin Only)
- **Path Parameters:**
  - `stopId` (string, required)
- **Responses:**
  - `200 OK`
  - `404 Not Found`

#### **GET** `/api/stops/:stopId/buses`
- **Description:** Returns approaching active buses and computed ETAs for this stop.
- **Access:** Private
- **Path Parameters:**
  - `stopId` (string, required)
- **Responses:**
  - `200 OK`: `{"message": "Buses fetched successfully", "stop": { ... }, "count": 2, "buses": [...]}`
  - `404 Not Found`
  - `409 Conflict`: Stop has no coordinate data.

---

### 5. Routes (`/api/routes`)

#### **GET** `/api/routes`
- **Description:** Returns routes with pagination.
- **Access:** Private
- **Query Params:** `rtc`, `isActive`, `stopId`, `page`, `limit`
- **Responses:**
  - `200 OK`

#### **GET** `/api/routes/:routeId`
- **Description:** Details of a specific route.
- **Access:** Private
- **Path Parameters:**
  - `routeId` (string, required)
- **Responses:**
  - `200 OK`
  - `404 Not Found`

#### **POST** `/api/routes`
- **Description:** Creates a new route containing ordered stop IDs.
- **Access:** Private (Admin Only)
- **Request Body (JSON):**
  ```json
  {
    "name": "Route 12",
    "rtc": "GSRTC",
    "stopIds": ["65b2d8e4f5a3b2b8c9d01235", "65b2d8e4f5a3b2b8c9d01236"],
    "totalDistanceKm": 25,
    "estimatedDurationMin": 60,
    "isActive": true
  }
  ```
- **Responses:**
  - `201 Created`
  - `400 Bad Request`

#### **PATCH** `/api/routes/:routeId`
- **Description:** Modifies route parameters.
- **Access:** Private (Admin Only)
- **Path Parameters:**
  - `routeId` (string, required)
- **Responses:**
  - `200 OK`
  - `404 Not Found`

#### **DELETE** `/api/routes/:routeId`
- **Description:** Deletes a route registry.
- **Access:** Private (Admin Only)
- **Path Parameters:**
  - `routeId` (string, required)
- **Responses:**
  - `200 OK`
  - `404 Not Found`

#### **GET** `/api/routes/:routeId/buses`
- **Description:** Lists currently active buses assigned to this route.
- **Access:** Private
- **Path Parameters:**
  - `routeId` (string, required)
- **Responses:**
  - `200 OK`

---

### 6. Locations & Live Feeds (`/api/locations`)

#### **POST** `/api/locations`
- **Description:** Submits real-time driver coordinates. Saves updates in MongoDB timeseries collections, updates the bus document, and broadcasts messages on the live Redis channel.
- **Access:** Private (Drivers Only)
- **Request Body (JSON):**
  ```json
  {
    "lat": 23.0225,
    "lng": 72.5714,
    "speed_kmh": 42.1,   // optional
    "heading_deg": 120,   // optional
    "timestamp": 1698765432000 // optional (ISO format or epoch ms)
  }
  ```
- **Responses:**
  - `201 Created`: `{"message": "GPS location updated successfully"}`
  - `400 Bad Request`: Coordinates validation error.
  - `403 Forbidden`: User has no driver profile, driver is off shift, or has no bus assigned.

#### **GET** `/api/locations/live`
- **Description:** Returns the coordinates of active buses. Supports spatial geo filters.
- **Access:** Public
- **Query Params:**
  - `lat` (number, optional): Center latitude.
  - `lng` (number, optional): Center longitude.
  - `radius` (number, optional, default: 10): Search radius boundary (km).
  - `rtc` (string/array, optional)
  - `routeId` (string, optional)
  - `limit` (number, optional, default: 50)
- **Responses:**
  - `200 OK`

#### **GET** `/api/locations/live/:busId`
- **Description:** Retrieves the coordinates snapshot of a single bus.
- **Access:** Public
- **Path Parameters:**
  - `busId` (string, required)
- **Responses:**
  - `200 OK`
  - `404 Not Found`
  - `409 Conflict`: Bus coordinates have not been recorded yet.

#### **GET** `/api/locations/livesse`
- **Description:** Subscribes to a persistent Server-Sent Events (SSE) stream for real-time bus location updates.
- **Access:** Private
- **Headers:** `Accept: text/event-stream`
- **Query Params:**
  - `busIds` (string, optional, default: "all"): Comma-separated list of bus IDs.
- **Event Types Broadcasted:**
  - `subscribed`: Initial confirmation listing all tracked bus IDs.
  - `location`: Geo-position payload: `{"busId": "...", "lat": ..., "lng": ...}`
  - `error`: Error payload message: `{"message": "..."}`

#### **WS** `/api/locations/livewebsocket`
- **Description:** Persistent WebSocket connection for location updates.
- **Access:** Public
- **WS Endpoint:** `ws://<host>:<port>/api/locations/livewebsocket`
- **Protocol Flow:**
  - **Connection established:** Server sends:
    ```json
    { "type": "connected", "message": "Connected. Send { type: 'subscribe', busIds: ['...'] } to receive updates." }
    ```
  - **Client Subscribe:** Client sends:
    ```json
    { "type": "subscribe", "busIds": ["65b2d8e4f5a3b2b8c9d01234"] }
    ```
    Server Acknowledges:
    ```json
    { "type": "ack", "action": "subscribed", "busIds": ["65b2d8e4f5a3b2b8c9d01234"] }
    ```
  - **Client Unsubscribe:** Client sends:
    ```json
    { "type": "unsubscribe", "busIds": ["65b2d8e4f5a3b2b8c9d01234"] }
    ```
    Server Acknowledges:
    ```json
    { "type": "ack", "action": "unsubscribed", "busIds": ["65b2d8e4f5a3b2b8c9d01234"] }
    ```
  - **Server Live Push:** Broadcasts updates to subscribers matching selected buses:
    ```json
    {
      "type": "location",
      "busId": "65b2d8e4f5a3b2b8c9d01234",
      "lat": 23.0225,
      "lng": 72.5714,
      "speed_kmh": 40,
      "heading_deg": 90,
      "timestamp": "2026-07-15T10:00:00.000Z"
    }
    ```
  - **Error handling:** Returns error schema:
    ```json
    { "type": "error", "message": "Subscription limit reached..." }
    ```

---

### 7. Drivers & Shifts (`/api/drivers`)

#### **GET** `/api/drivers`
- **Description:** Returns a page-filtered list of registered drivers.
- **Access:** Private (Admin Only)
- **Query Params:** `rtc`, `isOnShift`, `page`, `limit`
- **Responses:**
  - `200 OK`

#### **GET** `/api/drivers/:driverId`
- **Description:** Detailed profile of a driver.
- **Access:** Private
- **Path Parameters:**
  - `driverId` (string, required)
- **Responses:**
  - `200 OK`
  - `404 Not Found`

#### **POST** `/api/drivers`
- **Description:** Links an existing base User profile to a driver registry sheet.
- **Access:** Private (Admin Only)
- **Request Body (JSON):**
  ```json
  {
    "userId": "65b2d8e4f5a3b2b8c9d01230",
    "rtc": "GSRTC",
    "licenseNumber": "GJ01-20240001" // format: XX99-99999999
  }
  ```
- **Responses:**
  - `201 Created`: `{"message": "Driver created successfully", "driver": { ... }}`
  - `400 Bad Request`: Validation failure or incorrect license format.
  - `409 Conflict`: User or license already has a driver profile.

#### **PATCH** `/api/drivers/:driverId`
- **Description:** Updates driver attributes (e.g. license, rtc, bus assignment).
- **Access:** Private (Admin Only)
- **Path Parameters:**
  - `driverId` (string, required)
- **Responses:**
  - `200 OK`
  - `404 Not Found`

#### **DELETE** `/api/drivers/:driverId`
- **Description:** Deletes a driver profile (base user is retained).
- **Access:** Private (Admin Only)
- **Path Parameters:**
  - `driverId` (string, required)
- **Responses:**
  - `200 OK`
  - `400 Bad Request`: Cannot delete driver if they are currently on shift.
  - `404 Not Found`

#### **POST** `/api/drivers/:driverId/shift/start`
- **Description:** Begins a shift. Starts location tracking session and pushes the bus status to live active mode.
- **Access:** Private (Authenticated Driver)
- **Path Parameters:**
  - `driverId` (string, required)
- **Request Body (JSON):**
  ```json
  {
    "busId": "65b2d8e4f5a3b2b8c9d01234"
  }
  ```
- **Responses:**
  - `200 OK`: `{"message": "Shift started. Bus is now live on the map.", "shiftId": "...", "busId": "...", "startedAt": "..."}`
  - `400 Bad Request`: Driver is already on shift.
  - `409 Conflict`: Bus is already on an active shift with another driver.

#### **POST** `/api/drivers/:driverId/shift/end`
- **Description:** Concludes the active shift. Records end-location and sets bus activity to inactive.
- **Access:** Private (Authenticated Driver)
- **Path Parameters:**
  - `driverId` (string, required)
- **Responses:**
  - `200 OK`: `{"message": "Shift ended. Bus is now off the map.", "shiftId": "...", "endedAt": "...", "durationMin": 45}`
  - `400 Bad Request`: Driver is not on a shift.

#### **GET** `/api/drivers/:driverId/shifts`
- **Description:** Returns historical shifts completed by a driver.
- **Access:** Private
- **Path Parameters:**
  - `driverId` (string, required)
- **Query Params:** `page`, `limit`
- **Responses:**
  - `200 OK`

---

### 8. ETA Board (`/api/eta`)

#### **GET** `/api/eta`
- **Description:** Calculates ETAs for multiple buses approaching a single stop.
- **Access:** Private
- **Query Params:**
  - `stopId` (string, required)
  - `busIds` (string, required): Comma-separated list of bus IDs.
- **Responses:**
  - `200 OK`: `{"message": "Batch ETA calculated successfully", "stop": { ... }, "results": [...]}`
  - `400 Bad Request`: Invalid ID parameters or missing lists.
  - `404 Not Found`: Stop not found.

#### **GET** `/api/eta/stop/:stopId`
- **Description:** Calculates ETAs for all active buses within a search radius of a stop.
- **Access:** Private
- **Path Parameters:**
  - `stopId` (string, required)
- **Query Params:**
  - `radius_km` (number, optional, default: 10): Search radius limit (max 100km).
- **Responses:**
  - `200 OK`

---

### 9. Analytics (`/api/analytics`)

#### **GET** `/api/analytics/bus/:busId/trail`
- **Description:** Retrieves the raw chronological geolocation history trail for a bus.
- **Access:** Private
- **Path Parameters:**
  - `busId` (string, required)
- **Query Params:**
  - `from` (number, required): Start epoch milliseconds.
  - `to` (number, required): End epoch milliseconds.
- **Responses:**
  - `200 OK`: `{"message": "Trail fetched successfully", "bus": { ... }, "totalPoints": 52, "trail": [...]}`
  - `400 Bad Request`

#### **GET** `/api/analytics/bus/:busId/speed`
- **Description:** Aggregates speed measurements over specified intervals (hourly or daily averages).
- **Access:** Private
- **Path Parameters:**
  - `busId` (string, required)
- **Query Params:**
  - `from` (number, optional)
  - `to` (number, optional)
  - `date` (string, optional): `YYYY-MM-DD` (alternative to from/to)
  - `interval` (string, optional, default: "hour"): `"hour"` or `"day"`.
- **Responses:**
  - `200 OK`

#### **GET** `/api/analytics/stops/:stopId/traffic`
- **Description:** Counts buses and geolocation readings recorded within a 200m proximity circle of a stop.
- **Access:** Private
- **Path Parameters:**
  - `stopId` (string, required)
- **Query Params:**
  - `from` (number, optional)
  - `to` (number, optional)
  - `date` (string, optional): `YYYY-MM-DD`
- **Responses:**
  - `200 OK`: `{"message": "Stop traffic fetched successfully", "stop": { ... }, "totalPings": 12, "uniqueBusCount": 2, "uniqueBusIds": [...]}`

#### **GET** `/api/analytics/system/active-buses`
- **Description:** Displays active vs inactive bus counts grouped by RTC.
- **Access:** Private (Admin Only)
- **Responses:**
  - `200 OK`: `{"message": ..., "summary": { "totalActive": 10, "totalInactive": 40, ... }, "byRtc": { "GSRTC": { "active": 8, "inactive": 35 } }}`

#### **GET** `/api/analytics/bus/:busId/summary`
- **Description:** Quick stats summary for a bus (total logged pings, avg speed, max speed).
- **Access:** Private
- **Path Parameters:**
  - `busId` (string, required)
- **Query Params:**
  - `from` (number, optional)
  - `to` (number, optional)
  - `date` (string, optional): `YYYY-MM-DD`
- **Responses:**
  - `200 OK`

#### **GET** `/api/analytics/driver/:driverId/stats`
- **Description:** Performance sheet for a driver (total shifts completed, total hours logged, avg shift duration, total pings).
- **Access:** Private
- **Path Parameters:**
  - `driverId` (string, required)
- **Responses:**
  - `200 OK`
  - `404 Not Found`

---

### 10. Alert Notifications (`/api/notifications`)

#### **POST** `/api/notifications/subscribe`
- **Description:** Passenger registers an alert configuration. When a bus on the selected route drops below the threshold time from their stop, a notification fires.
- **Access:** Private
- **Request Body (JSON):**
  ```json
  {
    "stopId": "65b2d8e4f5a3b2b8c9d01235",
    "routeId": "65b2d8e4f5a3b2b8c9d01236",
    "thresholdMinutes": 5 // optional, default: 5 (1 to 60)
  }
  ```
- **Responses:**
  - `201 Created`: `{"message": "Subscribed to notifications successfully", "subscription": { ... }}`
  - `400 Bad Request`

#### **PATCH** `/api/notifications/subscribe`
- **Description:** Updates the threshold parameter of an active alert setup.
- **Access:** Private
- **Request Body (JSON):**
  ```json
  {
    "stopId": "65b2d8e4f5a3b2b8c9d01235",
    "routeId": "65b2d8e4f5a3b2b8c9d01236",
    "thresholdMinutes": 10
  }
  ```
- **Responses:**
  - `200 OK`
  - `404 Not Found`

#### **DELETE** `/api/notifications/subscribe`
- **Description:** Deletes a passenger alert subscription.
- **Access:** Private
- **Request Body (JSON):**
  ```json
  {
    "stopId": "65b2d8e4f5a3b2b8c9d01235",
    "routeId": "65b2d8e4f5a3b2b8c9d01236"
  }
  ```
- **Responses:**
  - `200 OK`
  - `404 Not Found`

#### **GET** `/api/notifications`
- **Description:** Lists the passenger's alert configurations. Runs current ETA calculations to check if threshold triggers are met.
- **Access:** Private
- **Responses:**
  - `200 OK`: `{"message": "Subscriptions fetched successfully", "count": 1, "subscriptions": [...]}`

---

### 11. System Administration (`/api/admin`)

#### **GET** `/api/admin/users`
- **Description:** Lists all registered user profiles.
- **Access:** Private (Admin Only)
- **Query Params:**
  - `role` (string, optional): `"admin"` | `"driver"` | `"user"`
  - `page` (number, optional)
  - `limit` (number, optional)
- **Responses:**
  - `200 OK`

#### **PATCH** `/api/admin/users/:userId/role`
- **Description:** Changes user role permissions.
- **Access:** Private (Admin Only)
- **Path Parameters:**
  - `userId` (string, required)
- **Request Body (JSON):**
  ```json
  {
    "role": "driver"
  }
  ```
- **Responses:**
  - `200 OK`
  - `400 Bad Request`: Invalid role, or attempting to demote your own admin account.
  - `404 Not Found`

#### **GET** `/api/admin/system/health`
- **Description:** Verifies availability and tests latency of database nodes and Redis caches.
- **Access:** Private (Admin Only)
- **Responses:**
  - `200 OK`: `{"status": "ok", "timestamp": "...", "services": { "mongodb": { "status": "ok", "latency_ms": 2 }, "redis": { "status": "ok", "latency_ms": 1 } }}`
  - `503 Service Unavailable`: Degraded services (latency details are included).

#### **GET** `/api/admin/system/instances`
- **Description:** Retrieves a registry list of active Node.js server load instances registered in the shared Redis cache.
- **Access:** Private (Admin Only)
- **Responses:**
  - `200 OK`: `{"message": "Instances fetched successfully", "count": 1, "instances": [...]}`
  - `503 Service Unavailable`: Redis service is offline.

