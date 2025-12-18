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
import { useOrders } from '@/hooks/use-orders';
import { useEvent } from '@/hooks/use-events';
import { Order } from '@/types/orders';

export default function TicketsScreen() {
  const router = useRouter();
  const { data: orders, isLoading, error, refetch, isRefetching } = useOrders();

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'cancelled':
        return '#f44336';
      case 'refunded':
        return '#9E9E9E';
      default:
        return '#666';
    }
  };

  const renderOrder = ({ item: order }: { item: Order }) => {
    return <OrderCard order={order} />;
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Loading your tickets...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={styles.errorText}>Failed to load tickets</ThemedText>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </Pressable>
      </View>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText type="title" style={styles.emptyTitle}>
          No tickets yet
        </ThemedText>
        <ThemedText style={styles.emptySubtext}>
          Purchase tickets from events to see them here!
        </ThemedText>
        <Pressable style={styles.browseButton} onPress={() => router.push('/(tabs)/explore')}>
          <ThemedText style={styles.browseButtonText}>Browse Events</ThemedText>
        </Pressable>
      </View>
    );
  }

  // Sort orders by date (newest first)
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">My Tickets</ThemedText>
        <ThemedText style={styles.subtitle}>View and manage your orders</ThemedText>
      </ThemedView>
      <FlatList
        data={sortedOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.order_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#007AFF" />
        }
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const { data: event } = useEvent(order.event_id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'cancelled':
        return '#f44336';
      case 'refunded':
        return '#9E9E9E';
      default:
        return '#666';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const totalTickets = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Pressable
      style={styles.orderCard}
      onPress={() => router.push(`/order/${order.order_id}`)}>
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          <ThemedText type="defaultSemiBold" style={styles.orderTitle} numberOfLines={2}>
            {event?.title || 'Event'}
          </ThemedText>
          <ThemedText style={styles.orderDate}>{formatDate(order.created_at)}</ThemedText>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(order.status) + '20' },
          ]}>
          <ThemedText
            style={[styles.statusText, { color: getStatusColor(order.status) }]}
            type="defaultSemiBold">
            {order.status.toUpperCase()}
          </ThemedText>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.orderDetailRow}>
          <ThemedText style={styles.orderDetailLabel}>Tickets:</ThemedText>
          <ThemedText style={styles.orderDetailValue}>{totalTickets}</ThemedText>
        </View>
        <View style={styles.orderDetailRow}>
          <ThemedText style={styles.orderDetailLabel}>Total:</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.orderTotal}>
            ${order.total_amount.toFixed(2)}
          </ThemedText>
        </View>
      </View>

      {order.items.length > 0 && (
        <View style={styles.itemsContainer}>
          {order.items.slice(0, 3).map((item, idx) => (
            <View key={idx} style={styles.itemBadge}>
              <ThemedText style={styles.itemBadgeText}>
                {item.quantity}x {item.ticket_type}
              </ThemedText>
            </View>
          ))}
          {order.items.length > 3 && (
            <ThemedText style={styles.moreItems}>+{order.items.length - 3} more</ThemedText>
          )}
        </View>
      )}
    </Pressable>
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
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  orderTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
  },
  orderDetails: {
    gap: 8,
    marginBottom: 12,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderDetailValue: {
    fontSize: 14,
  },
  orderTotal: {
    fontSize: 16,
    color: '#007AFF',
  },
  itemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  itemBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemBadgeText: {
    fontSize: 12,
    color: '#333',
  },
  moreItems: {
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
  emptyTitle: {
    fontSize: 24,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  browseButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

