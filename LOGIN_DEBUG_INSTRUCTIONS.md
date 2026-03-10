# Login Response Debug Instructions

## Current Status

**Backend:** Returns 201 Created (confirmed working)  
**Frontend:** Gets `undefined` when accessing `response.access_token`

## Changes Made

I've added comprehensive debug logging at three levels:

### 1. ApiClient.post (packages/api-client/src/client.ts:68-76)
```typescript
async post<T>(...) {
  console.log('🔍 ApiClient.post - URL:', url);
  console.log('🔍 ApiClient.post - Data:', data);
  const response = await this.axios.post<T>(url, data, config);
  console.log('🔍 ApiClient.post - Full response:', response);
  console.log('🔍 ApiClient.post - response.data:', response.data);
  console.log('🔍 ApiClient.post - response.status:', response.status);
  return response.data;
}
```

### 2. AuthService.login (packages/api-client/src/auth.service.ts:15-29)
```typescript
async login(credentials: LoginRequest): Promise<LoginResponse> {
  console.log('🔍 AuthService.login - Credentials:', { email: credentials.email });
  try {
    const result = await this.client.post<LoginResponse>(...);
    console.log('🔍 AuthService.login - Result:', result);
    console.log('🔍 AuthService.login - Result type:', typeof result);
    console.log('🔍 AuthService.login - Result keys:', Object.keys(result));
    return result;
  } catch (error) {
    console.error('🔍 AuthService.login - Error:', error);
    throw error;
  }
}
```

### 3. auth-context.tsx login (apps/web/src/contexts/auth-context.tsx:92-112)
```typescript
const login = async (credentials: LoginRequest) => {
  console.log('🔍 DEBUG: Calling apiClient.auth.login...');
  const response = await apiClient.auth.login(credentials);
  
  console.log('🔍 DEBUG: LOGIN RESPONSE:', response);
  console.log('🔍 DEBUG: RESPONSE TYPE:', typeof response);
  console.log('🔍 DEBUG: RESPONSE KEYS:', Object.keys(response));
  console.log('🔍 DEBUG: access_token:', response?.access_token);
  // ... rest of code
}
```

### 4. Added getToken to api-client-instance (apps/web/lib/api-client-instance.ts:42-46)
```typescript
export const apiClient = new OmniaApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1",
  getToken: getAccessToken,  // ✅ Added this
  onUnauthorized: handle401,
  environment: "web",
});
```

## Testing Steps

### Step 1: Rebuild Everything
```powershell
# From project root
cd packages/api-client
pnpm build

cd ../../apps/web
# Kill existing dev server (Ctrl+C)
rm -r .next -ErrorAction SilentlyContinue  # Clear Next.js cache
pnpm dev
```

### Step 2: Open Browser Console
1. Open http://localhost:3000/login
2. Press F12 to open DevTools
3. Go to "Console" tab
4. Clear console (Ctrl+L or click clear button)

### Step 3: Attempt Login
Use credentials:
- Email: `admin@omnia.com`
- Password: `Admin123!`

### Step 4: Check Console Output

You should see a sequence like this:

```
🔍 DEBUG: Calling apiClient.auth.login...
🔍 AuthService.login - Credentials: { email: "admin@omnia.com" }
🔍 ApiClient.post - URL: /auth/login
🔍 ApiClient.post - Data: { email: "admin@omnia.com", password: "..." }
🔍 ApiClient.post - Full response: { status: 201, data: {...}, ... }
🔍 ApiClient.post - response.data: { access_token: "...", refresh_token: "...", user: {...} }
🔍 ApiClient.post - response.status: 201
🔍 AuthService.login - Result: { access_token: "...", refresh_token: "...", user: {...} }
🔍 AuthService.login - Result type: object
🔍 AuthService.login - Result keys: ["access_token", "refresh_token", "user"]
🔍 DEBUG: LOGIN RESPONSE: { access_token: "...", refresh_token: "...", user: {...} }
🔍 DEBUG: RESPONSE TYPE: object
🔍 DEBUG: RESPONSE KEYS: ["access_token", "refresh_token", "user"]
🔍 DEBUG: access_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 5: Check Network Tab
1. Go to "Network" tab in DevTools
2. Find the `POST /api/v1/auth/login` request
3. Click on it
4. Go to "Response" tab
5. **Copy the exact response body** and send it to me

## Possible Scenarios

### Scenario A: Console Shows Valid Response
If console shows the response correctly but login still fails:
- **Root Cause:** Issue is in token storage or redirect logic
- **Fix:** Check `tokenStorage.setTokens()` implementation

### Scenario B: Console Shows undefined at ApiClient Level
If `ApiClient.post - response.data:` shows `undefined`:
- **Root Cause:** Backend is not returning JSON body
- **Fix:** Check backend response format or Content-Type header

### Scenario C: Console Shows Error
If console shows an error:
- **Root Cause:** Network error, CORS, or backend error
- **Fix:** Check error message and backend logs

### Scenario D: No Console Logs Appear
If NO console logs appear:
- **Root Cause:** Code changes not applied (caching issue)
- **Fix:** Hard refresh (Ctrl+Shift+R) or rebuild from scratch

## Direct Fetch Test

If all else fails, test the backend directly in browser console:

```javascript
fetch('http://localhost:8080/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: 'admin@omnia.com', 
    password: 'Admin123!' 
  })
})
.then(r => {
  console.log('Status:', r.status);
  return r.json();
})
.then(data => console.log('Backend Direct Response:', data))
.catch(err => console.error('Fetch Error:', err));
```

This bypasses the API client completely and shows EXACTLY what the backend returns.

## Return to Me

Please provide:

1. **Full console output** (screenshot or copy-paste)
2. **Network tab response body** (from Response tab)
3. **Direct fetch test result** (if needed)
4. **Any errors shown** (in red in console)

This will tell us exactly where the data is getting lost!

## Expected Backend Response

Based on the code, backend should return:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@omnia.com",
    "firstName": "System",
    "lastName": "Administrator",
    "role": "admin",
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "...",
    "lastLoginAt": "..."
  }
}
```

**Note:** `password` field should NOT be in the response (it's excluded by UserEntity).
