import { useQuery } from '@tanstack/react-query';
import { useAuth, AuthUserProfile } from '@/context/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export function useProfile() {
  const { accessToken, user } = useAuth();

  return useQuery<AuthUserProfile>({
    queryKey: ['profile', user?.user_id],
    queryFn: async () => {
      console.log('[useProfile] 📤 Fetching profile from /api/v1/auth/me...');
      
      if (!accessToken) {
        console.error('[useProfile] ❌ No access token available');
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('[useProfile] 📥 Profile response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = 'Failed to fetch profile';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || `Server error: ${response.status}`;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        console.error('[useProfile] ❌ Profile fetch failed:', errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('[useProfile] ✅ Profile data received:', {
        userId: data.user_id,
        email: data.email,
        name: data.name,
        role: data.role,
        createdAt: data.created_at,
      });

      return data;
    },
    enabled: !!user && !!accessToken, // Only run query if user and token exist
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

