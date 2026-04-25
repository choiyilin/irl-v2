declare const BrandSymbol: unique symbol;

export type Brand<T, B extends string> = T & { readonly [BrandSymbol]: B };

export type UserId = Brand<string, 'UserId'>;
export type ProfileId = Brand<string, 'ProfileId'>;
export type MatchId = Brand<string, 'MatchId'>;
export type RoomId = Brand<string, 'RoomId'>;
export type MessageId = Brand<string, 'MessageId'>;
export type PromotionId = Brand<string, 'PromotionId'>;
export type StoragePath = Brand<string, 'StoragePath'>;
export type SignedUrl = Brand<string, 'SignedUrl'>;

const isUuid = (v: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const brandUuid = <B extends string>(v: string, kind: B): Brand<string, B> => {
  if (!isUuid(v)) {
    throw new Error(`Invalid UUID for ${kind}: ${v}`);
  }
  return v as Brand<string, B>;
};

export const userId = (v: string): UserId => brandUuid(v, 'UserId');
export const profileId = (v: string): ProfileId => brandUuid(v, 'ProfileId');
export const matchId = (v: string): MatchId => brandUuid(v, 'MatchId');
export const roomId = (v: string): RoomId => brandUuid(v, 'RoomId');
export const messageId = (v: string): MessageId => brandUuid(v, 'MessageId');
export const promotionId = (v: string): PromotionId => brandUuid(v, 'PromotionId');

export const storagePath = (v: string): StoragePath => {
  if (v.length === 0) {
    throw new Error('Storage path cannot be empty');
  }
  return v as StoragePath;
};

export const signedUrl = (v: string): SignedUrl => {
  if (!v.startsWith('http')) {
    throw new Error(`Invalid signed URL: ${v}`);
  }
  return v as SignedUrl;
};
