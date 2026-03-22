import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";

const PHOTO_SLOTS = [1, 2, 3, 4, 5, 6];

const GENDER_OPTIONS = ["Man", "Woman", "Non-binary", "Prefer to self-describe"] as const;
const ORIENTATION_OPTIONS = [
  "Straight",
  "Gay",
  "Lesbian",
  "Bisexual",
  "Pansexual",
  "Asexual",
  "Queer",
  "Questioning",
  "Prefer not to say",
] as const;
const INTERESTED_IN_OPTIONS = ["Women", "Men", "Non-binary people", "Everyone"] as const;

type ProfilePhoto = {
  id: string;
  slot_index: number;
  storage_path: string;
  displayUrl: string;
};

type PromotionTicket = {
  id: string;
  claimed_at: string;
  promotion: {
    id: string;
    business_name: string;
    category: string;
    description: string;
    ends_at: string | null;
    is_active: boolean;
  };
};

function formatClaimedDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Claimed recently";
  return `Claimed ${date.toLocaleDateString()}`;
}

/** `Alert.alert` is unreliable on web; use a synchronous confirm so Back always does something. */
function confirmLeaveSettings(message: string, onConfirm: () => void | Promise<void>) {
  const title = "Confirm changes";
  if (Platform.OS === "web") {
    if (typeof globalThis !== "undefined" && typeof globalThis.confirm === "function") {
      if (globalThis.confirm(`${title}\n\n${message}`)) {
        void Promise.resolve(onConfirm());
      }
    }
    return;
  }
  Alert.alert(title, message, [
    { text: "Keep editing", style: "cancel" },
    { text: "Go back", onPress: () => void Promise.resolve(onConfirm()) },
  ]);
}

function alertPhotosNotSaved() {
  const msg = "Fix the error above before leaving, or keep editing.";
  if (Platform.OS === "web") {
    globalThis.alert?.(`Photos not saved\n\n${msg}`);
    return;
  }
  Alert.alert("Photos not saved", msg);
}

async function persistPhotoSlot(userId: string, slotIndex: number, storagePath: string) {
  const { error } = await supabase.from("profile_photos").upsert(
    {
      user_id: userId,
      slot_index: slotIndex,
      storage_path: storagePath,
    },
    { onConflict: "user_id,slot_index" },
  );
  if (error) throw new Error(error.message);
}

