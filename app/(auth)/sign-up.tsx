import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Linking from "expo-linking";

import { useAuth } from "@/src/providers/AuthProvider";
import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";

type Step =
  | "name"
  | "dob"
  | "email"
  | "password"
  | "verifyEmail"
  | "gender"
  | "sexualOrientation"
  | "interestedIn"
  | "profilePicture"
  | "profilePhotos6";

const PHOTO_SLOT_COUNT = 6;
const PHOTO_SLOTS = [1, 2, 3, 4, 5, 6] as const;
const STORAGE_BUCKET = "profile-photos";

async function uploadPhotoToSupabase(uri: string, userId: string, slotIndex: number) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const fileExt = "jpg";
  const path = `${userId}/slot-${slotIndex + 1}-${Date.now()}.${fileExt}`;
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return data.path;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function formatDobInput(text: string) {
  const digits = text.replace(/[^\d]/g, "").slice(0, 8); // MMDDYYYY
  const mm = digits.slice(0, 2);
  const dd = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  if (digits.length <= 2) return mm;
  if (digits.length <= 4) return `${mm}/${dd}`;
  return `${mm}/${dd}/${yyyy}`;
}

function parseDob(text: string): Date | null {
  const cleaned = text.trim();
  const parts = cleaned.split("/");
  if (parts.length !== 3) return null;
  const month = parseInt(parts[0], 10) - 1;
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
  if (month < 0 || month > 11) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1950 || year > new Date().getFullYear()) return null;
  const date = new Date(year, month, day);
  if (date.getMonth() !== month || date.getDate() !== day || date.getFullYear() !== year) {
    return null;
  }
  return date;
}

const GENDER_OPTIONS = [
  "Man",
  "Woman",
  "Non-binary",
  "Prefer to self-describe",
] as const;

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

const INTERESTED_IN_OPTIONS = [
  "Women",
  "Men",
  "Non-binary people",
  "Everyone",
] as const;

