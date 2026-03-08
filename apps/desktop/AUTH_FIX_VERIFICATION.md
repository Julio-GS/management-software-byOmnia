# Electron Auth Fix - Verification Guide

## Changes Made

### 1. Migrated from `fetch` to `axios`
- **File**: `apps/desktop/electron/api/http-client.ts`
- **Why**: Better request/response handling, cleaner interceptors
- **Features**:
  - Automatic token injection
  - Automatic 401 retry with token refresh
  - Better error handling

### 2. Fixed Authentication Flow
- **File**: `apps/desktop/electron/auth/auth-service.ts`
- **Improvements**:
  - Token validation uses `/api/v1/auth/me` instead of non-existent `/auth/validate`
  - Automatic token refresh every 50 minutes (background)
  - Seamless re-authentication on 401 errors
  - Proper handling of `access_token` vs `accessToken` naming

### 3. Updated Token Store
- **File**: `apps/desktop/electron/auth/token-store.ts`
- **Improvements**:
  - Separate storage for access_token and refresh_token
  - Better backwards compatibility

### 4. Fixed Backend Routes
- **Files**: `apps/desktop/electron/sync/sync-service.ts`
- **Changes**: All API calls now use `/api/v1/` prefix correctly

### 5. Improved Startup Flow
- **File**: `apps/desktop/electron/main.ts`
- **Changes**:
  - Database initializes first
  - UI shows immediately
  - Auth happens in background (non-blocking)
  - App works in offline mode if auth fails

## Testing Checklist

### Before Testing
1. Make sure backend is running on `http://localhost:8080`
2. Verify you have valid credentials in `apps/desktop/.env`:
   ```
   BACKEND_URL=http://localhost:8080
   DESKTOP_EMAIL=cajera@omnia.com
   DESKTOP_PASSWORD=password123
   DESKTOP_DEVICE_ID=desktop-001
   ```

### Test Scenarios

#### ✅ Fresh Start (No Stored Token)
1. Delete stored tokens:
   - Windows: `%APPDATA%\management-software-byOmnia\auth-*.enc`
   - macOS: `~/Library/Application Support/management-software-byOmnia/auth-*.enc`
   - Linux: `~/.config/management-software-byOmnia/auth-*.enc`
2. Run: `pnpm dev` from `apps/desktop`
3. **Expected**: App starts, shows UI immediately, authenticates in background
4. **Check logs**: Should see "Login successful"

#### ✅ Restart with Valid Token
1. Close the app (keep tokens)
2. Restart: `pnpm dev`
3. **Expected**: App starts instantly, no login needed
4. **Check logs**: Should see "Stored token is valid"

#### ✅ Token Refresh (Background)
1. Wait 50 minutes OR manually trigger by modifying the refresh interval in code
2. **Expected**: Token refreshes automatically in background
3. **Check logs**: Should see "Auto-refreshing token in background..."

#### ✅ Expired Token Handling
1. Stop backend
2. Wait for access token to expire (60 min) OR delete access token file only
3. Restart app
4. **Expected**: App tries to refresh using refresh_token
5. **Check logs**: Should see "Attempting to refresh token..."

#### ✅ Complete Re-authentication (401)
1. Invalidate both tokens (delete both files)
2. Restart app
3. **Expected**: Full re-login happens automatically
4. **Check logs**: Should see "No valid token found, performing auto-login..."

#### ✅ Offline Mode
1. Stop backend completely
2. Start app
3. **Expected**: App starts in offline mode, UI works, local DB accessible
4. **Check logs**: Should see "Running in offline mode (authentication failed)"

## API Endpoints Used

- `POST /api/v1/auth/login` - Initial login
- `GET /api/v1/auth/me` - Token validation
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/sync/logs` - Sync logs
- `GET /api/v1/sync/logs` - Get sync updates
- `POST /api/v1/products` - Create product
- `PATCH /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product
- (Similar for categories, inventory, sales)

## Expected Backend Response Format

### Login Response
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "cajera@omnia.com",
    "name": "Cajera",
    "role": "cashier"
  }
}
```

### Refresh Response
```json
{
  "access_token": "eyJhbGc..."
}
```

### Auth Me Response
```json
{
  "id": "uuid",
  "email": "cajera@omnia.com",
  "name": "Cajera",
  "role": "cashier"
}
```

## Common Issues & Solutions

### Issue: "No access token received from server"
- **Cause**: Backend not returning `access_token`
- **Solution**: Check backend auth service is running and returning correct format

### Issue: "Token validation failed"
- **Cause**: `/api/v1/auth/me` endpoint not working
- **Solution**: Verify backend JWT guard is properly configured

### Issue: "Login failed: 401"
- **Cause**: Invalid credentials in `.env`
- **Solution**: Check DESKTOP_EMAIL and DESKTOP_PASSWORD match backend user

### Issue: App closes immediately after start
- **Cause**: Critical auth error
- **Solution**: Check electron logs, run in dev mode to see errors

## Log Files Location

- **Electron logs**: Check console when running `pnpm dev`
- **Backend logs**: Check NestJS console output
- **Token files**: 
  - Windows: `%APPDATA%\management-software-byOmnia\`
  - macOS: `~/Library/Application Support/management-software-byOmnia/`
  - Linux: `~/.config/management-software-byOmnia/`

## Next Steps

After verifying everything works:

1. **Test sync functionality** - Create a product, verify it syncs
2. **Test offline queue** - Disconnect backend, make changes, reconnect
3. **Test long sessions** - Leave app running for >1 hour to test auto-refresh
4. **Production build** - Test with `pnpm build && pnpm start`

## For the Cashier Experience

The cashier should NEVER see:
- ❌ Login screens after first setup
- ❌ "Session expired" messages
- ❌ Manual refresh buttons
- ❌ App crashes from auth issues

The cashier WILL experience:
- ✅ Instant app startup
- ✅ Automatic authentication
- ✅ Seamless token refresh
- ✅ Offline mode when backend is down
- ✅ Automatic reconnection when backend comes back
