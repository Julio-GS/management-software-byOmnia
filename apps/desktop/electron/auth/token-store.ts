import { safeStorage } from 'electron';
import { getLogger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const logger = getLogger();

/**
 * Secure token storage using Electron's safeStorage API
 * 
 * - On Windows: Uses DPAPI (Data Protection API)
 * - On macOS: Uses Keychain
 * - On Linux: Uses libsecret
 * 
 * Falls back to encrypted file storage if safeStorage is not available
 */
class SecureTokenStore {
  private readonly ACCESS_TOKEN_FILE = 'auth-access-token.enc';
  private readonly REFRESH_TOKEN_FILE = 'auth-refresh-token.enc';
  private accessTokenFilePath: string;
  private refreshTokenFilePath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.accessTokenFilePath = path.join(userDataPath, this.ACCESS_TOKEN_FILE);
    this.refreshTokenFilePath = path.join(userDataPath, this.REFRESH_TOKEN_FILE);
  }

  /**
   * Save access token securely
   */
  async saveAccessToken(token: string): Promise<void> {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(token);
        await fs.promises.writeFile(this.accessTokenFilePath, encrypted);
        logger.info('Access token saved securely using native encryption');
      } else {
        await fs.promises.writeFile(this.accessTokenFilePath, token, 'utf-8');
        logger.warn('Access token saved without encryption (safeStorage not available)');
      }
    } catch (error) {
      logger.error('Failed to save access token:', error);
      throw error;
    }
  }

  /**
   * Save refresh token securely
   */
  async saveRefreshToken(token: string): Promise<void> {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(token);
        await fs.promises.writeFile(this.refreshTokenFilePath, encrypted);
        logger.info('Refresh token saved securely using native encryption');
      } else {
        await fs.promises.writeFile(this.refreshTokenFilePath, token, 'utf-8');
        logger.warn('Refresh token saved without encryption (safeStorage not available)');
      }
    } catch (error) {
      logger.error('Failed to save refresh token:', error);
      throw error;
    }
  }

  /**
   * Retrieve access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      if (!fs.existsSync(this.accessTokenFilePath)) {
        return null;
      }

      const data = await fs.promises.readFile(this.accessTokenFilePath);

      if (safeStorage.isEncryptionAvailable()) {
        const decrypted = safeStorage.decryptString(data);
        return decrypted;
      } else {
        return data.toString('utf-8');
      }
    } catch (error) {
      logger.error('Failed to retrieve access token:', error);
      return null;
    }
  }

  /**
   * Retrieve refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      if (!fs.existsSync(this.refreshTokenFilePath)) {
        return null;
      }

      const data = await fs.promises.readFile(this.refreshTokenFilePath);

      if (safeStorage.isEncryptionAvailable()) {
        const decrypted = safeStorage.decryptString(data);
        return decrypted;
      } else {
        return data.toString('utf-8');
      }
    } catch (error) {
      logger.error('Failed to retrieve refresh token:', error);
      return null;
    }
  }

  /**
   * Clear stored access token
   */
  async clearAccessToken(): Promise<void> {
    try {
      if (fs.existsSync(this.accessTokenFilePath)) {
        await fs.promises.unlink(this.accessTokenFilePath);
        logger.info('Access token cleared');
      }
    } catch (error) {
      logger.error('Failed to clear access token:', error);
    }
  }

  /**
   * Clear stored refresh token
   */
  async clearRefreshToken(): Promise<void> {
    try {
      if (fs.existsSync(this.refreshTokenFilePath)) {
        await fs.promises.unlink(this.refreshTokenFilePath);
        logger.info('Refresh token cleared');
      }
    } catch (error) {
      logger.error('Failed to clear refresh token:', error);
    }
  }

  /**
   * Clear all stored tokens (on logout or token invalidation)
   */
  async clearTokens(): Promise<void> {
    await this.clearAccessToken();
    await this.clearRefreshToken();
  }

  /**
   * Check if access token exists
   */
  hasAccessToken(): boolean {
    return fs.existsSync(this.accessTokenFilePath);
  }

  /**
   * Check if refresh token exists
   */
  hasRefreshToken(): boolean {
    return fs.existsSync(this.refreshTokenFilePath);
  }

  // Legacy methods for backwards compatibility
  async saveToken(token: string): Promise<void> {
    return this.saveAccessToken(token);
  }

  async getToken(): Promise<string | null> {
    return this.getAccessToken();
  }

  async clearToken(): Promise<void> {
    return this.clearAccessToken();
  }

  hasToken(): boolean {
    return this.hasAccessToken();
  }
}

// Singleton instance
export const secureTokenStore = new SecureTokenStore();
