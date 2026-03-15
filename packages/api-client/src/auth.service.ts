import { ApiClient } from './client.js';
import type {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  User,
} from '@omnia/shared-types';

export class AuthService {
  constructor(private client: ApiClient) {}

  /**
   * Login with username and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    console.log('🔍 AuthService.login - Credentials:', { email: credentials.email });
    try {
      const result = await this.client.post<LoginResponse>(
        '/auth/login',
        credentials
      );
      console.log('🔍 AuthService.login - Result:', result);
      console.log('🔍 AuthService.login - Result type:', typeof result);
      console.log('🔍 AuthService.login - Result keys:', result ? Object.keys(result) : 'undefined');
      return result;
    } catch (error) {
      console.error('🔍 AuthService.login - Error:', error);
      throw error;
    }
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterRequest): Promise<LoginResponse> {
    return this.client.post<LoginResponse>(
      '/auth/register',
      userData
    );
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshToken: string): Promise<LoginResponse> {
    return this.client.post<LoginResponse>(
      '/auth/refresh',
      { refresh_token: refreshToken }
    );
  }

  /**
   * Logout (invalidate tokens)
   */
  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    return this.client.get<User>('/auth/me');
  }
}
