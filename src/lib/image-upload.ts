import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export type ImageUploadPayload = Readonly<{
  body: Blob | ArrayBuffer;
  contentType: string;
}>;

const guessContentType = (uri: string): string => {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) {
    return 'image/png';
  }
  if (lower.includes('.webp')) {
    return 'image/webp';
  }
  if (lower.includes('.heic')) {
    return 'image/heic';
  }
  return 'image/jpeg';
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

export const getImageUploadPayload = async (uri: string): Promise<ImageUploadPayload> => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return {
      body: blob,
      contentType: blob.type !== '' ? blob.type : guessContentType(uri),
    };
  }
  const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
  return {
    body: base64ToArrayBuffer(base64),
    contentType: guessContentType(uri),
  };
};
