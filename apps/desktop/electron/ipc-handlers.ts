import { ipcMain, app, dialog } from 'electron';
import { getLogger } from './utils/logger';
import { getUserDataPath } from './utils/paths';
import fs from 'fs';
import path from 'path';

const log = getLogger();

/**
 * Register all IPC handlers
 */
export function registerIpcHandlers(): void {
  // System information
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('get-platform', () => {
    return process.platform;
  });

  ipcMain.handle('get-user-data-path', () => {
    return getUserDataPath();
  });

  // File operations
  ipcMain.handle('read-file', async (_, filePath: string) => {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      log.error('Error reading file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('write-file', async (_, filePath: string, content: string) => {
    try {
      await fs.promises.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (error) {
      log.error('Error writing file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Dialog operations
  ipcMain.handle('show-open-dialog', async (_, options) => {
    const result = await dialog.showOpenDialog(options);
    return result;
  });

  ipcMain.handle('show-save-dialog', async (_, options) => {
    const result = await dialog.showSaveDialog(options);
    return result;
  });

  ipcMain.handle('show-message-box', async (_, options) => {
    const result = await dialog.showMessageBox(options);
    return result;
  });

  log.info('IPC handlers registered');
}
