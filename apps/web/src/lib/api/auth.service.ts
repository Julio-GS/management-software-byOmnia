import apiClient, { tokenStorage } from './client';
import { User, UserRole, LoginRequest, LoginResponse, RegisterRequest } from '@omnia/shared-types';

// Re-export shared types for convenience
export type { User, UserRole, LoginRequest, LoginResponse, RegisterRequest };

export const authService = {
  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    const { access_token, refresh_token, user } = response.data;

    // Store tokens
    tokenStorage.setTokens(access_token, refresh_token);

    return response.data;
  },

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<User> {
    const response = await apiClient.post<User>('/auth/register', data);
    return response.data;
  },

  /**
   * Get current user
   */
  async me(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  /**
   * Logout user
   */
  logout(): void {
    tokenStorage.clearTokens();
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!tokenStorage.getAccessToken();
  },
};

export default authService;
