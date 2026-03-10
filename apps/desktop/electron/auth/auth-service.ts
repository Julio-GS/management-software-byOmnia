import { getLogger } from '../utils/logger';
import { getDesktopCredentials, getBackendUrl } from '../config/credentials';
import { secureTokenStore } from './token-store';
import { apiClient } from '../api/api-client-instance';
import type { LoginResponse, User } from '@omnia/shared-types';

const logger = getLogger();

// Re-export for convenience
export type AuthResponse = LoginResponse;
export type UserInfo = User;

/**
 * Authentication service for desktop application
 *
 * Handles:
 * - Automatic login on app start
 * - Token storage and retrieval
 * - Token refresh in background
 * - Re-authentication on 401 errors
 * - Seamless experience for cashier (no repeated logins)
 */
class AuthService {
  private currentToken: string | null = null;
  private refreshToken: string | null = null;
  private currentUser: UserInfo | null = null;
  private isAuthenticating = false;
  private authPromise: Promise<string> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    // API client is already configured with token getter and 401 handler
    // in api-client-instance.ts - no need to wire it up here
  }

  /**
   * Initialize authentication on app start
   * Tries to use stored token first, then performs auto-login if needed
   */
  async initialize(): Promise<string> {
    logger.info('Initializing authentication...');

    // Try to load existing tokens
    const storedToken = await secureTokenStore.getAccessToken();
    const storedRefreshToken = await secureTokenStore.getRefreshToken();

    if (storedToken) {
      logger.info('Found stored access token, validating...');
      this.currentToken = storedToken;
      this.refreshToken = storedRefreshToken;

      // Validate token by getting user info
      const isValid = await this.validateToken(storedToken);

      if (isValid) {
        logger.info('Stored token is valid');
        
        // Schedule token refresh before it expires (e.g., refresh every 50 minutes if token lasts 60 min)
        this.scheduleTokenRefresh();
        
        return storedToken;
      } else {
        logger.warn('Stored access token is invalid');

        // Try to refresh with refresh token
        if (storedRefreshToken) {
          logger.info('Attempting to refresh token...');
          try {
            const newToken = await this.refreshAccessToken(storedRefreshToken);
            logger.info('Token refreshed successfully');
            this.scheduleTokenRefresh();
            return newToken;
          } catch (error) {
            logger.warn('Token refresh failed, clearing tokens...');
            await secureTokenStore.clearTokens();
          }
        }
      }
    }

    // No valid token, perform auto-login
    logger.info('No valid token found, performing auto-login...');
    return this.login();
  }

  /**
   * Perform login with desktop credentials
   */
  async login(): Promise<string> {
    // Prevent multiple simultaneous login attempts
    if (this.isAuthenticating && this.authPromise) {
      logger.info('Login already in progress, waiting...');
      return this.authPromise;
    }

    this.isAuthenticating = true;
    this.authPromise = this._performLogin();

    try {
      const token = await this.authPromise;
      return token;
    } finally {
      this.isAuthenticating = false;
      this.authPromise = null;
    }
  }

  private async _performLogin(): Promise<string> {
    const credentials = getDesktopCredentials();

    try {
      logger.info(`Attempting login for ${credentials.email}...`);

      const response = await apiClient.auth.login({
        email: credentials.email,
        password: credentials.password,
      });

      if (!response.access_token) {
        throw new Error('No access token received from server');
      }

      // Save tokens securely
      await secureTokenStore.saveAccessToken(response.access_token);
      if (response.refresh_token) {
        await secureTokenStore.saveRefreshToken(response.refresh_token);
        this.refreshToken = response.refresh_token;
      }

      this.currentToken = response.access_token;
      this.currentUser = response.user || null;

      logger.info('Login successful');

      if (response.user) {
        logger.info(`Logged in as: ${response.user.firstName} ${response.user.lastName} (${response.user.role})`);
      }

      // Schedule automatic token refresh
      this.scheduleTokenRefresh();

      return response.access_token;
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Validate a token by making a test request to /auth/profile
   */
  private async validateToken(token: string): Promise<boolean> {
    try {
      const user = await apiClient.auth.getProfile();

      if (user && user.id) {
        this.currentUser = user;
        logger.info(`Token valid for user: ${user.firstName} ${user.lastName} (${user.email})`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      logger.info('Refreshing access token...');

      const data = await apiClient.auth.refresh(refreshToken);

      if (!data.access_token) {
        throw new Error('No access token received from refresh');
      }

      // Save new access token
      await secureTokenStore.saveAccessToken(data.access_token);
      
      this.currentToken = data.access_token;

      logger.info('Access token refreshed successfully');
      return data.access_token;
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic token refresh in background
   * Refreshes token every 50 minutes (assuming 60 min expiry)
   */
  private scheduleTokenRefresh(): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Schedule refresh for 50 minutes (3000000 ms)
    // Adjust this based on your token expiry time
    const refreshInterval = 50 * 60 * 1000; // 50 minutes

    this.refreshTimer = setTimeout(async () => {
      logger.info('Auto-refreshing token in background...');

      if (this.refreshToken) {
        try {
          await this.refreshAccessToken(this.refreshToken);
          // Schedule next refresh
          this.scheduleTokenRefresh();
        } catch (error) {
          logger.error('Background token refresh failed:', error);
          
          // Attempt full re-login as fallback
          try {
            logger.info('Attempting full re-login...');
            await this.login();
          } catch (loginError) {
            logger.error('Background re-login failed:', loginError);
          }
        }
      } else {
        logger.warn('No refresh token available for background refresh');
      }
    }, refreshInterval);

    logger.info(`Token refresh scheduled in ${refreshInterval / 60000} minutes`);
  }

  /**
   * Get current authentication token
   * If no token exists, performs auto-login
   */
  async getToken(): Promise<string> {
    if (this.currentToken) {
      return this.currentToken;
    }

    // No token in memory, try to initialize
    return this.initialize();
  }

  /**
   * Get current access token (synchronous, no auto-login)
   */
  getAccessToken(): string | null {
    return this.currentToken;
  }

  /**
   * Get current user info
   */
  getCurrentUser(): UserInfo | null {
    return this.currentUser;
  }

  /**
   * Clear authentication (logout)
   */
  async logout(): Promise<void> {
    logger.info('Logging out...');
    
    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.currentToken = null;
    this.refreshToken = null;
    this.currentUser = null;
    
    await secureTokenStore.clearTokens();
  }

  /**
   * Handle 401 Unauthorized error
   * Tries to refresh token first, then performs full re-login if needed
   */
  async handleUnauthorized(): Promise<string> {
    logger.warn('Received 401 Unauthorized');

    // Try to refresh token first
    if (this.refreshToken) {
      try {
        logger.info('Attempting to refresh token...');
        const newToken = await this.refreshAccessToken(this.refreshToken);
        return newToken;
      } catch (error) {
        logger.warn('Token refresh failed, will try full re-login');
      }
    }

    // Refresh failed or no refresh token, perform full re-login
    logger.info('Performing full re-authentication...');
    
    // Clear invalid tokens
    this.currentToken = null;
    this.refreshToken = null;
    await secureTokenStore.clearTokens();

    // Perform fresh login
    return this.login();
  }
}

// Singleton instance
export const authService = new AuthService();
