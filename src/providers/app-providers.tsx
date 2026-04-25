import { type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/theme';

import { NotificationsProvider } from './notifications';
import { AppQueryClientProvider } from './query-client';
import { RealtimeProvider } from './realtime';
import { SessionProvider } from './session';

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <AppQueryClientProvider>
        <SessionProvider>
          <RealtimeProvider>
            <NotificationsProvider>{children}</NotificationsProvider>
          </RealtimeProvider>
        </SessionProvider>
      </AppQueryClientProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);
