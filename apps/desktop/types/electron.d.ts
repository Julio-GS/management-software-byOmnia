/**
 * Type definitions for Electron API exposed to renderer process
 */

export interface ElectronAPI {
  // System info
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  getUserDataPath: () => Promise<string>;

  // File operations
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;

  // Dialog operations
  showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
  showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
  showMessageBox: (options: Electron.MessageBoxOptions) => Promise<Electron.MessageBoxReturnValue>;

  // Auth operations
  auth: {
    getToken: () => Promise<{ success: boolean; token?: string; error?: string }>;
    getUser: () => Promise<{ success: boolean; user?: any; error?: string }>;
    isAuthenticated: () => Promise<{ success: boolean; isAuthenticated: boolean; user?: any }>;
  };
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};
