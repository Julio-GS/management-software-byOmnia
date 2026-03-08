# Desktop Authentication System 🔐

## Overview

The Omnia Desktop application uses an **automatic authentication system** designed for cashiers. The cashier **never sees a login screen** - authentication happens automatically in the background with intelligent token management.

## 🎯 Key Features

✅ **Zero-touch authentication** - No login screen
✅ **Automatic token refresh** - Every 50 minutes in background
✅ **Smart 401 recovery** - Tries refresh, then re-login
✅ **Offline-first** - Works without backend
✅ **Secure storage** - OS-level encryption
✅ **Seamless UX** - No interruptions for cashier

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              DESKTOP APP STARTUP                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1️⃣  Initialize Database (SQLite)                   │
│      ↓                                               │
│  2️⃣  Show Main Window (UI)                          │
│      ↓                                               │
│  3️⃣  Authenticate in Background                     │
│      ├─ Stored token valid? → Use it ✓              │
│      ├─ Token expired? → Refresh it ✓               │
│      └─ No token/invalid? → Auto-login ✓            │
│      ↓                                               │
│  4️⃣  Start Background Sync (if authenticated)       │
│      ↓                                               │
│  5️⃣  Auto-refresh token every 50 minutes            │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Components

### 1. **HttpClient** (`electron/api/http-client.ts`)
Axios-based HTTP client with automatic authentication.

**Features**:
- Automatic Bearer token injection
- Automatic 401 retry with token refresh  
- Prevents infinite retry loops
- Clean TypeScript types

**Example**:
```typescript
// No manual token handling needed!
const products = await httpClient.get('/api/v1/products');
const product = await httpClient.post('/api/v1/products', data);
```

### 2. **AuthService** (`electron/auth/auth-service.ts`)
Handles all authentication logic.

**Key Methods**:
- `initialize()` - Smart startup authentication
- `login()` - Automatic login with credentials
- `validateToken()` - Check if token is valid (uses `/api/v1/auth/me`)
- `refreshAccessToken()` - Get new token using refresh token
- `scheduleTokenRefresh()` - Background refresh every 50 minutes
- `handleUnauthorized()` - Smart 401 recovery

**Flow**:
```
App Start
  ↓
Load stored tokens
  ↓
Validate access_token → Valid? ✓ Use it
  ↓                      Invalid? ↓
Try refresh_token ────────────────→ Success? ✓ New access_token
  ↓                                  Failed? ↓
Full login with credentials ─────────────────→ Success! ✓
  ↓
Schedule auto-refresh (every 50 min)
```

### 3. **TokenStore** (`electron/auth/token-store.ts`)
Secure token storage using OS-level encryption.

**Storage**:
- Windows: DPAPI (Data Protection API)
- macOS: Keychain
- Linux: libsecret

**Files**:
- `auth-access-token.enc` - Access token (60 min lifespan)
- `auth-refresh-token.enc` - Refresh token (7 day lifespan)

## Token Lifecycle

```
┌────────────────────────────────────────────────────┐
│                  TOKEN STATES                       │
├────────────────────────────────────────────────────┤
│                                                     │
│  Fresh Login                                        │
│  ↓                                                  │
│  access_token (60 min) + refresh_token (7 days)   │
│  ↓                                                  │
│  [0-50 min] → Use access_token normally            │
│  ↓                                                  │
│  [50 min] → Auto-refresh (background)              │
│  ↓                                                  │
│  New access_token (seamless, no interruption)      │
│  ↓                                                  │
│  [50 min later] → Auto-refresh again...            │
│  ↓                                                  │
│  [If 401] → Try refresh_token                      │
│  ↓                                                  │
│  [Refresh failed] → Auto re-login                  │
│                                                     │
└────────────────────────────────────────────────────┘
```

## API Endpoints

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "caja1@supermercado.com",
  "password": "CajaSegura2024!",
  "deviceId": "caja-001",
  "deviceType": "desktop"
}

Response:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "caja1@supermercado.com",
    "name": "Caja 1",
    "role": "cashier"
  }
}
```

### Token Refresh
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

Response:
{
  "access_token": "eyJhbGc..."
}
```

### Validate Token (Get Current User)
```http
GET /api/v1/auth/me
Authorization: Bearer eyJhbGc...

Response:
{
  "id": "uuid",
  "email": "caja1@supermercado.com",
  "name": "Caja 1",
  "role": "cashier"
}
```

## Configuration

### Environment Variables
Create `apps/desktop/.env` from `.env.example`:

```env
# Backend API
BACKEND_URL=http://localhost:8080

# Auto-login credentials (NEVER show login screen)
DESKTOP_USER_EMAIL=caja1@supermercado.com
DESKTOP_USER_PASSWORD=CajaSegura2024!

# Unique device ID
DESKTOP_DEVICE_ID=caja-001

# Optional: Store ID
DESKTOP_STORE_ID=tienda-central

# Debug settings
DEBUG=false
LOG_LEVEL=info
```

### Production Deployment

For production installations:

