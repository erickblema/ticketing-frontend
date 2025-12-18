import { Image } from 'expo-image';
import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth';

type AuthMode = 'choice' | 'login' | 'register' | 'otp';

export default function AuthScreen() {
  const router = useRouter();
  const {
    login,
    verifyOtp,
    register,
    verifyEmail,
    isLoading,
    error,
    user,
    clearError,
    pendingEmail,
    isRegistrationFlow,
    setPendingEmail,
    setIsRegistrationFlow,
  } = useAuth();
  const [mode, setMode] = React.useState<AuthMode>('choice');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [otpCode, setOtpCode] = React.useState('');

  // Initialize mode based on pendingEmail (if we have a pending OTP flow)
  // This restores the OTP screen if the component remounts during OTP flow
  React.useEffect(() => {
    if (pendingEmail) {
      console.log('Restoring OTP flow from context, pendingEmail:', pendingEmail);
      if (mode !== 'otp') {
        setMode('otp');
      }
    } else if (mode === 'otp') {
      // If pendingEmail is cleared but we're still in OTP mode, go back to choice
      console.log('Pending email cleared, returning to choice screen');
      setMode('choice');
    }
  }, [pendingEmail]); // Only depend on pendingEmail, not mode, to avoid loops

  // Debug: Log mode changes
  React.useEffect(() => {
    console.log('Auth screen mode changed to:', mode);
    console.log('Pending email (from context):', pendingEmail);
    console.log('Is registration flow (from context):', isRegistrationFlow);
  }, [mode, pendingEmail, isRegistrationFlow]);

  // Redirect if already authenticated (but only if not in OTP flow)
  React.useEffect(() => {
    if (user && mode !== 'otp') {
      console.log('User authenticated, redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [user, router, mode]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      console.log('Starting login...');
      const result = await login(email, password);
      console.log('Login successful, result:', result);
      
      // Success - explicitly clear any errors and proceed to OTP
      clearError();
      setOtpCode(''); // Clear OTP input
      
      // Set context state - the useEffect will automatically set mode to 'otp'
      setIsRegistrationFlow(false); // This is login flow
      setPendingEmail(result.email); // This will trigger the useEffect to set mode to 'otp'
      console.log('Login successful, pendingEmail set to:', result.email);
    } catch (err) {
      // Only show error if login actually failed
      const errorMessage = err instanceof Error ? err.message : error?.message || 'An error occurred';
      console.error('Login error in handleLogin:', err);
      // Don't reset mode - stay on login form
      // Don't clear email/password - let user correct them
      // Error is already set in context, just show alert
      Alert.alert('Login Failed', errorMessage);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const result = await register(email, password, name);
      // Success - explicitly clear any errors and proceed to OTP
      clearError();
      setOtpCode(''); // Clear OTP input
      
      // Set context state - the useEffect will automatically set mode to 'otp'
      setIsRegistrationFlow(true); // This is registration flow
      setPendingEmail(result.email); // This will trigger the useEffect to set mode to 'otp'
      console.log('Registration successful, pendingEmail set to:', result.email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : error?.message || 'An error occurred';
      console.error('Registration error:', err);
      // Don't reset mode - stay on register form
      // Don't clear form fields - let user correct them
      // Error is already set in context, just show alert
      Alert.alert('Registration Failed', errorMessage);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      Alert.alert('Error', 'Please enter the OTP code');
      return;
    }

    if (!pendingEmail) {
      Alert.alert('Error', 'No email found. Please start over.');
      return;
    }

    try {
      if (isRegistrationFlow) {
        // Registration flow: use verify-email endpoint
        await verifyEmail(pendingEmail, otpCode);
        // Registration complete - user needs to login
        Alert.alert(
          'Registration Complete',
          'Your account has been created successfully! Please login with your email and password.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset to login form
                setMode('login');
                setOtpCode('');
                setPendingEmail('');
                setIsRegistrationFlow(false);
                clearError();
              },
            },
          ]
        );
      } else {
        // Login flow: use verify-otp endpoint
        await verifyOtp(pendingEmail, otpCode);
        // Success - user is now logged in, redirect to tabs
        clearError();
        router.replace('/(tabs)');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : error?.message || 'Invalid OTP code';
      console.error('OTP verification error:', err);
      Alert.alert('Verification Failed', errorMessage);
    }
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
          <ThemedText type="title">
            {mode === 'otp' ? 'Verify Code' : mode === 'register' ? 'Sign up' : 'Sign in'}
          </ThemedText>
          <ThemedText>
            {mode === 'otp'
              ? `Enter the code sent to ${pendingEmail}`
              : mode === 'register'
                ? 'Create a new account'
                : 'Sign in with your email'}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          {mode === 'choice' ? (
            <>
              <Pressable
                style={styles.primaryButton}
                onPress={() => setMode('login')}
                disabled={isLoading}>
                <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                  Sign in
                </ThemedText>
              </Pressable>
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <ThemedText style={styles.dividerLabel}>or</ThemedText>
                <View style={styles.divider} />
              </View>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setMode('register')}
                disabled={isLoading}>
                <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
                  Create account
                </ThemedText>
              </Pressable>
            </>
          ) : mode === 'otp' && pendingEmail ? (
            <View style={styles.emailForm}>
              <ThemedText style={styles.hintText}>
                {isRegistrationFlow
                  ? 'Enter the verification code sent to your email to complete registration.'
                  : 'Enter the login code sent to your email.'}
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter OTP code"
                keyboardType="number-pad"
                value={otpCode}
                onChangeText={setOtpCode}
                maxLength={6}
                autoFocus
              />
              <Pressable
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={isLoading || !otpCode}>
                <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                  {isLoading ? 'Verifying...' : 'Verify'}
                </ThemedText>
              </Pressable>
              <Pressable
                style={styles.linkButton}
                onPress={() => {
                  // Go back to the form (login or register) that initiated the OTP
                  setMode(isRegistrationFlow ? 'register' : 'login');
                  setOtpCode('');
                  // Keep pendingEmail in case user wants to retry
                  clearError();
                }}>
                <ThemedText style={styles.linkText}>Back</ThemedText>
              </Pressable>
              {isRegistrationFlow && (
                <ThemedText style={styles.hintText}>
                  Check your email for the verification code to complete registration.
                </ThemedText>
              )}
              {!isRegistrationFlow && (
                <ThemedText style={styles.hintText}>
                  Check your email for the login code.
                </ThemedText>
              )}
            </View>
          ) : (
            <View style={styles.emailForm}>
              {error && error.type === (mode === 'login' ? 'login' : 'register') && (
                <ThemedView style={styles.errorContainer}>
                  <ThemedText style={styles.errorText}>{error.message}</ThemedText>
                </ThemedView>
              )}
              {mode === 'register' && (
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  autoCapitalize="words"
                  value={name}
                  onChangeText={setName}
                />
              )}
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
              <Pressable
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={mode === 'login' ? handleLogin : handleRegister}
                disabled={isLoading || !email || !password || (mode === 'register' && !name)}>
                <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                  {isLoading
                    ? 'Loading...'
                    : mode === 'login'
                      ? 'Sign in'
                      : 'Create account'}
                </ThemedText>
              </Pressable>
              <Pressable
                style={styles.linkButton}
                onPress={() => {
                  // Switch between login and register without going back to choice
                  if (mode === 'login') {
                    setMode('register');
                  } else {
                    setMode('login');
                  }
                  // Keep form fields so user doesn't lose their input
                }}>
                <ThemedText style={styles.linkText}>
                  {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </ThemedText>
              </Pressable>
              <Pressable
                style={styles.linkButton}
                onPress={() => {
                  setEmail('');
                  setPassword('');
                  setName('');
                  setMode('choice');
                }}>
                <ThemedText style={styles.linkText}>Back to options</ThemedText>
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
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  linkButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
  hintText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
});

