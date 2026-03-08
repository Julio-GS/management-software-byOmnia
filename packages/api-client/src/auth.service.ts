import { ApiClient } from './client';
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
    const response = await this.client.post<LoginResponse>(
      '/auth/login',
      credentials
    );
    return response.data!;
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterRequest): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>(
      '/auth/register',
      userData
    );
    return response.data!;
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshToken: string): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>(
      '/auth/refresh',
      { refresh_token: refreshToken }
    );
    return response.data!;
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
    const response = await this.client.get<User>('/auth/profile');
    return response.data!;
  }
}
