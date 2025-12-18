// Auth context for email/password authentication with OTP verification
import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// Storage keys
const STORAGE_KEYS = {
  PENDING_EMAIL: 'auth_pendingEmail',
  IS_REGISTRATION_FLOW: 'auth_isRegistrationFlow',
  ACCESS_TOKEN: 'auth_accessToken',
  USER: 'auth_user',
} as const;

export type AuthUser = {
  user_id: string;
  email: string;
  name?: string;
  role: string;
};

export type AppAuthError = { type: string; message: string };

export type AuthUserProfile = AuthUser & {
  created_at?: string;
};

export type AuthContextType = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  error: AppAuthError | null;
  pendingEmail: string | null;
  isRegistrationFlow: boolean;
  clearError: () => void;
  login: (email: string, password: string) => Promise<{ email: string }>;
  verifyOtp: (email: string, otpCode: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<{ email: string }>;
  verifyEmail: (email: string, otpCode: string) => Promise<void>;
  startOtpFlow: (email: string, isRegistration: boolean) => Promise<void>;
  clearOtpFlow: () => Promise<void>;
  getProfile: () => Promise<AuthUserProfile>;
  signOut: () => Promise<void>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isRestoringAuth, setIsRestoringAuth] = React.useState(true); // Track if we're restoring from storage
  const [error, setError] = React.useState<AppAuthError | null>(null);
  const [pendingEmail, setPendingEmail] = React.useState<string | null>(null);
  const [isRegistrationFlow, setIsRegistrationFlow] = React.useState(false);

  // Restore auth state from AsyncStorage on mount
  React.useEffect(() => {
    const restoreAuthState = async () => {
      console.log('[AuthContext] 🔄 Restoring auth state from AsyncStorage...');
      try {
        const [storedToken, storedUser, storedEmail, storedIsRegistrationFlow] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.PENDING_EMAIL),
          AsyncStorage.getItem(STORAGE_KEYS.IS_REGISTRATION_FLOW),
        ]);

        // Restore access token and user
        if (storedToken) {
          console.log('[AuthContext] ✅ Restored access token from storage');
          setAccessToken(storedToken);
        } else {
          console.log('[AuthContext] ℹ️ No access token found in storage');
        }

        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            console.log('[AuthContext] ✅ Restored user from storage:', {
              userId: user.user_id,
              email: user.email,
            });
            setUser(user);
          } catch (parseError) {
            console.error('[AuthContext] ❌ Error parsing stored user:', parseError);
          }
        } else {
          console.log('[AuthContext] ℹ️ No user found in storage');
        }

        // Restore OTP flow state
        if (storedEmail) {
          console.log('[AuthContext] ✅ Restored pendingEmail from storage:', storedEmail);
          setPendingEmail(storedEmail);
        } else {
          console.log('[AuthContext] ℹ️ No pendingEmail found in storage');
        }

        if (storedIsRegistrationFlow !== null) {
          const isRegistration = JSON.parse(storedIsRegistrationFlow);
          console.log('[AuthContext] ✅ Restored isRegistrationFlow from storage:', isRegistration);
          setIsRegistrationFlow(isRegistration);
        } else {
          console.log('[AuthContext] ℹ️ No isRegistrationFlow found in storage');
        }
      } catch (error) {
        console.error('[AuthContext] ❌ Error restoring auth state:', error);
      } finally {
        setIsRestoringAuth(false);
        console.log('[AuthContext] ✅ Auth state restoration completed');
      }
    };

    restoreAuthState();
  }, []);

  // Helper: Save OTP flow state to AsyncStorage
  const saveOtpState = React.useCallback(async (email: string | null, isRegistration: boolean) => {
    try {
      if (email) {
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.PENDING_EMAIL, email),
          AsyncStorage.setItem(STORAGE_KEYS.IS_REGISTRATION_FLOW, JSON.stringify(isRegistration)),
        ]);
      } else {
        await Promise.all([
          AsyncStorage.removeItem(STORAGE_KEYS.PENDING_EMAIL),
          AsyncStorage.removeItem(STORAGE_KEYS.IS_REGISTRATION_FLOW),
        ]);
      }
    } catch (error) {
      console.error('[AuthContext] Error saving OTP state:', error);
    }
  }, []);

  // Helper: Make API request with error handling
  const apiRequest = async <T,>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorMessage = 'Request failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || `Server error: ${response.status}`;
      } catch {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  };

  const login = async (email: string, password: string): Promise<{ email: string }> => {
    console.log('[AuthContext] 🔐 Starting login process...', { email });
    setIsLoading(true);
    setError(null);

    try {
      console.log('[AuthContext] 📤 Sending login request to /api/v1/auth/login');
      const data = await apiRequest<{ email: string; message: string }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      console.log('[AuthContext] ✅ Login response received:', { email: data.email, hasMessage: !!data.message });

      if (!data.email) {
        console.error('[AuthContext] ❌ Login failed: Server did not return email in response');
        throw new Error('Server did not return email in response');
      }

      console.log('[AuthContext] ✅ Login successful, email:', data.email);
      return { email: data.email };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Login failed. Please check your credentials.';

      console.error('[AuthContext] ❌ Login error:', { error: errorMessage, email });

      // Check for network errors
      if (
        errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('Failed to fetch')
      ) {
        console.error('[AuthContext] 🌐 Network error detected');
        setError({
          type: 'login',
          message: 'Network error: Could not connect to server. Please check your connection.',
        });
      } else {
        setError({ type: 'login', message: errorMessage });
      }

      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
      console.log('[AuthContext] 🔄 Login process completed, isLoading set to false');
    }
  };

  const verifyOtp = async (email: string, otpCode: string): Promise<void> => {
    console.log('[AuthContext] 🔑 Starting OTP verification...', { email, otpLength: otpCode.length });
    setIsLoading(true);
    setError(null);

    try {
      console.log('[AuthContext] 📤 Sending OTP verification request to /api/v1/auth/verify-otp');
      const data = await apiRequest<{ access_token: string; user: AuthUser }>(
        '/api/v1/auth/verify-otp',
        {
          method: 'POST',
          body: JSON.stringify({ email, otp_code: otpCode }),
        }
      );

      console.log('[AuthContext] ✅ OTP verification successful:', {
        hasToken: !!data.access_token,
        userId: data.user.user_id,
        userEmail: data.user.email,
        userRole: data.user.role,
      });

      setAccessToken(data.access_token);
      setUser(data.user);
      console.log('[AuthContext] 💾 User state updated with token and user data');
      
      // Persist token and user to AsyncStorage so they survive remounts
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user)),
      ]);
      console.log('[AuthContext] 💾 Token and user saved to AsyncStorage');
      
      await clearOtpFlow();
      console.log('[AuthContext] 🧹 OTP flow cleared');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OTP verification failed';
      console.error('[AuthContext] ❌ OTP verification failed:', { error: errorMessage, email });
      setError({ type: 'otp', message: errorMessage });
      throw err;
    } finally {
      setIsLoading(false);
      console.log('[AuthContext] 🔄 OTP verification process completed');
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string
  ): Promise<{ email: string }> => {
    console.log('[AuthContext] 📝 Starting registration process...', { email, name });
    setIsLoading(true);
    setError(null);

    try {
      console.log('[AuthContext] 📤 Sending registration request to /api/v1/auth/register');
      const data = await apiRequest<{ email: string }>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, role: 'customer' }),
      });

      console.log('[AuthContext] ✅ Registration successful, email:', data.email);
      return { email: data.email };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      console.error('[AuthContext] ❌ Registration error:', { error: errorMessage, email });
      setError({ type: 'register', message: errorMessage });
      throw err;
    } finally {
      setIsLoading(false);
      console.log('[AuthContext] 🔄 Registration process completed');
    }
  };

  const verifyEmail = async (email: string, otpCode: string): Promise<void> => {
    console.log('[AuthContext] 📧 Starting email verification...', { email, otpLength: otpCode.length });
    setIsLoading(true);
    setError(null);

    try {
      console.log('[AuthContext] 📤 Sending email verification request to /api/v1/auth/verify-email');
      await apiRequest('/api/v1/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, otp_code: otpCode }),
      });

      console.log('[AuthContext] ✅ Email verification successful');
      // After email verification, user is created but NOT logged in yet
      // They need to login separately
      await clearOtpFlow();
      console.log('[AuthContext] 🧹 OTP flow cleared after email verification');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Email verification failed';
      console.error('[AuthContext] ❌ Email verification failed:', { error: errorMessage, email });
      setError({ type: 'verify', message: errorMessage });
      throw err;
    } finally {
      setIsLoading(false);
      console.log('[AuthContext] 🔄 Email verification process completed');
    }
  };

  // Start OTP flow - saves email and flow type to state and storage
  const startOtpFlow = React.useCallback(
    async (email: string, isRegistration: boolean) => {
      console.log('[AuthContext] 🚀 Starting OTP flow...', { email, isRegistration });
      setPendingEmail(email);
      setIsRegistrationFlow(isRegistration);
      console.log('[AuthContext] 💾 Saving OTP state to AsyncStorage');
      await saveOtpState(email, isRegistration);
      console.log('[AuthContext] ✅ OTP flow started, pendingEmail set to:', email);
    },
    [saveOtpState]
  );

  // Clear OTP flow - removes from state and storage
  const clearOtpFlow = React.useCallback(async () => {
    setPendingEmail(null);
    setIsRegistrationFlow(false);
    await saveOtpState(null, false);
  }, [saveOtpState]);

  // Get user profile from /me endpoint
  const getProfile = React.useCallback(async (): Promise<AuthUserProfile> => {
    console.log('[AuthContext] 👤 Fetching user profile from /api/v1/auth/me...');
    
    if (!accessToken) {
      console.error('[AuthContext] ❌ Cannot fetch profile: No access token');
      throw new Error('Not authenticated');
    }

    console.log('[AuthContext] 🔑 Access token available, making request...');
    setIsLoading(true);
    setError(null);

    try {
      console.log('[AuthContext] 📤 Sending GET request to /api/v1/auth/me');
      const response = await fetch(`${API_URL}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('[AuthContext] 📥 Profile response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = 'Failed to fetch profile';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || `Server error: ${response.status}`;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        console.error('[AuthContext] ❌ Profile fetch failed:', errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('[AuthContext] ✅ Profile data received:', {
        userId: data.user_id,
        email: data.email,
        name: data.name,
        role: data.role,
        createdAt: data.created_at,
      });

      // Update user state with full profile data
      setUser({
        user_id: data.user_id,
        email: data.email,
        name: data.name,
        role: data.role,
      });
      console.log('[AuthContext] 💾 User state updated with profile data');

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile';
      console.error('[AuthContext] ❌ Profile fetch error:', errorMessage);
      setError({ type: 'profile', message: errorMessage });
      throw err;
    } finally {
      setIsLoading(false);
      console.log('[AuthContext] 🔄 Profile fetch process completed');
    }
  }, [accessToken]);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const signOut = React.useCallback(async () => {
    console.log('[AuthContext] 🚪 Signing out user...');
    setUser(null);
    setAccessToken(null);
    setError(null);
    console.log('[AuthContext] 🧹 Clearing user state and token');
    
    // Clear persisted auth data from AsyncStorage
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER),
    ]);
    console.log('[AuthContext] 🧹 Removed token and user from AsyncStorage');
    
    await clearOtpFlow();
    console.log('[AuthContext] ✅ Sign out completed');
  }, [clearOtpFlow]);

  const fetchWithAuth = React.useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers: HeadersInit = {
        ...(options.headers || {}),
      };

      if (accessToken) {
        (headers as any).Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (res.status === 401) {
        // Token invalid/expired – clear local state
        await signOut();
      }

      return res;
    },
    [accessToken, signOut]
  );

  // Only show loading during initial restoration, not during API calls
  // This prevents the white screen flash during login/OTP verification
  const isLoadingAuth = isRestoringAuth;

  const value: AuthContextType = React.useMemo(
    () => ({
      user,
      accessToken,
      isLoading: isLoadingAuth, // Only true during initial restoration
      error,
      pendingEmail,
      isRegistrationFlow,
      clearError,
      login,
      verifyOtp,
      register,
      verifyEmail,
      startOtpFlow,
      clearOtpFlow,
      getProfile,
      signOut,
      fetchWithAuth,
    }),
    [
      user,
      accessToken,
      isLoadingAuth,
      error,
      pendingEmail,
      isRegistrationFlow,
      clearError,
      login,
      verifyOtp,
      register,
      verifyEmail,
      startOtpFlow,
      clearOtpFlow,
      getProfile,
      signOut,
      fetchWithAuth,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
