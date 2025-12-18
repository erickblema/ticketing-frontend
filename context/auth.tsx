// Auth context using Google OAuth via backend
import * as React from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
  AuthError,
  AuthRequestConfig,
  DiscoveryDocument,
  makeRedirectUri,
  useAuthRequest,
} from 'expo-auth-session';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// Adjust this to your backend URL (or use EXPO_PUBLIC_API_URL env)
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export type AuthUser = {
  user_id: string;
  email: string;
  name?: string;
  role: string;
};

export type AppAuthError = AuthError | { type: string; message: string };

export type AuthContextType = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  error: AppAuthError | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const config: AuthRequestConfig = {
  clientId: 'google',
  scopes: ['openid', 'profile', 'email'],
  redirectUri: makeRedirectUri(),
};

const discovery: DiscoveryDocument = {
  authorizationEndpoint: `${API_URL}/api/v1/auth/authorize`,
  tokenEndpoint: `${API_URL}/api/v1/auth/token`,
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<AppAuthError | null>(null);

  const [request, response, promptAsync] = useAuthRequest(config, discovery);

  React.useEffect(() => {
    const handleResponse = async () => {
      if (!response) return;

      if (response.type === 'success') {
        try {
          setIsLoading(true);
          const { code } = response.params as { code: string };

          const formData = new FormData();
          formData.append('code', code);

          // Include code_verifier for PKCE if available
          if (request?.codeVerifier) {
            formData.append('code_verifier', request.codeVerifier);
          }

          // Optionally pass platform for backend logic
          formData.append('platform', Platform.OS);

          const tokenRes = await fetch(`${API_URL}/api/v1/auth/token`, {
            method: 'POST',
            body: formData,
          });

          if (!tokenRes.ok) {
            const text = await tokenRes.text();
            console.error('Token exchange failed:', text);
            setError({
              type: 'token',
              message: 'Failed to exchange Google auth code',
            });
            return;
          }

          const tokens = await tokenRes.json();
          const backendAccessToken: string | undefined = tokens.accessToken;

          if (!backendAccessToken) {
            console.warn('No accessToken returned from backend');
            return;
          }

          setAccessToken(backendAccessToken);

          // Fetch current user using backend JWT
          const meRes = await fetch(`${API_URL}/api/v1/auth/me`, {
            headers: {
              Authorization: `Bearer ${backendAccessToken}`,
            },
          });

          if (meRes.ok) {
            const meJson = (await meRes.json()) as AuthUser;
            setUser(meJson);
          } else {
            console.error('Failed to fetch current user', meRes.status);
          }
        } catch (e) {
          console.error('Error handling Google auth response', e);
        } finally {
          setIsLoading(false);
        }
      } else if (response.type === 'error') {
        setError(response.error as AuthError);
      }
    };

    handleResponse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const signInWithGoogle = async () => {
    if (!request) {
      console.warn('Google auth request not ready yet');
      return;
    }
    await promptAsync();
  };

  const signOut = () => {
    setUser(null);
    setAccessToken(null);
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

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    error,
    signInWithGoogle,
    signOut,
    fetchWithAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};


