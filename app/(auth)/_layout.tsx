import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';

export default function AuthLayout() {
  const { isAuthReady, session, canEnterMainApp } = useAuth();
  const segments = useSegments();

  if (!isAuthReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (session) {
    if (canEnterMainApp) {
      return <Redirect href="/" />;
    }

    // Mid sign-up: session exists but profile onboarding (gender, orientation, etc.) not finished.
    // Stay on sign-up; only redirect from sign-in (etc.) to sign-up.
    const onSignUp = segments.includes('sign-up');
    if (!onSignUp) {
      return <Redirect href="/(auth)/sign-up" />;
    }
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="sign-in" options={{ title: 'Sign In' }} />
      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
    </Stack>
  );
}

