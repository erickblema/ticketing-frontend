import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View, Pressable, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth';
import { useProfile } from '@/hooks/use-profile';

export default function HomeScreen() {
  const { user, signOut, accessToken } = useAuth();
  const { data: profile, isLoading: isLoadingProfile, error: profileError } = useProfile();

  console.log('[Dashboard] 🔄 Component render', {
    hasUser: !!user,
    hasAccessToken: !!accessToken,
    hasProfile: !!profile,
    isLoading: isLoadingProfile,
    hasError: !!profileError,
    userId: user?.user_id,
    email: user?.email,
  });

  // Redirect to auth if not authenticated
  if (!user) {
    console.log('[Dashboard] 🚫 No user found, redirecting to auth...');
    return <Redirect href="/auth" />;
  }

  if (!accessToken) {
    console.log('[Dashboard] ⚠️ No access token found, waiting...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </View>
    );
  }

  console.log('[Dashboard] ✅ User authenticated, rendering dashboard', {
    userId: user.user_id,
    email: user.email,
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Dashboard</ThemedText>
        <ThemedText>Welcome back, {user.name || user.email}!</ThemedText>
      </ThemedView>

      <ThemedView style={styles.profileContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Profile Information
        </ThemedText>

        {isLoadingProfile ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" />
            <ThemedText style={styles.loadingText}>Loading profile...</ThemedText>
          </View>
        ) : profileError ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>
              Failed to load profile: {profileError instanceof Error ? profileError.message : 'Unknown error'}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <View style={styles.profileRow}>
              <ThemedText style={styles.label}>Email:</ThemedText>
              <ThemedText style={styles.value}>{profile?.email || user.email}</ThemedText>
            </View>
            <View style={styles.profileRow}>
              <ThemedText style={styles.label}>Name:</ThemedText>
              <ThemedText style={styles.value}>{profile?.name || user.name || 'Not set'}</ThemedText>
            </View>
            <View style={styles.profileRow}>
              <ThemedText style={styles.label}>Role:</ThemedText>
              <ThemedText style={[styles.value, styles.roleBadge]}>
                {profile?.role || user.role}
              </ThemedText>
            </View>
            {profile?.created_at && (
              <View style={styles.profileRow}>
                <ThemedText style={styles.label}>Member since:</ThemedText>
                <ThemedText style={styles.value}>{formatDate(profile.created_at)}</ThemedText>
              </View>
            )}
            <View style={styles.profileRow}>
              <ThemedText style={styles.label}>User ID:</ThemedText>
              <ThemedText style={[styles.value, styles.userId]}>{user.user_id}</ThemedText>
            </View>
          </View>
        )}
      </ThemedView>

      <ThemedView style={styles.actionsContainer}>
        <Pressable style={styles.signOutButton} onPress={signOut}>
          <ThemedText type="defaultSemiBold" style={styles.signOutButtonText}>
            Sign Out
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    gap: 4,
    marginBottom: 24,
  },
  profileContainer: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  sectionTitle: {
    marginBottom: 16,
  },
  profileInfo: {
    gap: 12,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  value: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
  roleBadge: {
    textTransform: 'capitalize',
    fontWeight: '600',
    color: '#007AFF',
  },
  userId: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    marginTop: 8,
  },
  signOutButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#fff',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
});
