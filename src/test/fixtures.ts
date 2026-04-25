import {
  matchId,
  messageId,
  profileId,
  promotionId,
  roomId,
  signedUrl,
  storagePath,
  userId,
} from '@/lib/brand';

export const fixtures = {
  user: () => ({
    id: userId('11111111-1111-1111-1111-111111111111'),
    email: 'alice@example.com',
  }),
  profile: () => ({
    id: profileId('11111111-1111-1111-1111-111111111111'),
    displayName: 'Alice',
    age: 28,
    bio: 'Hello',
    city: 'New York',
    onboardingComplete: true,
  }),
  match: () => ({
    id: matchId('22222222-2222-2222-2222-222222222222'),
    userLowId: userId('11111111-1111-1111-1111-111111111111'),
    userHighId: userId('99999999-9999-9999-9999-999999999999'),
    createdAt: '2026-04-25T12:00:00Z',
  }),
  room: () => ({
    id: roomId('33333333-3333-3333-3333-333333333333'),
    matchId: matchId('22222222-2222-2222-2222-222222222222'),
  }),
  message: () => ({
    id: messageId('44444444-4444-4444-4444-444444444444'),
    roomId: roomId('33333333-3333-3333-3333-333333333333'),
    senderId: userId('11111111-1111-1111-1111-111111111111'),
    body: 'hi',
    createdAt: '2026-04-25T12:01:00Z',
  }),
  promotion: () => ({
    id: promotionId('55555555-5555-5555-5555-555555555555'),
    businessName: 'Test Bar',
    category: 'bar',
    description: '20% off cocktails',
    latitude: 40.74,
    longitude: -73.99,
    isActive: true,
    maxClaims: 10,
  }),
  storagePath: () => storagePath('users/11111111/photo-0.jpg'),
  signedUrl: () => signedUrl('https://example.supabase.co/object/sign/abc'),
} as const;
