# Session Security Implementation

## Overview
Implemented comprehensive session tracking and management system to ensure that each browser/device has a unique session that can be viewed, managed, and revoked independently.

## What Was Implemented

### 1. Database Models

#### Session Model (`src/models/Session.js`)
- **Fields:**
  - `userId`: Reference to the user
  - `sessionToken`: Unique token for each session
  - `ipAddress`: IP address of the device
  - `userAgent`: Browser user agent string
  - `browser`, `os`, `device`: Parsed device information
  - `isActive`: Whether the session is still valid
  - `lastActive`: Last activity timestamp
  - `expiresAt`: When the session expires (30 days from creation)

#### LoginHistory Model (`src/models/LoginHistory.js`)
- **Fields:**
  - `userId`: Reference to the user (optional for failed logins)
  - `email`: Email used in login attempt
  - `ipAddress`: IP address
  - `userAgent`: Browser user agent string
  - `success`: Whether login was successful
  - `failureReason`: Reason for failure (if applicable)
  - `createdAt`: Timestamp

### 2. Authentication Flow Changes

#### NextAuth Configuration (`src/app/api/auth/[...nextauth]/route.js`)

**On Login (authorize callback):**
1. Validates credentials
2. Logs failed attempts with reasons:
   - User not found
   - Invalid password
   - Account inactive
   - Vendor pending approval
   - Vendor rejected
3. On success:
   - Generates unique `sessionToken`
   - Creates Session record with device info
   - Logs successful login in LoginHistory
   - Returns sessionToken in user object

**JWT Callback:**
- Adds `sessionToken` to JWT for tracking

**Session Callback:**
- Includes `sessionToken` in session object
- Updates `lastActive` timestamp on each request

**SignOut Event:**
- Marks session as inactive when user signs out

### 3. Session APIs

#### Get Sessions (`GET /api/auth/sessions`)
- Fetches all active sessions for current user
- Parses user agent to extract browser, OS, device info
- Returns sessions sorted by last active

#### Revoke Session (`DELETE /api/auth/sessions?sessionId=xxx`)
- Revokes a specific session
- Prevents revoking current session (must use sign out)
- Verifies session belongs to current user

#### Revoke All Sessions (`DELETE /api/auth/sessions?action=all`)
- Revokes all sessions except the current one
- Useful for "Sign out everywhere else"

#### Validate Session (`POST /api/auth/validate-session`)
- Checks if a session is still active
- Updates last active timestamp
- Used by middleware for request validation

### 4. Middleware Protection (`src/middleware.js`)

**Request Validation:**
- Checks JWT token exists
- For dashboard routes:
  - Validates session is active in database
  - Redirects to signin if session revoked
- Allows public routes without checks

### 5. Client-Side Integration

#### Sign In Page (`src/app/auth/signin/page.jsx`)
- Calls `/api/auth/signin` to get IP and user agent from server
- Passes these to NextAuth credentials
- Ensures accurate device tracking

#### Settings Page (`src/app/dashboard/settings/page.jsx`)

**Security Tab Features:**
- **Active Sessions Display:**
  - Shows all active sessions
  - Displays browser, OS, device, IP address
  - Shows last active time
  - Marks current session with badge
  - "Revoke" button for each session
  - "Revoke All Others" button

- **Login History:**
  - Shows recent login attempts
  - Success/failure status
  - Device information
  - Timestamp

- **Change Password:**
  - Validates current password
  - Enforces minimum password length
  - Updates password in database

## How It Works

### When User Logs In:
1. User enters credentials on signin page
2. Frontend calls `/api/auth/signin` to get IP/user agent
3. Credentials + metadata sent to NextAuth
4. NextAuth validates credentials
5. If valid:
   - Creates unique session in database
   - Logs successful login
   - Returns JWT with sessionToken
6. If invalid:
   - Logs failed attempt with reason
   - Returns error

### On Each Request:
1. Middleware checks JWT token
2. Extracts sessionToken from JWT
3. Validates session is active in database
4. Updates lastActive timestamp
5. If session revoked:
   - Redirects to signin
6. If session valid:
   - Allows request to proceed

### When User Opens in New Browser:
1. No JWT cookie = No authentication
2. User must login again
3. New unique session created
4. Both sessions tracked independently
5. User can see both in Settings → Security
6. Can revoke the old session if desired

### When User Revokes a Session:
1. Session marked as `isActive: false`
2. Next request with that session's token:
   - Middleware validation fails
   - User redirected to signin
3. Other sessions unaffected

### When User Signs Out:
1. SignOut event triggered
2. Current session marked inactive
3. User redirected to signin
4. JWT token cleared from browser

## Security Benefits

1. **Device Tracking:** See where you're logged in
2. **Session Isolation:** Each browser/device has unique session
3. **Remote Revocation:** Revoke sessions from other devices
4. **Activity Monitoring:** See when sessions were last active
5. **Audit Trail:** Complete login history with success/failure
6. **Failed Login Detection:** Track unauthorized access attempts
7. **Account Compromise Recovery:** Revoke all sessions if account compromised

## Testing the Implementation

### Test 1: Multiple Browser Sessions
1. Login in Chrome → New session created
2. Copy dashboard URL
3. Open URL in Firefox (without logging in) → Redirected to signin
4. Login in Firefox → New separate session created
5. Go to Settings → Security in Chrome
6. Should see 2 active sessions
7. Revoke Firefox session
8. Firefox redirected to signin on next request

### Test 2: Session Revocation
1. Login on Device A
2. Login on Device B
3. On Device A: Settings → Security → Revoke All Others
4. Device B redirected to signin on next request
5. Device A remains logged in

### Test 3: Failed Login Tracking
1. Try to login with wrong password
2. Login with correct credentials
3. Go to Settings → Security → Login History
4. Should see failed attempt followed by successful login
5. Failed entry shows reason: "Invalid password"

### Test 4: Sign Out
1. Login and create session
2. Sign out
3. Try to access dashboard
4. Redirected to signin
5. Session marked inactive in database

## Files Modified/Created

### Created:
- `src/middleware.js` - Request validation middleware
- `src/app/api/auth/signin/route.js` - Extract IP/user agent
- `src/app/api/auth/validate-session/route.js` - Session validation endpoint
- `src/models/Session.js` - Session database model
- `src/models/LoginHistory.js` - Login history database model
- `src/app/api/auth/sessions/route.js` - Session management API
- `src/app/api/auth/login-history/route.js` - Login history API

### Modified:
- `src/app/api/auth/[...nextauth]/route.js` - Added session tracking
- `src/app/auth/signin/page.jsx` - Pass IP/user agent to auth
- `src/app/dashboard/settings/page.jsx` - Already had UI, now connected to real data

## Environment Variables Required
```env
NEXTAUTH_SECRET=your-secret-here
MONGODB_URI=your-mongodb-connection-string
```

## Database Indexes
The models include indexes for performance:
- Session: `{ userId: 1, isActive: 1, expiresAt: 1 }`
- LoginHistory: `{ userId: 1, createdAt: -1 }`

## Notes
- Sessions expire after 30 days (configurable)
- Inactive sessions automatically filtered out
- Middleware only validates dashboard routes
- Public routes and API routes excluded from validation
- Failed login attempts tracked even if user doesn't exist
- Session token stored in JWT (client-side) and database (server-side)
- Browser/OS/Device info parsed from user agent string
