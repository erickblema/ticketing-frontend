import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth';
import { Cart, CartCreate } from '@/types/cart';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const SESSION_ID_KEY = 'cart_session_id';

// Get or create session ID for anonymous users
async function getSessionId(): Promise<string> {
  let sessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

// Get cart for an event
export function useCart(eventId: string) {
  const { accessToken, user } = useAuth();

  return useQuery<Cart | null>({
    queryKey: ['cart', eventId],
    queryFn: async () => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      } else {
        const sessionId = await getSessionId();
        headers['X-Session-ID'] = sessionId;
      }

      const response = await fetch(`${API_URL}/api/v1/cart?event_id=${eventId}`, {
        headers,
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch cart');
      }

      return response.json();
    },
    enabled: !!eventId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Add/update cart
export function useUpdateCart() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cartData, sessionId }: { cartData: CartCreate; sessionId?: string }) => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      } else if (sessionId) {
        headers['X-Session-ID'] = sessionId;
      } else {
        const sid = await getSessionId();
        headers['X-Session-ID'] = sid;
      }

      const response = await fetch(`${API_URL}/api/v1/cart`, {
        method: 'POST',
        headers,
        body: JSON.stringify(cartData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to update cart' }));
        throw new Error(error.detail || 'Failed to update cart');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cart', data.event_id] });
    },
  });
}

// Clear cart
export function useClearCart() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, sessionId }: { eventId: string; sessionId?: string }) => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      } else if (sessionId) {
        headers['X-Session-ID'] = sessionId;
      } else {
        const sid = await getSessionId();
        headers['X-Session-ID'] = sid;
      }

      const response = await fetch(`${API_URL}/api/v1/cart?event_id=${eventId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to clear cart');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cart', variables.eventId] });
    },
  });
}

