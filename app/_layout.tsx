import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppViewport } from '@/src/components/AppViewport';
import { AuthProvider } from '@/src/providers/AuthProvider';
import { irlNavigationTheme } from '@/src/theme/navigation';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider value={irlNavigationTheme}>
          <StatusBar style="dark" />
          <AppViewport>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="preferences" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="+not-found" />
            </Stack>
          </AppViewport>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
