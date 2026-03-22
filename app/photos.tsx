import * as ImagePicker from "expo-image-picker";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getImageUploadPayload } from "@/src/lib/getImageUploadPayload";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";

const PHOTO_SLOTS = [1, 2, 3, 4, 5, 6];
const STORAGE_BUCKET = "profile-photos";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Could not save photos step.";
}

async function uploadPhotoToSupabase(
  uri: string,
  userId: string,
  slotIndex: number,
) {
  const { body, contentType } = await getImageUploadPayload(uri);

  const fileExt = "jpg";
  const path = `${userId}/slot-${slotIndex + 1}-${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, body, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data.path;
}

export default function PhotosScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [photos, setPhotos] = useState<(string | null)[]>(
    PHOTO_SLOTS.map(() => null),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setErrorMessage(
          "We need access to your photos to let you add pictures.",
        );
      }
    })();
  }, []);

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const openPickerForSlot = async (slotIndex: number) => {
    setErrorMessage("");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.9,
    });

    if (result.canceled) {
      return;
    }

    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    setPhotos((prev) => {
      const next = [...prev];
      next[slotIndex] = uri;
      return next;
    });
  };

  const hasSixPhotos = photos.filter((uri) => uri !== null).length === 6;

  const handleContinue = async () => {
    setErrorMessage("");
    if (!hasSixPhotos) {
      setErrorMessage("Please add six photos to continue.");
      return;
    }
    if (!session) {
      setErrorMessage("You must be signed in to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      const userId = session.user.id;

      const paths: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const uri = photos[i];
        if (!uri) continue;
        const path = await uploadPhotoToSupabase(uri, userId, i);
        paths.push(path);
      }

      const records = paths.map((path, index) => ({
        user_id: userId,
        slot_index: index + 1,
        storage_path: path,
      }));

      const { error: insertError } = await supabase
        .from("profile_photos")
        .insert(records);
      if (insertError) {
        throw new Error(insertError.message);
      }

      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          has_uploaded_photos: true,
        },
      });
      if (metaError) throw new Error(metaError.message);

      router.replace("/(tabs)/explore");
    } catch (e) {
      setErrorMessage(getErrorMessage(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Add photos</Text>
      <Text style={styles.subtitle}>
        Choose six photos that best represent you. You can fine-tune them later.
      </Text>

      <View style={styles.grid}>
        {PHOTO_SLOTS.map((slot, index) => {
          const uri = photos[index];
          const isSelected = !!uri;
          return (
            <Pressable
              key={slot}
              style={[styles.photoSlot, isSelected && styles.photoSlotSelected]}
              onPress={() => openPickerForSlot(index)}
            >
              {uri ? (
                <Image source={{ uri }} style={styles.photoImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderIcon}>＋</Text>
                </View>
              )}
              <View style={styles.photoTextRow}>
                <Text style={styles.photoSlotLabel}>Photo {slot}</Text>
                <Text style={styles.photoSlotHint}>
                  {isSelected ? "Selected" : "Tap to add from library"}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <Pressable
        style={[styles.button, !hasSixPhotos && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={isSubmitting || !hasSixPhotos}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 16,
  },
  title: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 34,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
    marginTop: 8,
  },
  photoSlot: {
    width: "48%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 10,
    justifyContent: "space-between",
  },
  photoSlotSelected: {
    borderColor: colors.text,
  },
  photoImage: {
    width: "100%",
    height: "70%",
    borderRadius: 12,
    marginBottom: 8,
  },
  photoPlaceholder: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  photoPlaceholderIcon: {
    color: colors.mutedText,
    fontSize: 28,
  },
  photoTextRow: {
    gap: 2,
  },
  photoSlotLabel: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
  },
  photoSlotHint: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 13,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    minHeight: 56,
    justifyContent: "center",
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 18,
    fontWeight: "600",
  },
  error: {
    color: "#FF3B30",
    fontFamily: typography.fontFamily,
    fontSize: 14,
    marginTop: -8,
  },
});
