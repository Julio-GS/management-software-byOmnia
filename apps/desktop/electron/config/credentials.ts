/**
 * Desktop application credentials configuration
 * 
 * These credentials are used for automatic authentication with the backend.
 * Each desktop installation should have its own credentials configured.
 * 
 * IMPORTANT: In production, these should come from:
 * - Environment variables
 * - Encrypted config file created during installation
 * - System keychain/credential manager
 */

export interface DesktopCredentials {
  email: string;
  password: string;
  deviceId: string; // Unique identifier for this installation
  storeId?: string; // Optional: Which store this terminal belongs to
}

/**
 * Get desktop credentials from environment or fallback to defaults
 * 
 * For development: Uses default credentials
 * For production: Should read from secure storage or environment
 */
export function getDesktopCredentials(): DesktopCredentials {
  return {
    email: process.env.DESKTOP_USER_EMAIL || 'caja1@supermercado.com',
    password: process.env.DESKTOP_USER_PASSWORD || 'CajaSegura2024!',
    deviceId: process.env.DESKTOP_DEVICE_ID || generateDeviceId(),
    storeId: process.env.DESKTOP_STORE_ID,
  };
}

/**
 * Generate a unique device ID based on machine characteristics
 * In production, this should use machine-specific data (MAC address, CPU ID, etc.)
 */
function generateDeviceId(): string {
  // For development: Generate a random ID
  // For production: Use node-machine-id or similar
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `desktop-${timestamp}-${random}`;
}

/**
 * Get backend API URL from environment or fallback to default
 */
export function getBackendUrl(): string {
  return process.env.BACKEND_URL || 'http://localhost:3000';
}