export default function ProfileScreen() {
  const { signOut, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [photos, setPhotos] = useState<(ProfilePhoto | null)[]>(
    PHOTO_SLOTS.map(() => null),
  );
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [tickets, setTickets] = useState<PromotionTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPhotoSaving, setIsPhotoSaving] = useState(false);
  const [photoDraftDirty, setPhotoDraftDirty] = useState(false);
  const photoSavePromiseRef = useRef<Promise<boolean> | null>(null);

  const [settingsFirstName, setSettingsFirstName] = useState("");
  const [settingsLastName, setSettingsLastName] = useState("");
  const [settingsGender, setSettingsGender] = useState<string>("");
  const [settingsSexualOrientation, setSettingsSexualOrientation] = useState<string>("");
  const [settingsInterestedIn, setSettingsInterestedIn] = useState<string[]>([]);

  const email = user?.email ?? "";
  const metadata = user?.user_metadata ?? {};

  useEffect(() => {
    setFirstName((metadata.first_name as string) ?? "");
    setLastName((metadata.last_name as string) ?? "");
  }, [metadata.first_name, metadata.last_name]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    // New edit session; clear any previous "dirty" photo state.
    setPhotoDraftDirty(false);
    photoSavePromiseRef.current = null;
    setIsPhotoSaving(false);
    setSettingsFirstName((metadata.first_name as string) ?? "");
    setSettingsLastName((metadata.last_name as string) ?? "");
    setSettingsGender((metadata.gender as string) ?? "");
    setSettingsSexualOrientation((metadata.sexual_orientation as string) ?? "");

    const raw = (metadata.interested_in_seeing as string) ?? "";
    const parsed = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Keep the stored "Everyone" behavior consistent with the signup UI.
    if (parsed.includes("Everyone")) {
      setSettingsInterestedIn(["Everyone"]);
    } else {
      setSettingsInterestedIn(parsed);
    }
  }, [
    isSettingsOpen,
    metadata.first_name,
    metadata.last_name,
    metadata.gender,
    metadata.sexual_orientation,
    metadata.interested_in_seeing,
  ]);

  const toggleInterestedIn = (option: string) => {
    setSettingsInterestedIn((prev) => {
      if (option === "Everyone") {
        return prev.includes("Everyone") ? [] : ["Everyone"];
      }
      const withoutEveryone = prev.filter((o) => o !== "Everyone");
      if (withoutEveryone.includes(option)) {
        return withoutEveryone.filter((o) => o !== option);
      }
      return [...withoutEveryone, option];
    });
  };

  const primaryPhoto = photos[0];

  useEffect(() => {
    let isCancelled = false;
    const userId = user?.id;

    const loadPhotos = async () => {
      if (!userId) return;
      setIsLoadingPhotos(true);
      const { data, error } = await supabase
        .from("profile_photos")
        .select("id, slot_index, storage_path")
        .eq("user_id", userId)
        .order("slot_index", { ascending: true });

      if (error || !data) {
        if (!isCancelled) setIsLoadingPhotos(false);
        return;
      }

      const next: (ProfilePhoto | null)[] = PHOTO_SLOTS.map(() => null);
      const rows = data as Array<{
        id: string;
        slot_index: number;
        storage_path: string;
      }>;

      try {
        // Create signed URLs in parallel to avoid a long "empty tiles" period.
        const signedResults = await Promise.all(
          rows.map(async (row) => {
            const { data: signed, error: signedError } = await supabase.storage
              .from("profile-photos")
              .createSignedUrl(row.storage_path, 60 * 60);

            if (signedError || !signed) return null;
            return { row, signedUrl: signed.signedUrl };
          }),
        );

        for (const item of signedResults) {
          if (!item) continue;
          const { row, signedUrl } = item;
          next[row.slot_index - 1] = {
            id: row.id,
            slot_index: row.slot_index,
            storage_path: row.storage_path,
            displayUrl: signedUrl,
          };
        };

        if (!isCancelled) setPhotos(next);
      } catch (e) {
        // Keep existing photos; spinner stops so UI doesn't feel "broken".
      } finally {
        if (!isCancelled) setIsLoadingPhotos(false);
      }
    };

    loadPhotos();
    return () => {
      isCancelled = true;
      setIsLoadingPhotos(false);
    };
  }, [user?.id]);

  useEffect(() => {
    let isCancelled = false;
    const userId = user?.id;

    const loadTickets = async () => {
      if (!userId) {
        if (!isCancelled) setTickets([]);
        return;
      }

      setIsLoadingTickets(true);
      const { data, error } = await supabase
        .from("promotion_tickets")
        .select(
          "id, claimed_at, business_promotions(id, business_name, category, description, ends_at, is_active)",
        )
        .eq("user_id", userId)
        .order("claimed_at", { ascending: false });

      if (error || !data) {
        if (!isCancelled) setTickets([]);
        setIsLoadingTickets(false);
        return;
      }

      const normalized = data
        .map((row) => {
          const promotionRow = Array.isArray(row.business_promotions)
            ? row.business_promotions[0]
            : row.business_promotions;

          if (!promotionRow) return null;

          return {
            id: row.id as string,
            claimed_at: row.claimed_at as string,
            promotion: {
              id: promotionRow.id as string,
              business_name: promotionRow.business_name as string,
              category: promotionRow.category as string,
              description: promotionRow.description as string,
              ends_at: (promotionRow.ends_at as string | null) ?? null,
              is_active: Boolean(promotionRow.is_active),
            },
          } satisfies PromotionTicket;
        })
        .filter((ticket): ticket is PromotionTicket => Boolean(ticket));

      if (!isCancelled) {
        setTickets(normalized);
      }
      setIsLoadingTickets(false);
    };

    loadTickets();

    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  const activeTickets = useMemo(() => {
    const now = Date.now();
    return tickets.filter((ticket) => {
      const endsAt = ticket.promotion.ends_at ? new Date(ticket.promotion.ends_at).getTime() : null;
      const notExpired = endsAt === null || endsAt > now;
      return ticket.promotion.is_active && notExpired;
    });
  }, [tickets]);

  const pastTickets = useMemo(() => {
    const now = Date.now();
    return tickets.filter((ticket) => {
      const endsAt = ticket.promotion.ends_at ? new Date(ticket.promotion.ends_at).getTime() : null;
      const expired = endsAt !== null && endsAt <= now;
      return !ticket.promotion.is_active || expired;
    });
  }, [tickets]);

  const openPickerForSlot = async (index: number) => {
    if (!user) return;
    if (isPhotoSaving) return;
    setErrorMessage("");
    setInfoMessage("");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.9,
    });

    if (result.canceled) return;

    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    setPhotoDraftDirty(true);
    let optimisticSnapshot: (ProfilePhoto | null)[] = [];
    setPhotos((prev) => {
      optimisticSnapshot = [...prev];
      optimisticSnapshot[index] = {
        id: prev[index]?.id ?? "",
        slot_index: index + 1,
        storage_path: prev[index]?.storage_path ?? "",
        // Show local preview immediately while upload runs.
        displayUrl: uri,
      };
      return optimisticSnapshot;
    });

    setIsPhotoSaving(true);
    const savePromise = (async () => {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const path = `${user.id}/slot-${index + 1}-${Date.now()}.jpg`;

        const { data, error } = await supabase.storage
          .from("profile-photos")
          .upload(path, blob, {
            contentType: blob.type || "image/jpeg",
            upsert: false,
          });
        if (error || !data) throw new Error(error?.message ?? "Could not upload photo.");

        let nextSnapshot: (ProfilePhoto | null)[] = [];
        setPhotos((prev) => {
          nextSnapshot = [...prev];
          nextSnapshot[index] = {
            id: prev[index]?.id ?? "",
            slot_index: index + 1,
            storage_path: data.path,
            // Keep local URI so the preview remains stable immediately after upload.
            displayUrl: uri,
          };
          return nextSnapshot;
        });

        await persistPhotoSlot(user.id, index + 1, data.path);
        const { error: metaError } = await supabase.auth.updateUser({
          data: { has_uploaded_photos: nextSnapshot.some((p) => p !== null) },
        });
        if (metaError) throw new Error(metaError.message);
        setInfoMessage("Photo updated.");
        return true;
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "Could not update photo.");
        return false;
      }
    })();

    photoSavePromiseRef.current = savePromise;
    const ok = await savePromise;
    photoSavePromiseRef.current = null;
    setIsPhotoSaving(false);
    return ok;
  };

  const finalizeCloseSettings = async () => {
    const p = photoSavePromiseRef.current;
    const ok = p ? await p : true;
    if (!ok) {
      alertPhotosNotSaved();
      return;
    }
    setIsSettingsOpen(false);
    setPhotoDraftDirty(false);
    setErrorMessage("");
    setInfoMessage("");
  };

  const handleCloseSettings = () => {
    if (!photoDraftDirty && !isPhotoSaving) {
      setIsSettingsOpen(false);
      setErrorMessage("");
      setInfoMessage("");
      return;
    }

    const message = isPhotoSaving
      ? "Photos are still saving. Do you want to go back?"
      : "Do you want to go back? Your photo changes will be kept.";

    confirmLeaveSettings(message, finalizeCloseSettings);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 20) + 56 },
      ]}
      keyboardShouldPersistTaps={isSettingsOpen ? "always" : "handled"}
      stickyHeaderIndices={isSettingsOpen ? [1] : undefined}
    >
      <View style={[styles.headerRow, { paddingTop: insets.top ? insets.top : 0 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                {primaryPhoto ? (
                  <Image source={{ uri: primaryPhoto.displayUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>
                      {(firstName?.[0] ?? "").toUpperCase() ||
                        (user?.email?.[0] ?? "?").toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <Text style={styles.title}>
            {firstName || lastName ? `${firstName} ${lastName}`.trim() : user?.email ?? "Profile"}
          </Text>
        </View>

        {!isSettingsOpen ? (
          <Pressable
            style={styles.editProfileLink}
            onPress={() => {
              setErrorMessage("");
              setInfoMessage("");
              setIsSettingsOpen(true);
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <Text style={styles.editProfileLinkText}>Edit profile</Text>
          </Pressable>
        ) : null}
      </View>

      {isSettingsOpen ? (
        <>
          <View style={styles.settingsTopBar} collapsable={false}>
            <Pressable
              style={({ pressed }) => [
                styles.previousButton,
                pressed && styles.previousButtonPressed,
              ]}
              onPress={handleCloseSettings}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              accessibilityRole="button"
              accessibilityLabel="Back to profile"
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Name</Text>
            <View style={styles.nameRow}>
              <TextInput
                placeholder="First name"
                placeholderTextColor={colors.mutedText}
                style={[styles.input, styles.nameInput]}
                value={settingsFirstName}
                onChangeText={setSettingsFirstName}
              />
              <TextInput
                placeholder="Last name"
                placeholderTextColor={colors.mutedText}
                style={[styles.input, styles.nameInput]}
                value={settingsLastName}
                onChangeText={setSettingsLastName}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Photos</Text>
            <View style={styles.grid}>
              {isLoadingPhotos ? (
                <View style={styles.photosLoadingOverlay}>
                  <ActivityIndicator color={colors.text} />
                </View>
              ) : null}
              {PHOTO_SLOTS.map((slot, index) => {
                const photo = photos[index];
                return (
                  <Pressable
                    key={slot}
                    style={styles.photoSlot}
                    disabled={isPhotoSaving}
                    onPress={() => openPickerForSlot(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit photo ${slot}`}
                  >
                    {photo ? (
                      <Image source={{ uri: photo.displayUrl }} style={styles.photoImage} />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Text style={styles.photoPlaceholderIcon}>No photo</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account</Text>

            <View style={styles.preferenceSection}>
              <Text style={styles.preferenceSectionLabel}>Email</Text>
              <Text style={styles.accountReadonlyValue}>{email}</Text>
            </View>

            <View style={styles.preferenceDivider} />

            <View style={styles.preferenceSection}>
              <Text style={styles.preferenceSectionLabel}>Date of birth</Text>
              <Text style={styles.accountReadonlyValue}>
                {(metadata.date_of_birth as string) ?? "Not set"}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Preferences</Text>

            <View style={styles.preferenceSection}>
              <Text style={styles.preferenceSectionLabel}>Gender</Text>
              <View style={styles.chipRow}>
                {GENDER_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    style={[styles.chip, settingsGender === option && styles.chipSelected]}
                    onPress={() => setSettingsGender(option)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        settingsGender === option && styles.chipTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.preferenceDivider} />

            <View style={styles.preferenceSection}>
              <Text style={styles.preferenceSectionLabel}>Sexual orientation</Text>
              <View style={styles.chipRow}>
                {ORIENTATION_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    style={[
                      styles.chip,
                      settingsSexualOrientation === option && styles.chipSelected,
                    ]}
                    onPress={() => setSettingsSexualOrientation(option)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        settingsSexualOrientation === option && styles.chipTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.preferenceDivider} />

            <View style={styles.preferenceSection}>
              <Text style={styles.preferenceSectionLabel}>Who you’re interested in seeing</Text>
              <View style={styles.hintRow}>
                <Text style={styles.hintText}>
                  Select one or more. “Everyone” clears other choices.
                </Text>
              </View>
              <View style={styles.chipRow}>
                {INTERESTED_IN_OPTIONS.map((option) => {
                  const selected = settingsInterestedIn.includes(option);
                  return (
                    <Pressable
                      key={option}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => toggleInterestedIn(option)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          {infoMessage ? <Text style={styles.info}>{infoMessage}</Text> : null}

          <Text style={[styles.logout, styles.logoutInSettings]} onPress={() => signOut()}>
            Sign out
          </Text>
        </>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tickets</Text>
            {isLoadingTickets ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Text style={styles.ticketSectionTitle}>Current tickets</Text>
                {activeTickets.length > 0 ? (
                  activeTickets.map((ticket) => (
                    <View key={ticket.id} style={styles.ticketCard}>
                      <Text style={styles.ticketVenue}>{ticket.promotion.business_name}</Text>
                      <Text style={styles.ticketMeta}>
                        {ticket.promotion.category} • {formatClaimedDate(ticket.claimed_at)}
                      </Text>
                      <Text style={styles.ticketDescription}>{ticket.promotion.description}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.ticketEmpty}>No active tickets.</Text>
                )}

                <Text style={styles.ticketSectionTitle}>Past tickets</Text>
                {pastTickets.length > 0 ? (
                  pastTickets.map((ticket) => (
                    <View key={ticket.id} style={styles.ticketCard}>
                      <Text style={styles.ticketVenue}>{ticket.promotion.business_name}</Text>
                      <Text style={styles.ticketMeta}>
                        {ticket.promotion.category} • {formatClaimedDate(ticket.claimed_at)}
                      </Text>
                      <Text style={styles.ticketDescription}>{ticket.promotion.description}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.ticketEmpty}>No past tickets yet.</Text>
                )}
              </>
            )}
          </View>
        </>
      )}

      {!isSettingsOpen ? (
        <>
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          {infoMessage ? <Text style={styles.info}>{infoMessage}</Text> : null}

          <Text style={[styles.logout, styles.logoutMain]} onPress={() => signOut()}>
            Sign out
          </Text>
        </>
      ) : null}
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
  headerRow: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLeft: {
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  editProfileLink: {
    position: "absolute",
    right: 0,
    top: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  editProfileLinkText: {
    color: colors.brandPink,
    fontSize: 15,
    fontFamily: typography.fontFamily,
    fontWeight: "600",
  },
  settingsTopBar: {
    marginTop: 4,
    marginBottom: 14,
    zIndex: 2,
    elevation: 4,
    backgroundColor: colors.background,
  },
  previousButton: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  previousButtonPressed: {
    opacity: 0.72,
    backgroundColor: "rgba(0, 0, 0, 0.09)",
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
  avatarWrap: {
    position: "relative",
    width: 120,
    height: 120,
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
  card: {
    backgroundColor: colors.background,
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
    position: "relative",
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
    justifyContent: "center",
    padding: 0,
    backgroundColor: colors.background,
  },
  photoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  photoPlaceholderIcon: {
    color: colors.mutedText,
    fontSize: 13,
    fontFamily: typography.fontFamily,
  },
  photosLoadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 12,
  },
  ticketSectionTitle: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  ticketCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: 10,
    gap: 3,
  },
  ticketVenue: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: "700",
  },
  ticketMeta: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 12,
  },
  ticketDescription: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
  },
  ticketEmpty: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    marginBottom: 4,
  },
  preferenceSection: {
    paddingVertical: 14,
    gap: 10,
  },
  preferenceSectionLabel: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: "700",
  },
  accountReadonlyValue: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    lineHeight: 22,
  },
  preferenceDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 0,
  },
  hintRow: {
    marginTop: 0,
    marginBottom: 0,
  },
  hintText: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 13,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: {
    borderColor: colors.text,
    backgroundColor: colors.surface,
  },
  chipText: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 14,
  },
  chipTextSelected: {
    color: colors.text,
    fontWeight: "700",
  },
  logout: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    textDecorationLine: "underline",
    textAlign: "center",
  },
  logoutMain: {
    marginTop: 56,
    paddingVertical: 16,
  },
  logoutInSettings: {
    marginTop: 28,
    paddingVertical: 12,
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

