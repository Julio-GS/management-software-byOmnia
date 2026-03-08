"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import authService, { User, LoginRequest } from "@/src/lib/api/auth.service";
import { tokenStorage } from "@/src/lib/api/client";
import { isElectron, isElectronAuthenticated } from "@/lib/electron";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const router = useRouter();

  const isAuthenticated = !!user;

  // Fetch current user on mount
  const fetchUser = useCallback(async () => {
    // If running in Electron, try to get auth from Electron first
    if (isElectron()) {
      try {
        const electronAuth = await isElectronAuthenticated();

        if (
          electronAuth.isAuthenticated &&
          electronAuth.user &&
          electronAuth.token
        ) {
          console.log("✅ Electron auto-auth successful");

          // Store the token from Electron in web storage
          // Note: Electron token is refresh_token, we need to get access_token
          // For now, we'll just set the user and let the app work
          setUser(electronAuth.user);
          setIsLoading(false);
          setHasInitialized(true);
          return;
        }
      } catch (error) {
        console.warn(
          "Failed to get Electron auth, falling back to web auth:",
          error,
        );
      }
    }

    // Standard web auth flow
    const hasToken = authService.isAuthenticated();

    if (!hasToken) {
      setIsLoading(false);
      setHasInitialized(true);
      return;
    }

    try {
      const userData = await authService.me();
      setUser(userData);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      tokenStorage.clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
      setHasInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!hasInitialized) {
      fetchUser();
    }
  }, [fetchUser, hasInitialized]);

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      setIsLoading(false);

      // Force full page reload to ensure cookies are properly set
      // and middleware can handle the redirect
      window.location.href = "/dashboard";
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    router.push("/login");
  }, [router]);

  const refetchUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
