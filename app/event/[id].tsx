import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useEvent } from '@/hooks/use-events';
import { useCart, useUpdateCart } from '@/hooks/use-cart';
import { TicketType } from '@/types/events';
import { CartItem } from '@/types/cart';

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: event, isLoading, error } = useEvent(id!);
  const { data: cart } = useCart(id!);
  const updateCartMutation = useUpdateCart();

  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});

  // Initialize selected tickets from cart if exists
  React.useEffect(() => {
    if (cart && cart.items.length > 0) {
      const initial: Record<string, number> = {};
      cart.items.forEach((item) => {
        initial[item.ticket_type] = item.quantity;
      });
      setSelectedTickets(initial);
    }
  }, [cart]);

  const updateTicketQuantity = (ticketType: string, delta: number) => {
    const ticketTypeData = event?.ticket_types.find((tt) => tt.name === ticketType);
    if (!ticketTypeData) return;

    const current = selectedTickets[ticketType] || 0;
    const newQuantity = Math.max(0, Math.min(current + delta, ticketTypeData.available));

    setSelectedTickets((prev) => {
      if (newQuantity === 0) {
        const updated = { ...prev };
        delete updated[ticketType];
        return updated;
      }
      return { ...prev, [ticketType]: newQuantity };
    });
  };

  const getTotalPrice = () => {
    return Object.entries(selectedTickets).reduce((total, [ticketType, quantity]) => {
      const ticketTypeData = event?.ticket_types.find((tt) => tt.name === ticketType);
      return total + (ticketTypeData?.price || 0) * quantity;
    }, 0);
  };

  const getTotalQuantity = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  };

  const handleAddToCart = async () => {
    if (getTotalQuantity() === 0) {
      Alert.alert('Error', 'Please select at least one ticket');
      return;
    }

    try {
      const items: CartItem[] = Object.entries(selectedTickets).map(([ticketType, quantity]) => {
        const ticketTypeData = event!.ticket_types.find((tt) => tt.name === ticketType)!;
        return {
          ticket_type: ticketType,
          quantity,
          price: ticketTypeData.price,
        };
      });

      await updateCartMutation.mutateAsync({
        cartData: {
          event_id: id!,
          items,
        },
      });

      Alert.alert('Success', 'Tickets added to cart!', [
        {
          text: 'View Cart',
          onPress: () => router.push('/cart'),
        },
        { text: 'Continue Shopping', style: 'cancel' },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add to cart');
    }
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

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Loading event...</ThemedText>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={styles.errorText}>Failed to load event</ThemedText>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {event.image_url ? (
        <Image source={{ uri: event.image_url }} style={styles.headerImage} contentFit="cover" />
      ) : (
        <View style={[styles.headerImage, styles.placeholderImage]}>
          <ThemedText style={styles.placeholderText}>No Image</ThemedText>
        </View>
      )}

      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {event.title}
        </ThemedText>

        <View style={styles.infoRow}>
          <ThemedText style={styles.infoLabel}>📍 Venue:</ThemedText>
          <ThemedText style={styles.infoValue}>{event.venue}</ThemedText>
        </View>

        <View style={styles.infoRow}>
          <ThemedText style={styles.infoLabel}>🗓️ Date:</ThemedText>
          <ThemedText style={styles.infoValue}>{formatDate(event.event_date)}</ThemedText>
        </View>

        <ThemedView style={styles.descriptionContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Description
          </ThemedText>
          <ThemedText style={styles.description}>{event.description}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.ticketsContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Select Tickets
          </ThemedText>

          {event.ticket_types.map((ticketType) => (
            <View key={ticketType.name} style={styles.ticketTypeCard}>
              <View style={styles.ticketTypeHeader}>
                <View>
                  <ThemedText type="defaultSemiBold" style={styles.ticketTypeName}>
                    {ticketType.name}
                  </ThemedText>
                  <ThemedText style={styles.ticketTypePrice}>
                    ${ticketType.price.toFixed(2)} each
                  </ThemedText>
                  <ThemedText style={styles.ticketTypeAvailable}>
                    {ticketType.available} available
                  </ThemedText>
                </View>
                <View style={styles.quantityControls}>
                  <Pressable
                    style={[
                      styles.quantityButton,
                      (selectedTickets[ticketType.name] || 0) === 0 && styles.quantityButtonDisabled,
                    ]}
                    onPress={() => updateTicketQuantity(ticketType.name, -1)}
                    disabled={(selectedTickets[ticketType.name] || 0) === 0}>
                    <ThemedText style={styles.quantityButtonText}>−</ThemedText>
                  </Pressable>
                  <ThemedText style={styles.quantityDisplay}>
                    {selectedTickets[ticketType.name] || 0}
                  </ThemedText>
                  <Pressable
                    style={[
                      styles.quantityButton,
                      (selectedTickets[ticketType.name] || 0) >= ticketType.available &&
                        styles.quantityButtonDisabled,
                    ]}
                    onPress={() => updateTicketQuantity(ticketType.name, 1)}
                    disabled={(selectedTickets[ticketType.name] || 0) >= ticketType.available}>
                    <ThemedText style={styles.quantityButtonText}>+</ThemedText>
                  </Pressable>
                </View>
              </View>
              {(selectedTickets[ticketType.name] || 0) > 0 && (
                <ThemedText style={styles.subtotal}>
                  Subtotal: ${((selectedTickets[ticketType.name] || 0) * ticketType.price).toFixed(2)}
                </ThemedText>
              )}
            </View>
          ))}
        </ThemedView>

        {getTotalQuantity() > 0 && (
          <ThemedView style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Total Tickets:</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.summaryValue}>
                {getTotalQuantity()}
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Total Price:</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.summaryValue}>
                ${getTotalPrice().toFixed(2)}
              </ThemedText>
            </View>
          </ThemedView>
        )}

        <Pressable
          style={[
            styles.addToCartButton,
            (getTotalQuantity() === 0 || updateCartMutation.isPending) && styles.buttonDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={getTotalQuantity() === 0 || updateCartMutation.isPending}>
          {updateCartMutation.isPending ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              <ThemedText type="defaultSemiBold" style={styles.addToCartButtonText}>
                Adding...
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="defaultSemiBold" style={styles.addToCartButtonText}>
              {cart ? 'Update Cart' : 'Add to Cart'}
            </ThemedText>
          )}
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
  headerImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 80,
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
  },
  descriptionContainer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 18,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  ticketsContainer: {
    marginTop: 8,
    gap: 12,
  },
  ticketTypeCard: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    gap: 12,
  },
  ticketTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketTypeName: {
    fontSize: 16,
    marginBottom: 4,
  },
  ticketTypePrice: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  ticketTypeAvailable: {
    fontSize: 12,
    color: '#666',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  quantityDisplay: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  subtotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 8,
  },
  summaryContainer: {
    marginTop: 16,
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
  addToCartButton: {
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
  addToCartButtonText: {
    color: '#fff',
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
});

