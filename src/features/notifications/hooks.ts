import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { features } from '@/config/features';
import { type UserId } from '@/lib/brand';
import { createLogger } from '@/lib/logger';

import { upsertPushToken } from './api';

const log = createLogger('notifications');

export const useRegisterPushToken = (userId: UserId | null): void => {
  useEffect(() => {
    if (!features.pushNotifications || userId === null || !Device.isDevice) {
      return;
    }
    void (async () => {
      const settings = await Notifications.getPermissionsAsync();
      const final = settings.granted ? settings : await Notifications.requestPermissionsAsync();
      if (!final.granted) {
        return;
      }
      const t = await Notifications.getDevicePushTokenAsync();
      const result = await upsertPushToken(userId, t.data);
      if (!result.ok) {
        log.error('failed to upsert push token', { code: result.error.code });
      }
    })();
  }, [userId]);
};
