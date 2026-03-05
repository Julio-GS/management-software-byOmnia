import { app } from 'electron';
import path from 'path';
import { isDevelopment } from './environment';

/**
 * Get the path to the web application resources
 */
export function getWebAppPath(): string {
  if (!isDevelopment()) {
    // In production, web files are in resources/web
    return path.join(process.resourcesPath, 'web');
  } else {
    // In development, use Next.js dev server or built files
    const webOutPath = path.join(__dirname, '..', '..', '..', 'web', 'out');
    return webOutPath;
  }
}

/**
 * Get the user data directory
 * Safe to call before app.whenReady() - uses fallback path
 */
export function getUserDataPath(): string {
  if (!app.isReady()) {
    // Fallback before app is ready
    const homedir = require('os').homedir();
    return path.join(homedir, '.omnia-management');
  }
  return app.getPath('userData');
}

/**
 * Get the logs directory
 */
export function getLogsPath(): string {
  return path.join(getUserDataPath(), 'logs');
}

/**
 * Get the app resources directory
 */
export function getResourcesPath(): string {
  if (!isDevelopment()) {
    return process.resourcesPath;
  } else {
    return path.join(__dirname, '..', '..', 'resources');
  }
}