export default function SignUpScreen() {
  const { signIn, isConfigured, session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("name");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirthInput, setDateOfBirthInput] = useState("");
  /** How we reached post-signup steps (for correct back from Gender). */
  const [genderEntrySource, setGenderEntrySource] = useState<"instant" | "verified" | null>(null);
  const [gender, setGender] = useState("");
  const [sexualOrientation, setSexualOrientation] = useState("");
  const [interestedInSelections, setInterestedInSelections] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [signupPhotoUris, setSignupPhotoUris] = useState<(string | null)[]>(() =>
    Array.from({ length: PHOTO_SLOT_COUNT }, () => null),
  );

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const parsedDob = useMemo(() => parseDob(dateOfBirthInput), [dateOfBirthInput]);
  const dobIsComplete = dateOfBirthInput.trim().length >= 10;
  const isUnder18 = parsedDob !== null && calculateAge(parsedDob) < 18;
  const isAdult = parsedDob !== null && calculateAge(parsedDob) >= 18;

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const emailRedirectTo = useMemo(() => Linking.createURL("/"), []);

  const toggleInterestedIn = (option: string) => {
    setInterestedInSelections((prev) => {
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

  const goNext = async () => {
    setErrorMessage("");
    setInfoMessage("");

    if (step === "name") {
      if (!firstName.trim()) return setErrorMessage("Please enter your first name.");
      if (!lastName.trim()) return setErrorMessage("Please enter your last name.");
      setStep("dob");
      return;
    }

    if (step === "dob") {
      const parsed = parseDob(dateOfBirthInput);
      if (!parsed) return setErrorMessage("Please enter your date of birth (MM/DD/YYYY).");
      if (calculateAge(parsed) < 18) {
        return setErrorMessage("You must be at least 18 years old to sign up.");
      }
      setStep("email");
      return;
    }

    if (step === "email") {
      if (!normalizedEmail) return setErrorMessage("Please enter your email.");
      setEmail(normalizedEmail);
      setStep("password");
      return;
    }

    if (step === "password") {
      if (!password.trim() || password.length < 6) {
        return setErrorMessage("Password must be at least 6 characters.");
      }
      if (password !== confirmPassword) {
        return setErrorMessage("Passwords do not match.");
      }

      setIsSubmitting(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo },
        });
        if (error) throw error;

        if (data.session) {
          setInfoMessage("Email verification is not required. Continuing…");
          setGenderEntrySource("instant");
          setStep("gender");
          return;
        }

        setInfoMessage("Verification email sent. Please check your inbox.");
        setStep("verifyEmail");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to sign up.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (step === "gender") {
      if (!gender.trim()) {
        setErrorMessage("Please select your gender.");
        return;
      }
      setStep("sexualOrientation");
      return;
    }

    if (step === "sexualOrientation") {
      if (!sexualOrientation.trim()) {
        setErrorMessage("Please select your sexual orientation.");
        return;
      }
      setStep("interestedIn");
      return;
    }

    if (step === "interestedIn") {
      if (interestedInSelections.length === 0) {
        setErrorMessage("Please select who you’re interested in seeing.");
        return;
      }
      if (!session) {
        setErrorMessage("Please verify your email first.");
        return;
      }
      setStep("profilePicture");
      return;
    }

    if (step === "profilePicture") {
      if (!signupPhotoUris[0]) {
        setErrorMessage("Please choose a profile picture.");
        return;
      }
      setStep("profilePhotos6");
      return;
    }

    // profilePhotos6 — upload photos + save profile metadata, then go to app
    const filledCount = signupPhotoUris.filter((u) => u !== null).length;
    if (filledCount < PHOTO_SLOT_COUNT) {
      setErrorMessage("Please add a photo for all six slots.");
      return;
    }
    if (!session?.user?.id) {
      setErrorMessage("Please verify your email first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const userId = session.user.id;
      const paths: string[] = [];
      for (let i = 0; i < signupPhotoUris.length; i++) {
        const uri = signupPhotoUris[i];
        if (!uri) continue;
        paths.push(await uploadPhotoToSupabase(uri, userId, i));
      }

      const records = paths.map((path, index) => ({
        user_id: userId,
        slot_index: index + 1,
        storage_path: path,
      }));

      const { error: insertError } = await supabase.from("profile_photos").insert(records);
      if (insertError) throw new Error(insertError.message);

      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          has_completed_signup_profile: true,
          has_uploaded_photos: true,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          date_of_birth: formatDobInput(dateOfBirthInput),
          gender: gender.trim(),
          sexual_orientation: sexualOrientation.trim(),
          interested_in_seeing: interestedInSelections.join(", "),
        },
      });
      if (metaError) throw new Error(metaError.message);

      router.replace("/(tabs)/explore");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Could not finish sign up.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    setErrorMessage("");
    setStep((prev) => {
      if (prev === "dob") return "name";
      if (prev === "email") return "dob";
      if (prev === "password") return "email";
      if (prev === "verifyEmail") return "password";
      if (prev === "gender") {
        return genderEntrySource === "instant" ? "password" : "verifyEmail";
      }
      if (prev === "sexualOrientation") return "gender";
      if (prev === "interestedIn") return "sexualOrientation";
      if (prev === "profilePicture") return "interestedIn";
      if (prev === "profilePhotos6") return "profilePicture";
      return prev;
    });
  };

  const handleBackPress = () => {
    if (step === "name") {
      router.back();
      return;
    }
    goBack();
  };

  const isContinueDisabled =
    isSubmitting ||
    (step === "name" && (!firstName.trim() || !lastName.trim())) ||
    (step === "dob" && (!dobIsComplete || !parsedDob || !isAdult)) ||
    (step === "email" && !normalizedEmail) ||
    (step === "password" && (!password || !confirmPassword)) ||
    (step === "gender" && !gender.trim()) ||
    (step === "sexualOrientation" && !sexualOrientation.trim()) ||
    (step === "interestedIn" && interestedInSelections.length === 0) ||
    (step === "profilePicture" && !signupPhotoUris[0]) ||
    (step === "profilePhotos6" &&
      signupPhotoUris.filter((u) => u !== null).length < PHOTO_SLOT_COUNT);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let isCancelled = false;

    const startPolling = () => {
      if (interval) return;
      interval = setInterval(async () => {
        if (isCancelled) return;
        if (!normalizedEmail || !password) return;
        try {
          await signIn(normalizedEmail, password);
          if (isCancelled) return;
          setGenderEntrySource("verified");
          setStep("gender");
        } catch {
          // Still not verified / cannot sign in yet
        }
      }, 4000);
    };

    if (step === "verifyEmail") {
      setIsVerifying(true);
      startPolling();
    } else {
      setIsVerifying(false);
    }

    return () => {
      isCancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [normalizedEmail, password, signIn, step]);

  useEffect(() => {
    if (step !== "profilePicture" && step !== "profilePhotos6") return;
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setErrorMessage("We need photo access to add your profile pictures.");
      }
    })();
  }, [step]);

  const openPickerForSlot = async (slotIndex: number) => {
    setErrorMessage("");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.9,
    });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (!uri) return;
    setSignupPhotoUris((prev) => {
      const next = [...prev];
      next[slotIndex] = uri;
      return next;
    });
  };

  const resendVerificationEmail = async () => {
    setErrorMessage("");
    setInfoMessage("");
    if (!normalizedEmail) {
      setErrorMessage("Missing email.");
      return;
    }
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: { emailRedirectTo },
      });
      if (error) throw error;
      setInfoMessage("Verification email resent.");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Could not resend verification email.");
    }
  };

  const stepLabel =
    step === "name"
      ? "Name"
      : step === "dob"
        ? "Birth date"
        : step === "email"
          ? "Email"
          : step === "password"
            ? "Password"
            : step === "verifyEmail"
              ? "Verify email"
              : step === "gender"
                ? "Gender"
                : step === "sexualOrientation"
                  ? "Sexual orientation"
                  : step === "interestedIn"
                    ? "Interested in seeing"
                    : step === "profilePicture"
                      ? "Profile picture"
                      : "Profile photos";

  const isPhotoStep = step === "profilePicture" || step === "profilePhotos6";

  return (
    <View style={styles.screenRoot}>
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <Pressable
          onPress={handleBackPress}
          style={({ pressed }) => [styles.backPill, pressed && styles.backPillPressed]}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Previous step">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isPhotoStep ? styles.scrollContentPhoto : styles.scrollContentCentered,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>
        Join IRL and plan meaningful dates in real life.
      </Text>
      {!isConfigured ? (
        <Text style={styles.warning}>
          Add Supabase env vars in `.env` before authentication will work.
        </Text>
      ) : null}

      <View style={styles.stepHeaderRow}>
        <Text style={styles.stepText}>{stepLabel}</Text>
      </View>

      {step === "name" ? (
        <View style={styles.nameRow}>
          <TextInput
            autoCapitalize="words"
            placeholder="First name"
            placeholderTextColor={colors.mutedText}
            style={[styles.input, styles.nameInput]}
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            autoCapitalize="words"
            placeholder="Last name"
            placeholderTextColor={colors.mutedText}
            style={[styles.input, styles.nameInput]}
            value={lastName}
            onChangeText={setLastName}
          />
        </View>
      ) : null}

      {step === "dob" ? (
        <View>
          <TextInput
            placeholder="Birth date (MM/DD/YYYY)"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
            value={dateOfBirthInput}
            onChangeText={(t) => {
              const formatted = formatDobInput(t);
              setDateOfBirthInput(formatted);
            }}
            keyboardType="number-pad"
            maxLength={10}
          />
          {dobIsComplete && isUnder18 ? (
            <Text style={styles.ageError}>You must be 18 or older to continue.</Text>
          ) : null}
        </View>
      ) : null}

      {step === "email" ? (
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
      ) : null}

      {step === "password" ? (
        <View style={{ gap: 12 }}>
          <TextInput
            secureTextEntry
            placeholder="Password"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            secureTextEntry
            placeholder="Confirm password"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>
      ) : null}

      {step === "verifyEmail" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.verifyTitle}>Check your email</Text>
          <Text style={styles.verifyBody}>
            We sent a verification link to{" "}
            <Text style={styles.verifyEmail}>{normalizedEmail}</Text>. Once you
            verify your email, we’ll automatically continue.
          </Text>
          {infoMessage ? <Text style={styles.info}>{infoMessage}</Text> : null}
          {isVerifying ? (
            <View style={styles.verifySpinnerRow}>
              <ActivityIndicator color={colors.text} />
              <Text style={styles.verifyWaitingText}>Waiting for verification…</Text>
            </View>
          ) : null}
          <Pressable onPress={resendVerificationEmail} style={styles.resendButton}>
            <Text style={styles.resendButtonText}>Resend email</Text>
          </Pressable>
        </View>
      ) : null}

      {step === "gender" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={[styles.chip, gender === option && styles.chipSelected]}
                onPress={() => setGender(option)}
              >
                <Text
                  style={[
                    styles.chipText,
                    gender === option && styles.chipTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {step === "sexualOrientation" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.label}>Sexual orientation</Text>
          <View style={styles.chipRow}>
            {ORIENTATION_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.chip,
                  sexualOrientation === option && styles.chipSelected,
                ]}
                onPress={() => setSexualOrientation(option)}
              >
                <Text
                  style={[
                    styles.chipText,
                    sexualOrientation === option && styles.chipTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {step === "interestedIn" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.label}>Who you’re interested in seeing</Text>
          <Text style={styles.hint}>
            Select one or more. “Everyone” clears other choices.
          </Text>
          <View style={styles.chipRow}>
            {INTERESTED_IN_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.chip,
                  interestedInSelections.includes(option) && styles.chipSelected,
                ]}
                onPress={() => toggleInterestedIn(option)}
              >
                <Text
                  style={[
                    styles.chipText,
                    interestedInSelections.includes(option) && styles.chipTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {step === "profilePicture" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.label}>Choose your profile picture</Text>
          <Text style={styles.hint}>
            This is the main photo people see first. You can change it later.
          </Text>
          <Pressable
            style={[styles.profilePictureCard, !!signupPhotoUris[0] && styles.photoSlotSelected]}
            onPress={() => openPickerForSlot(0)}
          >
            {signupPhotoUris[0] ? (
              <Image source={{ uri: signupPhotoUris[0] }} style={styles.profilePictureImage} />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Text style={styles.photoPlaceholderIcon}>＋</Text>
                <Text style={styles.profilePicturePlaceholderText}>Tap to choose a photo</Text>
              </View>
            )}
          </Pressable>
        </View>
      ) : null}

      {step === "profilePhotos6" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.label}>Add six photos for your profile</Text>
          <Text style={styles.hint}>
            Your profile picture is already selected above. Choose the remaining photos to fill
            all six slots.
          </Text>
          <View style={styles.photoGrid}>
            {PHOTO_SLOTS.map((slot, index) => {
              const uri = signupPhotoUris[index];
              const isSelected = !!uri;
              const isProfileSlot = index === 0;
              return (
                <Pressable
                  key={slot}
                  style={[
                    styles.photoSlot,
                    isSelected && styles.photoSlotSelected,
                    isProfileSlot && styles.photoSlotLocked,
                  ]}
                  disabled={isProfileSlot}
                  onPress={isProfileSlot ? undefined : () => openPickerForSlot(index)}
                >
                  {uri ? (
                    <Image source={{ uri }} style={styles.photoSlotImage} />
                  ) : (
                    <View style={styles.photoSlotPlaceholder}>
                      <Text style={styles.photoPlaceholderIcon}>＋</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {step !== "verifyEmail" && infoMessage ? (
        <Text style={styles.info}>{infoMessage}</Text>
      ) : null}
      {step !== "verifyEmail" ? (
        <Pressable
          style={[styles.button, isContinueDisabled && styles.buttonDisabled]}
          onPress={goNext}
          disabled={isContinueDisabled}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.buttonText}>
              {step === "profilePhotos6" ? "Finish" : "Continue"}
            </Text>
          )}
        </Pressable>
      ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 16,
  },
  scrollContentCentered: {
    flexGrow: 1,
    justifyContent: "center",
  },
  scrollContentPhoto: {
    flexGrow: 1,
    justifyContent: "flex-start",
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 16,
  },
  backPill: {
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
  backPillPressed: {
    opacity: 0.72,
    backgroundColor: "rgba(0, 0, 0, 0.09)",
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
  warning: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    padding: 10,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  nameInput: {
    flex: 1,
    minWidth: 0,
  },
  stepHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepText: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 14,
  },
  label: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  hint: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    marginTop: -4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.text,
    backgroundColor: colors.background,
  },
  chipText: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 15,
  },
  chipTextSelected: {
    color: colors.text,
    fontWeight: "600",
  },
  input: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    minHeight: 56,
    justifyContent: "center",
    marginTop: 8,
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
  info: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    marginTop: -8,
  },
  ageError: {
    color: "#FF3B30",
    fontFamily: typography.fontFamily,
    fontSize: 14,
    marginTop: 8,
  },
  verifyTitle: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
  verifyBody: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    lineHeight: 20,
  },
  verifyEmail: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontWeight: "600",
  },
  verifySpinnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  verifyWaitingText: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 14,
  },
  resendButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  resendButtonText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  profilePictureCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
    aspectRatio: 3 / 4,
    maxHeight: 420,
    alignSelf: "center",
    width: "100%",
  },
  profilePictureImage: {
    width: "100%",
    height: "100%",
  },
  profilePicturePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  profilePicturePlaceholderText: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    textAlign: "center",
  },
  photoPlaceholderIcon: {
    color: colors.mutedText,
    fontSize: 32,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
    marginTop: 4,
  },
  photoSlot: {
    width: "48%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF0F5",
    padding: 0,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  photoSlotSelected: {
    borderColor: colors.text,
  },
  photoSlotImage: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },
  photoSlotPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F5",
  },
  photoSlotLocked: {
    opacity: 0.95,
  },
});
