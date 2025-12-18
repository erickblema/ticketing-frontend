import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { useOrder } from '@/hooks/use-orders';
import { useEvent } from '@/hooks/use-events';

export default function PaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { data: order, isLoading, error } = useOrder(orderId!);
  const { data: event } = useEvent(order?.event_id || '');
  const [isProcessing, setIsProcessing] = useState(false);

  // For now, we'll show a message that payment integration is coming
  // In production, you would integrate @stripe/stripe-react-native here
  // and use the client_secret from the order to present the payment sheet

  const handlePayment = async () => {
    if (!order?.client_secret) {
      Alert.alert('Error', 'Payment information not available');
      return;
    }

    Alert.alert(
      'Payment Integration',
      'Stripe payment integration requires @stripe/stripe-react-native package. For now, you can test the flow by checking the order status after webhook processing.',
      [
        {
          text: 'View Order',
          onPress: () => router.replace(`/order/${order.order_id}`),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Loading payment...</ThemedText>
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

  if (order.status === 'paid') {
    return (
      <View style={styles.centerContainer}>
        <ThemedText type="title" style={styles.successTitle}>
          Payment Successful!
        </ThemedText>
        <ThemedText style={styles.successText}>Your order has been paid.</ThemedText>
        <Pressable
          style={styles.viewOrderButton}
          onPress={() => router.replace(`/order/${order.order_id}`)}>
          <ThemedText style={styles.viewOrderButtonText}>View Order</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Complete Payment
        </ThemedText>

        <ThemedView style={styles.orderSummary}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Order Summary
          </ThemedText>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Event:</ThemedText>
            <ThemedText style={styles.summaryValue} numberOfLines={2}>
              {event?.title || 'Event'}
            </ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Total:</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.totalAmount}>
              ${order.total_amount.toFixed(2)}
            </ThemedText>
          </View>
        </ThemedView>

        <ThemedView style={styles.paymentInfo}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Payment Method
          </ThemedText>
          <ThemedText style={styles.infoText}>
            Stripe payment integration is ready. Install @stripe/stripe-react-native to enable
            payment processing.
          </ThemedText>
        </ThemedView>

        <Pressable
          style={[styles.payButton, isProcessing && styles.buttonDisabled]}
          onPress={handlePayment}
          disabled={isProcessing || order.status !== 'pending'}>
          {isProcessing ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              <ThemedText type="defaultSemiBold" style={styles.payButtonText}>
                Processing...
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="defaultSemiBold" style={styles.payButtonText}>
              Pay ${order.total_amount.toFixed(2)}
            </ThemedText>
          )}
        </Pressable>

        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
        </Pressable>
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
  content: {
    padding: 20,
    gap: 24,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
  },
  orderSummary: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
  totalAmount: {
    fontSize: 20,
    color: '#007AFF',
  },
  paymentInfo: {
    padding: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  payButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ff3b30',
    fontSize: 16,
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
  successTitle: {
    fontSize: 24,
    marginBottom: 8,
    color: '#4CAF50',
  },
  successText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  viewOrderButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  viewOrderButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

