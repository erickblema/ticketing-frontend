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
  ActivityIndicator,
} from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth';

type AuthMode = 'choice' | 'login' | 'register' | 'otp';

export default function AuthScreen() {
  const {
    login,
    verifyOtp,
    register,
    verifyEmail,
    error,
    user,
    clearError,
    pendingEmail,
    isRegistrationFlow,
    startOtpFlow,
    clearOtpFlow,
  } = useAuth();

  const [mode, setMode] = React.useState<AuthMode>('choice');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [otpCode, setOtpCode] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Sync mode with pendingEmail state (restored from storage or set after login/register)
  React.useEffect(() => {
    if (pendingEmail && mode !== 'otp') {
      setMode('otp');
    }
  }, [pendingEmail, mode]);

  // Don't manually redirect - let RootLayoutNav handle it declaratively
  // This prevents navigation loops

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      setIsSubmitting(true);
      clearError();
      const result = await login(email, password);
      await startOtpFlow(result.email, false);
      setOtpCode('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : error?.message || 'Login failed';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      clearError();
      const result = await register(email, password, name);
      await startOtpFlow(result.email, true);
      setOtpCode('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : error?.message || 'Registration failed';
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      Alert.alert('Error', 'Please enter the OTP code');
      return;
    }

    if (!pendingEmail) {
      Alert.alert('Error', 'No email found. Please start over.');
      await clearOtpFlow();
      setMode('choice');
      return;
    }

    try {
      setIsSubmitting(true);
      clearError();
      if (isRegistrationFlow) {
        await verifyEmail(pendingEmail, otpCode);
        Alert.alert(
          'Registration Complete',
          'Your account has been created successfully! Please login with your email and password.',
          [
            {
              text: 'OK',
              onPress: () => {
                setMode('login');
                setOtpCode('');
                setEmail(pendingEmail || '');
                setPassword('');
                setName('');
              },
            },
          ]
        );
      } else {
        await verifyOtp(pendingEmail, otpCode);
        // User is now authenticated - RootLayoutNav will handle redirect
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : error?.message || 'Invalid OTP code';
      Alert.alert('Verification Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToForm = () => {
    setMode(isRegistrationFlow ? 'register' : 'login');
    setOtpCode('');
    clearError();
  };

  const handleBackToChoice = () => {
    setEmail('');
    setPassword('');
    setName('');
    setMode('choice');
    clearError();
  };

  const handleSwitchMode = () => {
    if (mode === 'login') {
      setMode('register');
    } else {
      setMode('login');
    }
    clearError();
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
            {mode === 'otp'
              ? 'Verify Code'
              : mode === 'register'
                ? 'Sign up'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Welcome'}
          </ThemedText>
          <ThemedText>
            {mode === 'otp'
              ? `Enter the code sent to ${pendingEmail}`
              : mode === 'register'
                ? 'Create a new account'
                : mode === 'login'
                  ? 'Sign in with your email'
                  : 'Choose an option to continue'}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          {mode === 'choice' ? (
            <>
              <Pressable
                style={styles.primaryButton}
                onPress={() => setMode('login')}
                disabled={isSubmitting}>
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
                disabled={isSubmitting}>
                <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
                  Create account
                </ThemedText>
              </Pressable>
            </>
          ) : mode === 'otp' ? (
            <View style={styles.emailForm}>
              <ThemedText style={styles.hintText}>
                {isRegistrationFlow
                  ? 'Enter the verification code sent to your email to complete registration.'
                  : 'Enter the login code sent to your email.'}
              </ThemedText>
              {error && error.type === 'otp' && (
                <ThemedView style={styles.errorContainer}>
                  <ThemedText style={styles.errorText}>{error.message}</ThemedText>
                </ThemedView>
              )}
              <TextInput
                style={styles.input}
                placeholder="Enter OTP code"
                keyboardType="number-pad"
                value={otpCode}
                onChangeText={setOtpCode}
                maxLength={6}
                autoFocus
                editable={!isSubmitting}
              />
              <Pressable
                style={[styles.primaryButton, (isSubmitting || !otpCode) && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={isSubmitting || !otpCode}>
                {isSubmitting ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                    <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                      Verifying...
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                    Verify
                  </ThemedText>
                )}
              </Pressable>
              <Pressable style={styles.linkButton} onPress={handleBackToForm} disabled={isSubmitting}>
                <ThemedText style={styles.linkText}>Back</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emailForm}>
              {error && error.type === mode && (
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
                  editable={!isSubmitting}
                />
              )}
              <TextInput
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={!isSubmitting}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!isSubmitting}
              />
              <Pressable
                style={[
                  styles.primaryButton,
                  (isSubmitting || !email || !password || (mode === 'register' && !name)) &&
                    styles.buttonDisabled,
                ]}
                onPress={mode === 'login' ? handleLogin : handleRegister}
                disabled={isSubmitting || !email || !password || (mode === 'register' && !name)}>
                {isSubmitting ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                    <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                      {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                    {mode === 'login' ? 'Sign in' : 'Create account'}
                  </ThemedText>
                )}
              </Pressable>
              <Pressable style={styles.linkButton} onPress={handleSwitchMode} disabled={isSubmitting}>
                <ThemedText style={styles.linkText}>
                  {mode === 'login'
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
                </ThemedText>
              </Pressable>
              <Pressable style={styles.linkButton} onPress={handleBackToChoice} disabled={isSubmitting}>
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
    minHeight: 48,
  },
  primaryButtonText: {
    color: '#fff',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    opacity: 0.6,
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
