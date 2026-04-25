import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { type UserId } from '@/lib/brand';

import { fetchPhotos, fetchProfile } from './api';

export const useProfile = (id: UserId) =>
  useQuery({
    queryKey: queryKeys.profile.detail(id),
    queryFn: async () => {
      const r = await fetchProfile(id);
      if (!r.ok) {
        throw r.error;
      }
      return r.value;
    },
  });

export const useProfilePhotos = (id: UserId) =>
  useQuery({
    queryKey: queryKeys.profile.photos(id),
    queryFn: async () => {
      const r = await fetchPhotos(id);
      if (!r.ok) {
        throw r.error;
      }
      return r.value;
    },
  });