1. **Per-Device Credentials**: Each desktop installation should have unique credentials
2. **Secure Storage**: Credentials should be encrypted and stored securely during installation
3. **Device ID**: Generate unique device IDs based on hardware (MAC address, CPU ID, etc.)

## Error Handling

All errors are handled gracefully:

| Scenario                 | Behavior                            |
|--------------------------|-------------------------------------|
| No stored token          | ✅ Automatic login                  |
| Invalid access_token     | ✅ Try refresh_token                |
| Refresh failed           | ✅ Full re-login                    |
| Backend offline          | ✅ Offline mode (local DB works)    |
| 401 during request       | ✅ Auto-retry with new token        |
| Network error            | ✅ Queue for later sync             |
| Startup error            | ✅ Show UI anyway (offline mode)    |

**The cashier NEVER sees errors** - everything is handled automatically.

## Security Features

✅ **OS-level encryption** for stored tokens
✅ **Separate storage** for access and refresh tokens  
✅ **No plaintext credentials** in memory after login
✅ **Secure transmission** (Bearer header)
✅ **Automatic cleanup** on logout
✅ **Token rotation** (refresh tokens)
✅ **Device identification** (prevents token sharing)

## Development

### Running Locally

```bash
# Terminal 1: Backend
cd apps/backend
pnpm dev

# Terminal 2: Desktop
cd apps/desktop
pnpm dev
```

### Testing Authentication

#### Fresh Start (No Tokens)
```bash
# Delete stored tokens (Windows)
del "%APPDATA%\management-software-byOmnia\auth-*.enc"

# Delete stored tokens (macOS/Linux)
rm ~/Library/Application\ Support/management-software-byOmnia/auth-*.enc

# Start app
pnpm dev

# Expected: Automatic login, no prompts
```

#### Restart with Valid Token
```bash
# Just restart the app
pnpm dev

# Expected: Instant authentication, no login
```

#### Test Token Refresh
```bash
# In auth-service.ts, temporarily change:
const refreshInterval = 50 * 60 * 1000; // 50 minutes
# to:
const refreshInterval = 60 * 1000; // 1 minute

# Wait 1 minute, check logs:
# "Auto-refreshing token in background..."
# "Access token refreshed successfully"
```

### Debugging

**Enable debug logs**:
```env
DEBUG=true
LOG_LEVEL=debug
```

**Check logs for**:
```
✓ Initializing authentication...
✓ Found stored access token, validating...
✓ Stored token is valid
✓ Token valid for user: Caja 1 (caja1@supermercado.com)
✓ Token refresh scheduled in 50 minutes
```

**Or**:
```
⚠ Stored access token is invalid
✓ Attempting to refresh token...
✓ Access token refreshed successfully
```

**Or**:
```
⚠ Token refresh failed, clearing tokens...
✓ No valid token found, performing auto-login...
✓ Attempting login for caja1@supermercado.com...
✓ Login successful
✓ Logged in as: Caja 1 (cashier)
```

## Troubleshooting

### Problem: App won't start
**Solution**: Check logs for initialization errors. Ensure database can be created.

### Problem: "Login failed: 401"
**Solution**: Check credentials in `.env` match backend user.

### Problem: "No access token received"
**Solution**: Verify backend is running and `/api/v1/auth/login` works.

### Problem: Token keeps expiring
**Solution**: Check backend JWT expiry settings. Refresh interval should be less than token lifetime.

### Problem: Offline mode not working
**Solution**: Database must initialize before auth. Check db-manager logs.

### Log Files Location

- Windows: `%APPDATA%\management-software-byOmnia\logs\`
- macOS: `~/Library/Logs/management-software-byOmnia/`
- Linux: `~/.config/management-software-byOmnia/logs/`

## Recent Changes (2026-03-08)

### ✅ Fixed Authentication Issues
1. **Migrated from fetch to axios** for better request handling
2. **Fixed token validation** - Now uses `/api/v1/auth/me` instead of non-existent endpoint
3. **Added automatic token refresh** - Background refresh every 50 minutes
4. **Fixed API routes** - All endpoints now use `/api/v1/` prefix
5. **Non-blocking startup** - UI shows immediately, auth happens in background
6. **Smart 401 recovery** - Tries refresh first, then full re-login
7. **Fixed token format** - Backend returns `access_token`, not `accessToken`

### 📚 Documentation Added
- `AUTH_FIX_SUMMARY.md` - Detailed summary of all changes
- `AUTH_FIX_VERIFICATION.md` - Testing and verification guide
- `AUTH_README.md` - This file (updated)

## Future Enhancements

- [ ] Biometric authentication (fingerprint)
- [ ] QR code login (manager override)
- [ ] Multi-factor authentication (SMS)
- [ ] Session analytics dashboard
- [ ] Token revocation management
- [ ] Automatic credential rotation

---

**Need Help?**
- Check logs: `%APPDATA%\management-software-byOmnia\logs\`
- Read verification guide: `AUTH_FIX_VERIFICATION.md`
- Read summary: `AUTH_FIX_SUMMARY.md`
