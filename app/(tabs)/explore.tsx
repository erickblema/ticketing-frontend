import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useEvents } from '@/hooks/use-events';
import { Event } from '@/types/events';

export default function EventsScreen() {
  const router = useRouter();
  const { data: events, isLoading, error, refetch, isRefetching } = useEvents('active');

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <Pressable
      style={styles.eventCard}
      onPress={() => router.push(`/event/${item.event_id}`)}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.eventImage} contentFit="cover" />
      ) : (
        <View style={[styles.eventImage, styles.placeholderImage]}>
          <ThemedText style={styles.placeholderText}>No Image</ThemedText>
        </View>
      )}
      <View style={styles.eventContent}>
        <ThemedText type="defaultSemiBold" style={styles.eventTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
        <ThemedText style={styles.eventVenue} numberOfLines={1}>
          📍 {item.venue}
        </ThemedText>
        <ThemedText style={styles.eventDate} numberOfLines={1}>
          🗓️ {formatDate(item.event_date)}
        </ThemedText>
        <View style={styles.priceRow}>
          <ThemedText style={styles.priceLabel}>From:</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.price}>
            ${Math.min(...item.ticket_types.map((tt) => tt.price)).toFixed(2)}
          </ThemedText>
        </View>
        <View style={styles.ticketTypesRow}>
          {item.ticket_types.slice(0, 3).map((tt, idx) => (
            <View key={idx} style={styles.ticketTypeBadge}>
              <ThemedText style={styles.ticketTypeText}>
                {tt.name} ({tt.available} left)
              </ThemedText>
            </View>
          ))}
          {item.ticket_types.length > 3 && (
            <ThemedText style={styles.moreTypes}>+{item.ticket_types.length - 3} more</ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Loading events...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={styles.errorText}>Failed to load events</ThemedText>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </Pressable>
      </View>
    );
  }

  if (!events || events.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={styles.emptyText}>No events available</ThemedText>
        <ThemedText style={styles.emptySubtext}>Check back later for new events!</ThemedText>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Events</ThemedText>
        <ThemedText style={styles.subtitle}>Discover upcoming events</ThemedText>
      </ThemedView>
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.event_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#007AFF" />
        }
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
  },
  eventContent: {
    padding: 16,
    gap: 8,
  },
  eventTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  eventVenue: {
    fontSize: 14,
    color: '#666',
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  price: {
    fontSize: 18,
    color: '#007AFF',
  },
  ticketTypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  ticketTypeBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ticketTypeText: {
    fontSize: 12,
    color: '#333',
  },
  moreTypes: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});
