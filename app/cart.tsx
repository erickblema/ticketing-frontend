import { useRouter } from 'expo-router';
import React from 'react';
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
import { useCart, useClearCart } from '@/hooks/use-cart';
import { useEvent } from '@/hooks/use-events';
import { useCreateOrder } from '@/hooks/use-orders';
import { useAuth } from '@/context/auth';
import { CartItem } from '@/types/cart';
import { OrderItem } from '@/types/orders';

export default function CartScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [eventId, setEventId] = React.useState<string | null>(null);
  const { data: cart, isLoading: isLoadingCart } = useCart(eventId || '');
  const { data: event, isLoading: isLoadingEvent } = useEvent(eventId || '');
  const clearCartMutation = useClearCart();
  const createOrderMutation = useCreateOrder();

  // Get event ID from cart
  React.useEffect(() => {
    if (cart?.event_id) {
      setEventId(cart.event_id);
    }
  }, [cart]);

  const handleCheckout = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to checkout', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/auth') },
      ]);
      return;
    }

    if (!cart || !event) {
      Alert.alert('Error', 'Cart or event data is missing');
      return;
    }

    try {
      const orderItems: OrderItem[] = cart.items.map((item) => ({
        ticket_type: item.ticket_type,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const order = await createOrderMutation.mutateAsync({
        event_id: cart.event_id,
        items: orderItems,
        use_mobile_payment: true,
      });

      // Clear cart after successful order creation
      await clearCartMutation.mutateAsync({ eventId: cart.event_id });

      // Navigate to payment screen
      router.push(`/payment/${order.order_id}`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create order');
    }
  };

  const handleClearCart = async () => {
    if (!cart) return;

    Alert.alert('Clear Cart', 'Are you sure you want to remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearCartMutation.mutateAsync({ eventId: cart.event_id });
            router.back();
          } catch (err) {
            Alert.alert('Error', 'Failed to clear cart');
          }
        },
      },
    ]);
  };

  const getTotalPrice = () => {
    if (!cart) return 0;
    return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getTotalQuantity = () => {
    if (!cart) return 0;
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  if (isLoadingCart || isLoadingEvent) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Loading cart...</ThemedText>
      </View>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText type="title" style={styles.emptyTitle}>
          Your cart is empty
        </ThemedText>
        <ThemedText style={styles.emptySubtext}>Add tickets to get started!</ThemedText>
        <Pressable style={styles.browseButton} onPress={() => router.push('/(tabs)/explore')}>
          <ThemedText style={styles.browseButtonText}>Browse Events</ThemedText>
        </Pressable>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={styles.errorText}>Event not found</ThemedText>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Cart</ThemedText>
        <ThemedText style={styles.subtitle}>{event.title}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.content}>
        {cart.items.map((item, index) => {
          const ticketType = event.ticket_types.find((tt) => tt.name === item.ticket_type);
          return (
            <View key={index} style={styles.cartItem}>
              <View style={styles.cartItemContent}>
                <ThemedText type="defaultSemiBold" style={styles.itemName}>
                  {item.ticket_type}
                </ThemedText>
                <ThemedText style={styles.itemDetails}>
                  {item.quantity} × ${item.price.toFixed(2)}
                </ThemedText>
                {ticketType && (
                  <ThemedText style={styles.itemAvailable}>
                    {ticketType.available} available
                  </ThemedText>
                )}
              </View>
              <View style={styles.cartItemPrice}>
                <ThemedText type="defaultSemiBold" style={styles.itemSubtotal}>
                  ${(item.price * item.quantity).toFixed(2)}
                </ThemedText>
              </View>
            </View>
          );
        })}

        <ThemedView style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Total Tickets:</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.summaryValue}>
              {getTotalQuantity()}
            </ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Subtotal:</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.summaryValue}>
              ${getTotalPrice().toFixed(2)}
            </ThemedText>
          </View>
        </ThemedView>

        <Pressable
          style={[
            styles.checkoutButton,
            (createOrderMutation.isPending || !user) && styles.buttonDisabled,
          ]}
          onPress={handleCheckout}
          disabled={createOrderMutation.isPending || !user}>
          {createOrderMutation.isPending ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              <ThemedText type="defaultSemiBold" style={styles.checkoutButtonText}>
                Processing...
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="defaultSemiBold" style={styles.checkoutButtonText}>
              {user ? 'Proceed to Checkout' : 'Sign In to Checkout'}
            </ThemedText>
          )}
        </Pressable>

        <Pressable
          style={styles.clearButton}
          onPress={handleClearCart}
          disabled={clearCartMutation.isPending}>
          <ThemedText style={styles.clearButtonText}>Clear Cart</ThemedText>
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
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    gap: 12,
  },
  cartItemContent: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 16,
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
  },
  itemAvailable: {
    fontSize: 12,
    color: '#999',
  },
  cartItemPrice: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  itemSubtotal: {
    fontSize: 18,
    color: '#007AFF',
  },
  summaryContainer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 18,
    color: '#007AFF',
  },
  checkoutButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
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
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  clearButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#ff3b30',
    fontSize: 14,
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

