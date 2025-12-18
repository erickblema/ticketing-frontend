import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth';
import { Event, EventStatus } from '@/types/events';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// Fetch all events
export function useEvents(status?: EventStatus) {
  return useQuery<Event[]>({
    queryKey: ['events', status],
    queryFn: async () => {
      const url = status
        ? `${API_URL}/api/v1/events?status=${status}`
        : `${API_URL}/api/v1/events`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Fetch single event
export function useEvent(eventId: string) {
  return useQuery<Event>({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/v1/events/${eventId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch event');
      }
      return response.json();
    },
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
  });
}

