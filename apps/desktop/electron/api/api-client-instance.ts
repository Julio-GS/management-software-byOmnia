/**
 * Centralized API Client Instance for Desktop
 *
 * This replaces the old http-client.ts with the unified @omnia/api-client
 * Automatically handles:
 * - Token injection via authService
 * - 401 handling (redirects to login)
 * - Environment detection (desktop)
 */

import { OmniaApiClient } from "@omnia/api-client";
import { authService } from "../auth/auth-service";
import { getLogger } from "../utils/logger";

const log = getLogger();

/**
 * Get access token from authService
 */
async function getAccessToken(): Promise<string | null> {
  try {
    return await authService.getToken();
  } catch (error) {
    log.error("Error getting access token:", error);
    return null;
  }
}

/**
 * Handle 401 unauthorized errors
 * In desktop, we clear credentials and the renderer will redirect to login
 */
async function handle401(): Promise<void> {
  log.warn("401 Unauthorized - clearing credentials");
  await authService.logout();
  // The renderer will detect the auth state change and redirect to login
}

/**
 * Centralized API Client Instance
 * Pre-configured for desktop environment
 */
export const apiClient = new OmniaApiClient({
  baseURL: process.env.API_URL || "http://localhost:8080/api/v1",
  getToken: getAccessToken,
  onUnauthorized: handle401,
  environment: "desktop",
});

log.info("API client initialized for desktop");
