/**
 * Electron API helper utilities
 * Provides type-safe access to Electron APIs from the renderer process
 */

import type { ElectronAPI } from '@omnia/desktop/types/electron';

/**
 * Check if running in Electron environment
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && window.electron !== undefined;
}

/**
 * Get the Electron API instance
 * Throws if not running in Electron
 */
export function getElectronAPI(): ElectronAPI {
  if (!isElectron()) {
    throw new Error('Not running in Electron environment');
  }
  return window.electron!;
}

/**
 * Safely get the Electron API instance
 * Returns null if not running in Electron
 */
export function getElectronAPISafe(): ElectronAPI | null {
  return isElectron() ? window.electron! : null;
}

/**
 * System information helpers
 */
export async function getAppVersion(): Promise<string | null> {
  const api = getElectronAPISafe();
  return api ? await api.getAppVersion() : null;
}

export async function getPlatform(): Promise<string | null> {
  const api = getElectronAPISafe();
  return api ? await api.getPlatform() : null;
}

export async function getUserDataPath(): Promise<string | null> {
  const api = getElectronAPISafe();
  return api ? await api.getUserDataPath() : null;
}

/**
 * File operation helpers
 */
export async function readFile(filePath: string): Promise<string | null> {
  const api = getElectronAPISafe();
  if (!api) return null;

  const result = await api.readFile(filePath);
  return result.success ? result.content! : null;
}

export async function writeFile(filePath: string, content: string): Promise<boolean> {
  const api = getElectronAPISafe();
  if (!api) return false;

  const result = await api.writeFile(filePath, content);
  return result.success;
}

/**
 * Dialog helpers
 */
export async function showOpenDialog(options: any) {
  const api = getElectronAPISafe();
  return api ? await api.showOpenDialog(options) : null;
}

export async function showSaveDialog(options: any) {
  const api = getElectronAPISafe();
  return api ? await api.showSaveDialog(options) : null;
}

export async function showMessageBox(options: any) {
  const api = getElectronAPISafe();
  return api ? await api.showMessageBox(options) : null;
}

/**
 * Auth helpers
 */
export async function getElectronAuthToken(): Promise<string | null> {
  const api = getElectronAPISafe();
  if (!api?.auth) return null;

  const result = await api.auth.getToken();
  return result.success ? result.token! : null;
}

export async function getElectronUser(): Promise<any | null> {
  const api = getElectronAPISafe();
  if (!api?.auth) return null;

  const result = await api.auth.getUser();
  return result.success ? result.user : null;
}

export async function isElectronAuthenticated(): Promise<{ isAuthenticated: boolean; user: any | null; token: string | null }> {
  const api = getElectronAPISafe();
  if (!api?.auth) {
    return { isAuthenticated: false, user: null, token: null };
  }

  const result = await api.auth.isAuthenticated();
  const tokenResult = await api.auth.getToken();
  
  return {
    isAuthenticated: result.success && result.isAuthenticated,
    user: result.user || null,
    token: tokenResult.success ? tokenResult.token || null : null,
  };
}
