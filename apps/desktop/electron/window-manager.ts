import { BrowserWindow, shell } from 'electron';
import path from 'path';
import { isDevelopment } from './utils/environment';
import { getWebAppPath } from './utils/paths';
import { getLogger } from './utils/logger';

const log = getLogger();

let mainWindow: BrowserWindow | null = null;

/**
 * Create the main application window
 */
export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show until ready
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Load the app
  if (isDevelopment()) {
    // In development, connect to Next.js dev server
    const devUrl = process.env.ELECTRON_DEV_URL || 'http://localhost:3000';
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
    log.info(`Loading development URL: ${devUrl}`);
  } else {
    // In production, load static files
    const webPath = getWebAppPath();
    const indexPath = path.join(webPath, 'index.html');
    mainWindow.loadFile(indexPath);
    log.info(`Loading production file: ${indexPath}`);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    log.info('Main window ready');
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
    log.info('Main window closed');
  });

  log.info('Main window created');
  return mainWindow;
}

/**
 * Get the main window instance
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
