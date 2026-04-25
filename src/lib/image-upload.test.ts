jest.mock('react-native', () => ({ Platform: { OS: 'web' } }), { virtual: true });
jest.mock(
  'expo-file-system/legacy',
  () => ({
    EncodingType: { Base64: 'base64' },
    readAsStringAsync: jest.fn(),
  }),
  { virtual: true },
);

import { Platform } from 'react-native';
import { readAsStringAsync } from 'expo-file-system/legacy';

import { getImageUploadPayload } from './image-upload';

const mockedRead = readAsStringAsync as jest.MockedFunction<typeof readAsStringAsync>;

describe('getImageUploadPayload (web)', () => {
  beforeEach(() => {
    (Platform as { OS: string }).OS = 'web';
  });

  it('uses fetch().blob() and reports blob type', async () => {
    const blob = new Blob(['x'], { type: 'image/png' });
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(blob, { headers: { 'Content-Type': 'image/png' } }));

    const result = await getImageUploadPayload('blob:abc');
    expect(result.contentType).toBe('image/png');
    expect(result.body).toBeInstanceOf(Blob);
    fetchSpy.mockRestore();
  });

  it('falls back to URI extension when blob.type is empty', async () => {
    const blob = new Blob(['x'], { type: '' });
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(blob));
    const result = await getImageUploadPayload('thing.webp');
    expect(result.contentType).toBe('image/webp');
  });
});

describe('getImageUploadPayload (native)', () => {
  beforeEach(() => {
    (Platform as { OS: string }).OS = 'ios';
    mockedRead.mockReset();
  });

  it.each([
    ['photo.png', 'image/png'],
    ['photo.webp', 'image/webp'],
    ['photo.heic', 'image/heic'],
    ['photo.unknown', 'image/jpeg'],
  ])('reads bytes via FileSystem and guesses content-type for %s', async (uri, expected) => {
    mockedRead.mockResolvedValueOnce(btoa('hello'));
    const result = await getImageUploadPayload(uri);
    expect(result.contentType).toBe(expected);
    expect(result.body).toBeInstanceOf(ArrayBuffer);
    expect(new TextDecoder().decode(result.body as ArrayBuffer)).toBe('hello');
  });
});
