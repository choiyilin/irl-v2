import { EncodingType, readAsStringAsync } from "expo-file-system/legacy";
import { Platform } from "react-native";

function guessContentType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".heic")) return "image/heic";
  return "image/jpeg";
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export type ImageUploadPayload = {
  body: Blob | ArrayBuffer;
  contentType: string;
};

/**
 * Web: `fetch(uri)` works for blob/object URLs. Native iOS/Android: `fetch` on
 * `file://` URIs from the image picker is unreliable; read bytes via FileSystem.
 */
export async function getImageUploadPayload(uri: string): Promise<ImageUploadPayload> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return {
      body: blob,
      contentType: blob.type || guessContentType(uri),
    };
  }

  const base64 = await readAsStringAsync(uri, {
    encoding: EncodingType.Base64,
  });

  return {
    body: base64ToArrayBuffer(base64),
    contentType: guessContentType(uri),
  };
}
