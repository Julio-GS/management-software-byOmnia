import log from 'electron-log';
import { getLogsPath } from './paths';
import path from 'path';
import fs from 'fs';

/**
 * Configure electron-log
 * Safe to call before app.whenReady()
 */
export function configureLogger(): void {
  // Set log file location with lazy evaluation
  log.transports.file.resolvePathFn = () => {
    const logsPath = getLogsPath();
    
    // Ensure logs directory exists
    try {
      if (!fs.existsSync(logsPath)) {
        fs.mkdirSync(logsPath, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
    
    return path.join(logsPath, 'main.log');
  };
  
  // Set log level based on environment
  log.transports.file.level = 'info';
  log.transports.console.level = 'debug';
  
  // Log format
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
}

/**
 * Get the configured logger instance
 */
export function getLogger() {
  return log;
}
