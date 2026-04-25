import {
  matchId,
  messageId,
  profileId,
  promotionId,
  roomId,
  signedUrl,
  storagePath,
  userId,
} from './brand';

const VALID_UUID = '11111111-2222-3333-4444-555555555555';

describe('UUID-branded constructors', () => {
  it.each([
    ['userId', userId],
    ['profileId', profileId],
    ['matchId', matchId],
    ['roomId', roomId],
    ['messageId', messageId],
    ['promotionId', promotionId],
  ] as const)('%s accepts a valid UUID', (_name, ctor) => {
    expect(ctor(VALID_UUID)).toBe(VALID_UUID);
  });

  it.each([
    ['userId', userId],
    ['profileId', profileId],
    ['matchId', matchId],
    ['roomId', roomId],
    ['messageId', messageId],
    ['promotionId', promotionId],
  ] as const)('%s rejects an invalid UUID', (name, ctor) => {
    expect(() => ctor('not-a-uuid')).toThrow(name);
  });
});

describe('storagePath', () => {
  it('accepts non-empty string', () => {
    expect(storagePath('users/abc/photo.jpg')).toBe('users/abc/photo.jpg');
  });
  it('rejects empty string', () => {
    expect(() => storagePath('')).toThrow('empty');
  });
});

describe('signedUrl', () => {
  it('accepts http(s) URL', () => {
    expect(signedUrl('https://example.com/x')).toBe('https://example.com/x');
    expect(signedUrl('http://example.com/x')).toBe('http://example.com/x');
  });
  it('rejects non-http URLs', () => {
    expect(() => signedUrl('ftp://x')).toThrow('Invalid signed URL');
  });
});
