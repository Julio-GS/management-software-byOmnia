/**
 * Centralized API Client Instance for Web
 *
 * This replaces the old client.ts with the unified @omnia/api-client
 * Automatically handles:
 * - Token injection from cookies
 * - 401 handling (redirects to /login)
 * - Environment detection (web)
 */

import { OmniaApiClient } from "@omnia/api-client";
import Cookies from "js-cookie";

console.log('🔍 [api-client-instance] Module loaded');
console.log('🔍 [api-client-instance] OmniaApiClient:', OmniaApiClient);
console.log('🔍 [api-client-instance] typeof OmniaApiClient:', typeof OmniaApiClient);

/**
 * Get access token from cookies
 */
async function getAccessToken(): Promise<string | null> {
  return Cookies.get("access_token") || null;
}

/**
 * Handle 401 unauthorized errors
 * Redirect to login page and clear tokens
 */
async function handle401(): Promise<void> {
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");

  // Also clear localStorage for compatibility
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }

  window.location.href = "/login";
}

/**
 * Centralized API Client Instance
 * Pre-configured for web environment
 */
console.log('🔍 [api-client-instance] Creating apiClient...');
console.log('🔍 [api-client-instance] Config:', {
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1",
  hasGetToken: !!getAccessToken,
  hasOnUnauthorized: !!handle401,
  environment: "web",
});

export const apiClient = new OmniaApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1",
  getToken: getAccessToken,
  onUnauthorized: handle401,
});

console.log('🔍 [api-client-instance] apiClient created:', apiClient);
console.log('🔍 [api-client-instance] apiClient.auth:', apiClient.auth);
console.log('🔍 [api-client-instance] typeof apiClient.auth:', typeof apiClient.auth);
console.log('🔍 [api-client-instance] apiClient.auth.login:', apiClient.auth?.login);
console.log('🔍 [api-client-instance] typeof apiClient.auth.login:', typeof apiClient.auth?.login);

/**
 * Token storage utilities
 * Maintains compatibility with existing auth flow
 */
export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("access_token") ||
      Cookies.get("access_token") ||
      null
    );
  },

  getRefreshToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("refresh_token") ||
      Cookies.get("refresh_token") ||
      null
    );
  },

  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window === "undefined") return;

    // Store in localStorage
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);

    // Store in cookies for middleware
    Cookies.set("access_token", accessToken, { expires: 1 / 96 }); // 15 min
    Cookies.set("refresh_token", refreshToken, { expires: 7 }); // 7 days
  },

  clearTokens: (): void => {
    if (typeof window === "undefined") return;

    // Clear localStorage
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    // Clear cookies
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
  },
};
