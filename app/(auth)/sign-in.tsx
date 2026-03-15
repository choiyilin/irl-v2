import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

export default function SignInScreen() {
  const { signIn, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async () => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>In Real Love</Text>
      <Text style={styles.subtitle}>Sign in to start exploring new connections.</Text>
      {!isConfigured ? (
        <Text style={styles.warning}>
          Add Supabase env vars in `.env` before authentication will work.
        </Text>
      ) : null}
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor={colors.mutedText}
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        secureTextEntry
        placeholder="Password"
        placeholderTextColor={colors.mutedText}
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <Pressable style={styles.button} onPress={handleSignIn} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </Pressable>
      <Link href="/(auth)/sign-up" style={styles.link}>
        No account yet? Create one
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    marginBottom: 4,
  },
  warning: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    padding: 10,
  },
  input: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  error: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 13,
  },
});

