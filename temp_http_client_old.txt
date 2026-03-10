import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getLogger } from '../utils/logger';
import { getBackendUrl } from '../config/credentials';

const logger = getLogger();

export interface ApiRequestOptions {
  skipAuth?: boolean; // Skip adding Authorization header
  skipRetry?: boolean; // Skip retry on 401
}

/**
 * HTTP client with automatic authentication and 401 retry logic
 * 
 * Features:
 * - Automatically adds Authorization header
 * - Detects 401 Unauthorized responses
 * - Performs re-authentication and retries the request
 * - Prevents infinite retry loops
 * - Uses axios for better request handling
 */
class HttpClient {
  private client: AxiosInstance | null = null;
  private tokenGetter: (() => Promise<string>) | null = null;
  private unauthorizedHandler: (() => Promise<string>) | null = null;
  private isInitialized = false;

  /**
   * Lazy initialization - only create axios instance when first used
   * This ensures environment variables are loaded before initialization
   */
  private ensureInitialized(): void {
    if (this.isInitialized && this.client) {
      return;
    }

    const baseUrl = getBackendUrl();

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Setup interceptors
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();

    this.isInitialized = true;
    logger.info(`HttpClient initialized with base URL: ${baseUrl}`);
  }

  /**
   * Set the token getter function (called by AuthService)
   */
  setTokenGetter(getter: () => Promise<string>): void {
    this.tokenGetter = getter;
  }

  /**
   * Set the unauthorized handler (called by AuthService)
   */
  setUnauthorizedHandler(handler: () => Promise<string>): void {
    this.unauthorizedHandler = handler;
  }

  /**
   * Request interceptor - adds authentication token
   */
  private setupRequestInterceptor(): void {
    if (!this.client) return;
    
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Skip auth if explicitly requested or if it's a login/register request
        const skipAuth = (config as any).skipAuth === true;
        const isAuthEndpoint = config.url?.includes('/auth/login') || 
                              config.url?.includes('/auth/register');

        if (!skipAuth && !isAuthEndpoint && this.tokenGetter) {
          try {
            const token = await this.tokenGetter();
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          } catch (error) {
            logger.error('Failed to get authentication token:', error);
          }
        }

        logger.debug(`HTTP ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Response interceptor - handles 401 and retries
   */
  private setupResponseInterceptor(): void {
    if (!this.client) return;
    
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { 
          _retry?: boolean;
          skipRetry?: boolean;
        };

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.skipRetry) {
          originalRequest._retry = true;

          logger.warn(`Received 401 on ${originalRequest.url}, attempting re-authentication...`);

          if (this.unauthorizedHandler) {
            try {
              // Re-authenticate
              const newToken = await this.unauthorizedHandler();
              
              // Update the request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }

              // Retry the original request
              logger.info(`Retrying ${originalRequest.url} with new token...`);
              return this.client!(originalRequest);
            } catch (authError) {
              logger.error('Re-authentication failed:', authError);
              return Promise.reject(new Error('Failed to re-authenticate after 401'));
            }
          }
        }

        // Log error details
        if (error.response) {
          logger.error(
            `HTTP ${error.response.status} on ${originalRequest.url}: ${JSON.stringify(error.response.data)}`
          );
        } else if (error.request) {
          logger.error(`No response received for ${originalRequest.url}:`, error.message);
        } else {
          logger.error(`Request setup error for ${originalRequest.url}:`, error.message);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a GET request
   */
  async get<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    this.ensureInitialized();
    const response = await this.client!.get<T>(endpoint, options as any);
    return response.data;
  }

  /**
   * Make a POST request
   */
  async post<T = any>(endpoint: string, body?: any, options?: ApiRequestOptions): Promise<T> {
    this.ensureInitialized();
    const response = await this.client!.post<T>(endpoint, body, options as any);
    return response.data;
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(endpoint: string, body?: any, options?: ApiRequestOptions): Promise<T> {
    this.ensureInitialized();
    const response = await this.client!.put<T>(endpoint, body, options as any);
    return response.data;
  }

  /**
   * Make a PATCH request
   */
  async patch<T = any>(endpoint: string, body?: any, options?: ApiRequestOptions): Promise<T> {
    this.ensureInitialized();
    const response = await this.client!.patch<T>(endpoint, body, options as any);
    return response.data;
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    this.ensureInitialized();
    const response = await this.client!.delete<T>(endpoint, options as any);
    return response.data;
  }

  /**
   * Raw axios instance for advanced usage
   */
  getClient(): AxiosInstance {
    this.ensureInitialized();
    return this.client!;
  }
}

// Singleton instance
export const httpClient = new HttpClient();
