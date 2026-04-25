import { type MatchId, type PromotionId, type RoomId, type UserId } from '@/lib/brand';

export type ExploreFilters = Readonly<{
  genders: ReadonlyArray<string>;
}>;

export type Bounds = Readonly<{
  north: number;
  south: number;
  east: number;
  west: number;
}>;

export const queryKeys = {
  profile: {
    me: () => ['profile', 'me'] as const,
    detail: (id: UserId) => ['profile', 'detail', id] as const,
    photos: (id: UserId) => ['profile', 'photos', id] as const,
  },
  explore: {
    feed: (userId: UserId, filters: ExploreFilters) =>
      ['explore', 'feed', userId, filters] as const,
  },
  matches: {
    list: (userId: UserId) => ['matches', 'list', userId] as const,
    detail: (matchId: MatchId) => ['matches', 'detail', matchId] as const,
  },
  chat: {
    messages: (roomId: RoomId) => ['chat', 'messages', roomId] as const,
    typing: (roomId: RoomId) => ['chat', 'typing', roomId] as const,
    receipts: (roomId: RoomId) => ['chat', 'receipts', roomId] as const,
  },
  promotions: {
    list: (bounds: Bounds) => ['promotions', 'list', bounds] as const,
    availability: (id: PromotionId) => ['promotions', 'availability', id] as const,
    detail: (id: PromotionId) => ['promotions', 'detail', id] as const,
  },
  missedConnections: {
    list: (promotionId: PromotionId) => ['missed', promotionId] as const,
    has: (otherUserId: UserId) => ['missed', 'has', otherUserId] as const,
  },
} as const;
