import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";

const PHOTO_SLOTS = [1, 2, 3, 4, 5, 6];

type ProfilePhoto = {
  id: string;
  slot_index: number;
  storage_path: string;
  publicUrl: string;
};

export default function ProfileScreen() {
  const { signOut, user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [photos, setPhotos] = useState<(ProfilePhoto | null)[]>(
    PHOTO_SLOTS.map(() => null),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const email = user?.email ?? "";
  const metadata = user?.user_metadata ?? {};

  useEffect(() => {
    setFirstName((metadata.first_name as string) ?? "");
    setLastName((metadata.last_name as string) ?? "");
  }, [metadata.first_name, metadata.last_name]);

  const primaryPhoto = photos[0];

  useEffect(() => {
    let isCancelled = false;

    const loadPhotos = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profile_photos")
        .select("id, slot_index, storage_path")
        .eq("user_id", user.id)
        .order("slot_index", { ascending: true });

      if (error || !data) return;

      const next: (ProfilePhoto | null)[] = PHOTO_SLOTS.map(() => null);
      for (const row of data) {
        const { data: publicUrl } = supabase.storage
          .from("profile-photos")
          .getPublicUrl(row.storage_path);
        next[row.slot_index - 1] = {
          id: row.id,
          slot_index: row.slot_index,
          storage_path: row.storage_path,
          publicUrl: publicUrl.publicUrl,
        };
      }
      if (!isCancelled) {
        setPhotos(next);
      }
    };

    loadPhotos();
    return () => {
      isCancelled = true;
    };
  }, [user]);

  const openPickerForSlot = async (index: number) => {
    setErrorMessage("");
    setInfoMessage("");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.9,
    });

    if (result.canceled) return;

    const uri = result.assets?.[0]?.uri;
    if (!uri || !user) return;

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = "jpg";
      const path = `${user.id}/slot-${index + 1}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("profile-photos")
        .upload(path, blob, {
          contentType: blob.type || "image/jpeg",
          upsert: false,
        });
      if (error || !data) {
        throw new Error(error?.message ?? "Unable to upload image.");
      }

      const { data: publicUrl } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(data.path);

      setPhotos((prev) => {
        const next = [...prev];
        next[index] = {
          id: prev[index]?.id ?? "",
          slot_index: index + 1,
          storage_path: data.path,
          publicUrl: publicUrl.publicUrl,
        };
        return next;
      });
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : "Could not update photo.",
      );
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setErrorMessage("");
    setInfoMessage("");
    setIsSaving(true);
    try {
      await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
        },
      });

      const existing = photos.filter((p): p is ProfilePhoto => !!p);
      if (existing.length > 0) {
        await supabase.from("profile_photos").delete().eq("user_id", user.id);
        const records = existing.map((p) => ({
          user_id: user.id,
          slot_index: p.slot_index,
          storage_path: p.storage_path,
        }));
        await supabase.from("profile_photos").insert(records);
      }

      setInfoMessage("Profile updated.");
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : "Could not save profile.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Pressable
            style={styles.avatar}
            onPress={() => openPickerForSlot(0)}
          >
            {primaryPhoto ? (
              <Image
                source={{ uri: primaryPhoto.publicUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {(firstName?.[0] ?? "").toUpperCase() ||
                    (user?.email?.[0] ?? "?").toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditBadgeText}>✎</Text>
            </View>
          </Pressable>
        </View>
        <Text style={styles.title}>
          {firstName || lastName
            ? `${firstName} ${lastName}`.trim()
            : user?.email ?? "Profile"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Name</Text>
        <View style={styles.nameRow}>
          <TextInput
            placeholder="First name"
            placeholderTextColor={colors.mutedText}
            style={[styles.input, styles.nameInput]}
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            placeholder="Last name"
            placeholderTextColor={colors.mutedText}
            style={[styles.input, styles.nameInput]}
            value={lastName}
            onChangeText={setLastName}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.readonly}>{email}</Text>
        <Text style={styles.label}>Date of birth</Text>
        <Text style={styles.readonly}>
          {(metadata.date_of_birth as string) ?? "Not set"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Photos</Text>
        <View style={styles.grid}>
          {PHOTO_SLOTS.map((slot, index) => {
            const photo = photos[index];
            return (
              <Pressable
                key={slot}
                style={styles.photoSlot}
                onPress={() => openPickerForSlot(index)}
              >
                {photo ? (
                  <Image
                    source={{ uri: photo.publicUrl }}
                    style={styles.photoImage}
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoPlaceholderIcon}>＋</Text>
                  </View>
                )}
                <Text style={styles.photoLabel}>Photo {slot}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {infoMessage ? <Text style={styles.info}>{infoMessage}</Text> : null}

      <Pressable
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.saveButtonText}>Save changes</Text>
        )}
      </Pressable>

      <Text style={styles.logout} onPress={() => signOut()}>
        Sign out
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 16,
    gap: 12,
  },
  header: {
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  title: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 22,
    fontWeight: "700",
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    height: 120,
    width: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.border,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  avatarPlaceholder: {
    height: "100%",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  avatarInitials: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 36,
    fontWeight: "700",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    height: 28,
    width: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadgeText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
  },
  label: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    marginTop: 4,
  },
  readonly: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    marginTop: 2,
  },
  nameRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  nameInput: {
    flex: 1,
    minWidth: 0,
  },
  input: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginTop: 4,
  },
  photoSlot: {
    width: "30%",
    aspectRatio: 3 / 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 6,
  },
  photoImage: {
    width: "100%",
    height: "75%",
    borderRadius: 8,
  },
  photoPlaceholder: {
    width: "100%",
    height: "75%",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderIcon: {
    color: colors.mutedText,
    fontSize: 24,
  },
  photoLabel: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: "600",
  },
  logout: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    textDecorationLine: "underline",
    marginTop: 12,
    textAlign: "center",
  },
  error: {
    color: "#FF3B30",
    fontFamily: typography.fontFamily,
    fontSize: 14,
    marginTop: 4,
  },
  info: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    marginTop: 4,
  },
});

