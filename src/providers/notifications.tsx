import * as Notifications from 'expo-notifications';
import { type ReactNode, useEffect } from 'react';

import { features } from '@/config/features';
import { createLogger } from '@/lib/logger';

const log = createLogger('notifications');

Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
});

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    if (!features.pushNotifications) {
      return;
    }
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      log.info('notification tapped', { id: response.notification.request.identifier });
      // Routing is handled by feature-level hooks that subscribe to Notifications themselves.
    });
    return () => {
      sub.remove();
    };
  }, []);
  return <>{children}</>;
};
