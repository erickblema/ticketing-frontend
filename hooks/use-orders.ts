import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth';
import { Order, OrderCreate, QRCodeResponse } from '@/types/orders';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// Fetch all orders for current user
export function useOrders() {
  const { accessToken } = useAuth();

  return useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/api/v1/orders`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      return response.json();
    },
    enabled: !!accessToken,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Fetch single order
export function useOrder(orderId: string) {
  const { accessToken } = useAuth();

  return useQuery<Order>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/api/v1/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }

      return response.json();
    },
    enabled: !!accessToken && !!orderId,
  });
}

// Create order
export function useCreateOrder() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: OrderCreate) => {
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...orderData,
          use_mobile_payment: true, // Always use mobile payment for React Native
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to create order' }));
        throw new Error(error.detail || 'Failed to create order');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

// Get order QR code
export function useOrderQR(orderId: string) {
  const { accessToken } = useAuth();

  return useQuery<QRCodeResponse>({
    queryKey: ['order', orderId, 'qr'],
    queryFn: async () => {
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/api/v1/orders/${orderId}/qr`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch QR code');
      }

      return response.json();
    },
    enabled: !!accessToken && !!orderId,
  });
}

// Cancel order
export function useCancelOrder() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/api/v1/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to cancel order' }));
        throw new Error(error.detail || 'Failed to cancel order');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', data.order_id] });
    },
  });
}

