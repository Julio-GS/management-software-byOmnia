import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './window-manager';
import { registerIpcHandlers } from './ipc-handlers';
import { configureLogger, getLogger } from './utils/logger';
import { isDevelopment } from './utils/environment';
import { dbManager } from './database/db-manager';
import { registerDatabaseHandlers } from './database/ipc-handlers';
import { seedDatabase } from './database/seed';
import { authService } from './auth/auth-service';
import { syncService } from './sync/sync-service';
import { wsClient } from './sync/websocket-client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

// Configure logger first
configureLogger();
const log = getLogger();

log.info('Application starting...');
log.info(`Environment: ${isDevelopment() ? 'development' : 'production'}`);
log.info(`Platform: ${process.platform}`);

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  log.warn('Another instance is already running, quitting...');
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Register IPC handlers
  registerIpcHandlers();
  registerDatabaseHandlers();

  // App ready event
  app.whenReady().then(async () => {
    log.info('App ready, initializing...');
    
    try {
      // 1. Initialize database first (needed for offline mode)
      log.info('Initializing database...');
      await dbManager.initialize();
      log.info('✓ Database initialized');

      // 2. Seed database if needed
      await seedDatabase();
      log.info('✓ Database seeded (if needed)');

      // 3. Create main window (show UI as soon as possible)
      log.info('Creating main window...');
      const mainWindow = createMainWindow();
      log.info('✓ Main window created');

      // 4. Initialize authentication in background (non-blocking)
      log.info('Initializing authentication in background...');
      authService
        .initialize()
        .then((token) => {
          log.info('✓ Authentication initialized successfully');

          // 5. Set main window for WebSocket client
          wsClient.setMainWindow(mainWindow);

          // 6. Start background sync with WebSocket
          const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
          
          if (token) {
            log.info('Starting background sync with WebSocket...');
            syncService.startAutoSync(token, backendUrl);
            log.info('✓ Background sync and WebSocket started');
          } else {
            log.warn('No auth token available after init, running in offline mode');
          }

          log.info('✓ Application fully ready');
        })
        .catch((error) => {
          log.error('Authentication initialization failed:', error);
          log.warn('⚠ Running in offline mode (authentication failed)');
          
          // App continues to work in offline mode
          // Sync will be disabled but local operations work
        });

    } catch (error) {
      log.error('Failed to initialize application:', error);
      
      // Try to create window anyway for user to see error
      try {
        createMainWindow();
      } catch (windowError) {
        log.error('Failed to create window:', windowError);
        app.quit();
      }
    }

    // On macOS, re-create window when dock icon is clicked
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  // Quit when all windows are closed (except on macOS)
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      log.info('All windows closed, quitting app...');
      app.quit();
    }
  });

  // Handle app before quit
  app.on('before-quit', () => {
    log.info('Application quitting...');
    
    // Stop background sync
    try {
      syncService.stopAutoSync();
      log.info('Background sync stopped');
    } catch (error) {
      log.error('Error stopping sync:', error);
    }

    // Close database connection
    try {
      dbManager.close();
      log.info('Database closed');
    } catch (error) {
      log.error('Error closing database:', error);
    }
  });
}
