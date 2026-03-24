import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';

export default function AuthLayout() {
  const { isAuthReady, session, canEnterMainApp } = useAuth();
  const segments = useSegments();
  const onSignUp = segments.includes('sign-up');

  if (!isAuthReady) {
    // Critical: while the multi-step sign-up wizard is active, we must not replace the
    // whole tree with a loading screen; otherwise the wizard unmounts and resets to
    // step="name" (what users see as a "loop").
    if (session && onSignUp) {
      // Continue rendering the stack; redirects based on `canEnterMainApp`
      // will happen once `isAuthReady` becomes true.
    } else {
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
  }

  if (session) {
    if (canEnterMainApp) {
      return <Redirect href="/" />;
    }

    // Mid sign-up: session exists but profile onboarding (gender, orientation, etc.) not finished.
    // Stay on sign-up; only redirect from sign-in (etc.) to sign-up.
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

