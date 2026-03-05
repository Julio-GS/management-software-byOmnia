import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './window-manager';
import { registerIpcHandlers } from './ipc-handlers';
import { configureLogger, getLogger } from './utils/logger';
import { isDevelopment } from './utils/environment';

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

  // App ready event
  app.whenReady().then(() => {
    log.info('App ready, creating main window...');
    createMainWindow();

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
  });
}
