import { app } from 'electron';

/**
 * Check if the app is running in development mode
 * Safe to call before app.whenReady() - uses process.defaultApp as fallback
 */
export function isDevelopment(): boolean {
  // Before app is ready, check if we're running via electron CLI
  if (!app.isReady()) {
    return process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);
  }
  return !app.isPackaged;
}

/**
 * Check if the app is running in production mode
 */
export function isProduction(): boolean {
  return !isDevelopment();
}

/**
 * Get the environment mode
 */
export function getEnvironmentMode(): 'development' | 'production' {
  return isDevelopment() ? 'development' : 'production';
}
