import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOrder, useOrderQR, useCancelOrder } from '@/hooks/use-orders';
import { useEvent } from '@/hooks/use-events';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: order, isLoading, error } = useOrder(id!);
  const { data: event } = useEvent(order?.event_id || '');
  const { data: qrCode } = useOrderQR(order?.order_id || '');
  const cancelOrderMutation = useCancelOrder();

  const handleCancelOrder = async () => {
    if (!order) return;

    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelOrderMutation.mutateAsync(order.order_id);
            Alert.alert('Success', 'Order cancelled successfully');
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to cancel order');
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
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

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Loading order...</ThemedText>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={styles.errorText}>Failed to load order</ThemedText>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
        </Pressable>
      </View>
    );
  }

  const totalTickets = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {event?.image_url && (
        <Image source={{ uri: event.image_url }} style={styles.headerImage} contentFit="cover" />
      )}

      <ThemedView style={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            {event?.title || 'Order Details'}
          </ThemedText>
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

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Order Information
          </ThemedText>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Order ID:</ThemedText>
            <ThemedText style={[styles.infoValue, styles.orderId]}>{order.order_id}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Date:</ThemedText>
            <ThemedText style={styles.infoValue}>{formatDate(order.created_at)}</ThemedText>
          </View>
          {order.paid_at && (
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Paid:</ThemedText>
              <ThemedText style={styles.infoValue}>{formatDate(order.paid_at)}</ThemedText>
            </View>
          )}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Tickets
          </ThemedText>
          {order.items.map((item, index) => (
            <View key={index} style={styles.ticketItem}>
              <View style={styles.ticketItemContent}>
                <ThemedText type="defaultSemiBold" style={styles.ticketItemName}>
                  {item.ticket_type}
                </ThemedText>
                <ThemedText style={styles.ticketItemDetails}>
                  {item.quantity} × ${item.price.toFixed(2)}
                </ThemedText>
              </View>
              <ThemedText type="defaultSemiBold" style={styles.ticketItemSubtotal}>
                ${item.subtotal.toFixed(2)}
              </ThemedText>
            </View>
          ))}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Summary
          </ThemedText>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Total Tickets:</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.summaryValue}>
              {totalTickets}
            </ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Subtotal:</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.summaryValue}>
              ${order.total_amount.toFixed(2)}
            </ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Fees:</ThemedText>
            <ThemedText style={styles.summaryValue}>${order.stripe_fees.toFixed(2)}</ThemedText>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <ThemedText type="defaultSemiBold" style={styles.totalLabel}>
              Total:
            </ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.totalValue}>
              ${order.total_amount.toFixed(2)}
            </ThemedText>
          </View>
        </ThemedView>

        {order.status === 'paid' && qrCode && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              QR Code
            </ThemedText>
            <View style={styles.qrContainer}>
              {qrCode.qr_image_base64 ? (
                <Image
                  source={{ uri: `data:image/png;base64,${qrCode.qr_image_base64}` }}
                  style={styles.qrImage}
                  contentFit="contain"
                />
              ) : (
                <ThemedText style={styles.qrPlaceholder}>QR Code loading...</ThemedText>
              )}
            </View>
            <ThemedText style={styles.qrHint}>
              Show this QR code at the event entrance
            </ThemedText>
          </ThemedView>
        )}

        {order.status === 'pending' && (
          <Pressable
            style={styles.cancelButton}
            onPress={handleCancelOrder}
            disabled={cancelOrderMutation.isPending}>
            {cancelOrderMutation.isPending ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#ff3b30" style={{ marginRight: 8 }} />
                <ThemedText style={styles.cancelButtonText}>Cancelling...</ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.cancelButtonText}>Cancel Order</ThemedText>
            )}
          </Pressable>
        )}
      </ThemedView>
    </ScrollView>
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
  headerImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  content: {
    padding: 20,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 24,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
  orderId: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#666',
  },
  ticketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  ticketItemContent: {
    flex: 1,
    gap: 4,
  },
  ticketItemName: {
    fontSize: 16,
  },
  ticketItemDetails: {
    fontSize: 14,
    color: '#666',
  },
  ticketItemSubtotal: {
    fontSize: 16,
    color: '#007AFF',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#000',
  },
  totalLabel: {
    fontSize: 18,
  },
  totalValue: {
    fontSize: 20,
    color: '#007AFF',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrPlaceholder: {
    fontSize: 14,
    color: '#666',
  },
  qrHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  backButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

