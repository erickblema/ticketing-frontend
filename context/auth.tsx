// Auth context for email/password authentication
import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Adjust this to your backend URL (or use EXPO_PUBLIC_API_URL env)
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// Log API URL for debugging
if (__DEV__) {
  console.log('API URL:', API_URL);
}

export type AuthUser = {
  user_id: string;
  email: string;
  name?: string;
  role: string;
};

export type AppAuthError = { type: string; message: string };

export type AuthContextType = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  error: AppAuthError | null;
  // OTP flow state (persists across remounts)
  pendingEmail: string | null;
  isRegistrationFlow: boolean;
  setPendingEmail: (email: string | null) => void;
  setIsRegistrationFlow: (isRegistration: boolean) => void;
  clearError: () => void;
  login: (email: string, password: string) => Promise<{ email: string }>;
  verifyOtp: (email: string, otpCode: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<{ email: string }>;
  verifyEmail: (email: string, otpCode: string) => Promise<void>;
  signOut: () => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<AppAuthError | null>(null);
  // OTP flow state - persists across component remounts
  const [pendingEmail, setPendingEmail] = React.useState<string | null>(null);
  const [isRegistrationFlow, setIsRegistrationFlow] = React.useState(false);

  // Debug: Log AuthProvider mount/remount
  React.useEffect(() => {
    console.log('[AuthContext] AuthProvider mounted/remounted');
    return () => {
      console.log('[AuthContext] AuthProvider unmounting - THIS SHOULD NOT HAPPEN!');
    };
  }, []);

  // Debug: Log pendingEmail changes
  React.useEffect(() => {
    console.log('[AuthContext] pendingEmail changed to:', pendingEmail);
  }, [pendingEmail]);

  // Check for existing session on mount
  React.useEffect(() => {
    const checkSession = async () => {
      // Try to restore from storage if you implement token storage
      // For now, we'll just check if we have a token in memory
    };
    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ email: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Login response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const errorData = await response.json();
          console.log('Login error data:', errorData);
          errorMessage = errorData.detail || errorData.message || `Server error: ${response.status}`;
        } catch (parseError) {
          console.log('Failed to parse error response:', parseError);
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Response is OK (200), parse the success data
      const data = await response.json();
      console.log('Login success data:', data);
      
      if (!data.email) {
        throw new Error('Server did not return email in response');
      }
      
      // Clear any previous errors on success
      setError(null);
      return { email: data.email };
    } catch (err) {
      let errorMessage = 'Login failed';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Check for network errors
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Network error: Could not connect to server. Please check your connection and ensure the backend is running.';
      }
      
      console.error('Login error:', err);
      setError({ type: 'login', message: errorMessage });
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (email: string, otpCode: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp_code: otpCode }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'OTP verification failed' }));
        throw new Error(errorData.detail || 'OTP verification failed');
      }

      const data = await response.json();
      setAccessToken(data.access_token);
      setUser(data.user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OTP verification failed';
      setError({ type: 'otp', message: errorMessage });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string
  ): Promise<{ email: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name, role: 'customer' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Registration failed' }));
        throw new Error(errorData.detail || 'Registration failed');
      }

      const data = await response.json();
      return { email: data.email };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError({ type: 'register', message: errorMessage });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (email: string, otpCode: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp_code: otpCode }),
      });

      if (!response.ok) {
        let errorMessage = 'Email verification failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || `Server error: ${response.status}`;
        } catch (parseError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Email verification success:', data);
      
      // After email verification, user is created but NOT logged in yet
      // They need to login separately - don't set user or token here
      // Just return success, the UI will handle prompting for login
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Email verification failed';
      console.error('Email verification error:', err);
      setError({ type: 'verify', message: errorMessage });
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const signOut = () => {
    setUser(null);
    setAccessToken(null);
    setError(null);
    setPendingEmail(null);
    setIsRegistrationFlow(false);
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
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
      signOut();
    }

    return res;
  };

  // Memoize the value object to prevent unnecessary re-renders
  // Functions are stable (don't change between renders), so we only depend on state values
  const value: AuthContextType = React.useMemo(
    () => ({
      user,
      accessToken,
      isLoading,
      error,
      pendingEmail,
      isRegistrationFlow,
      setPendingEmail,
      setIsRegistrationFlow,
      clearError,
      login,
      verifyOtp,
      register,
      verifyEmail,
      signOut,
      fetchWithAuth,
    }),
    [user, accessToken, isLoading, error, pendingEmail, isRegistrationFlow]
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


