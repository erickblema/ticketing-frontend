import { Image } from 'expo-image';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth';

export default function AuthChoiceScreen() {
  const { signInWithGoogle } = useAuth();
  const [showEmailLogin, setShowEmailLogin] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleGoogleSignIn = () => {
    void signInWithGoogle();
  };

  const handleEmailLogin = () => {
    // TODO: call your backend /api/v1/auth/login with email & password
    // and then handle the OTP flow or token you receive.
    console.log('Login with email/password', { email, password });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
        headerImage={
          <Image
            source={require('@/assets/images/partial-react-logo.png')}
            style={styles.reactLogo}
          />
        }>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Sign in</ThemedText>
          <ThemedText>Choose how you want to continue</ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <Pressable style={styles.primaryButton} onPress={handleGoogleSignIn}>
            <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
              Continue with Google
            </ThemedText>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <ThemedText style={styles.dividerLabel}>or</ThemedText>
            <View style={styles.divider} />
          </View>

          {!showEmailLogin ? (
            <Pressable
              style={styles.secondaryButton}
              onPress={() => setShowEmailLogin(true)}>
              <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
                Continue with email
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.emailForm}>
              <ThemedText type="subtitle">Sign in with email</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <Pressable style={styles.primaryButton} onPress={handleEmailLogin}>
                <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                  Sign in
                </ThemedText>
              </Pressable>
            </View>
          )}
        </ThemedView>
      </ParallaxScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    gap: 4,
    marginBottom: 24,
  },
  section: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#333',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#ccc',
  },
  dividerLabel: {
    color: '#888',
  },
  emailForm: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
