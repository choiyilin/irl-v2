import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
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

import { HeightScrollPicker } from "@/src/components/HeightScrollPicker";
import { coerceHeightFtIn, DEFAULT_HEIGHT_FT_IN } from "@/src/lib/heightOptions";
import { getImageUploadPayload } from "@/src/lib/getImageUploadPayload";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
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
  | "profilePicture" // legacy alias; render unified grid
  | "profilePhotos6"
  | "occupation"
  | "education"
  | "city"
  | "hometown"
  | "height";

const PHOTO_SLOT_COUNT = 6;
const PHOTO_SLOTS = [1, 2, 3, 4, 5, 6] as const;
const STORAGE_BUCKET = "profile-photos";

async function uploadPhotoToSupabase(uri: string, userId: string, slotIndex: number) {
  const { body, contentType } = await getImageUploadPayload(uri);
  const fileExt = "jpg";
  const path = `${userId}/slot-${slotIndex + 1}-${Date.now()}.${fileExt}`;
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, body, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return data.path;
}

async function persistPhotoSlot(userId: string, slotIndex: number, storagePath: string) {
  const { error } = await supabase
    .from("profile_photos")
    .upsert(
      {
        user_id: userId,
        slot_index: slotIndex,
        storage_path: storagePath,
      },
      { onConflict: "user_id,slot_index" },
    );
  if (error) throw new Error(error.message);
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
  "Bisexual",
] as const;

const INTERESTED_IN_OPTIONS = [
  "Women",
  "Men",
  "Non-binary people",
  "Everyone",
] as const;

export default function SignUpScreen() {
  const { signIn, signOut, isConfigured, session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("email");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirthInput, setDateOfBirthInput] = useState("");
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
  const [occupation, setOccupation] = useState("");
  const [education, setEducation] = useState("");
  const [city, setCity] = useState("");
  const [hometown, setHometown] = useState("");
  const [height, setHeight] = useState<string>(DEFAULT_HEIGHT_FT_IN);
  const [isResuming, setIsResuming] = useState(false);
  const [hasHydratedResume, setHasHydratedResume] = useState(false);
  const [isPhotoSaving, setIsPhotoSaving] = useState(false);

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

    if (step === "email") {
      if (!normalizedEmail) return setErrorMessage("Please enter your email.");
      setEmail(normalizedEmail);
      setStep("password");
      return;
    }

    if (step === "password") {
      // If we already have an active session (e.g. user navigated back),
      // skip re-signing up and continue the onboarding wizard.
      if (session) {
        setStep("name");
        return;
      }

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
          setStep("name");
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

    if (!session) {
      setErrorMessage("Please sign in again to continue your signup.");
      return;
    }

    if (step === "name") {
      if (!firstName.trim()) return setErrorMessage("Please enter your first name.");
      if (!lastName.trim()) return setErrorMessage("Please enter your last name.");

      setIsSubmitting(true);
      try {
        const { error: metaError } = await supabase.auth.updateUser({
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        });
        if (metaError) throw new Error(metaError.message);

        setStep("dob");
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "Unable to save your name.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (step === "dob") {
      const parsed = parseDob(dateOfBirthInput);
      if (!parsed) return setErrorMessage("Please enter your date of birth (MM/DD/YYYY).");
      if (calculateAge(parsed) < 18) {
        return setErrorMessage("You must be at least 18 years old to sign up.");
      }

      setIsSubmitting(true);
      try {
        const { error: metaError } = await supabase.auth.updateUser({
          data: {
            date_of_birth: formatDobInput(dateOfBirthInput),
          },
        });
        if (metaError) throw new Error(metaError.message);

        setStep("gender");
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "Unable to save your birth date.");
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
      setIsSubmitting(true);
      try {
        const { error: metaError } = await supabase.auth.updateUser({
          data: {
            gender: gender.trim(),
          },
        });
        if (metaError) throw new Error(metaError.message);

        setStep("sexualOrientation");
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "Unable to save your gender.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (step === "sexualOrientation") {
      if (!sexualOrientation.trim()) {
        setErrorMessage("Please select your sexual orientation.");
        return;
      }
      setIsSubmitting(true);
      try {
        const { error: metaError } = await supabase.auth.updateUser({
          data: {
            sexual_orientation: sexualOrientation.trim(),
          },
        });
        if (metaError) throw new Error(metaError.message);

        setStep("interestedIn");
      } catch (e) {
        setErrorMessage(
          e instanceof Error ? e.message : "Unable to save your sexual orientation.",
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (step === "interestedIn") {
      if (interestedInSelections.length === 0) {
        setErrorMessage("Please select who you’re interested in seeing.");
        return;
      }

      setIsSubmitting(true);
      try {
        const { error: metaError } = await supabase.auth.updateUser({
          data: {
            interested_in_seeing: interestedInSelections.join(", "),
            signup_step: "profilePhotos6",
          },
        });
        if (metaError) throw new Error(metaError.message);

        setStep("profilePhotos6");
      } catch (e) {
        setErrorMessage(
          e instanceof Error ? e.message : "Unable to save your preferences.",
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (step === "profilePicture" || step === "profilePhotos6") {
      const filledCount = signupPhotoUris.filter((u) => u !== null).length;
      if (filledCount < PHOTO_SLOT_COUNT) {
        setErrorMessage("Please add a photo for all six slots.");
        return;
      }

      setIsSubmitting(true);
      try {
        const { error: metaError } = await supabase.auth.updateUser({
          data: {
            has_uploaded_photos: true,
            signup_step: "occupation",
          },
        });
        if (metaError) throw new Error(metaError.message);
        setStep("occupation");
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "Could not continue.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (step === "occupation") {
      if (!occupation.trim()) return setErrorMessage("Please enter your occupation.");
      setStep("education");
      return;
    }

    if (step === "education") {
      if (!education.trim()) return setErrorMessage("Please enter your education.");
      setStep("city");
      return;
    }

    if (step === "city") {
      if (!city.trim()) return setErrorMessage("Please enter your city.");
      setStep("hometown");
      return;
    }

    if (step === "hometown") {
      if (!hometown.trim()) return setErrorMessage("Please enter your hometown.");
      setStep("height");
      return;
    }

    if (!height.trim()) return setErrorMessage("Please select your height.");
    if (!session.user?.id) return setErrorMessage("Please sign in again to continue your signup.");

    const parsed = parseDob(dateOfBirthInput);
    if (!parsed) return setErrorMessage("Please re-enter your date of birth.");
    const age = calculateAge(parsed);

    setIsSubmitting(true);
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: session.user.id,
          display_name: displayName.length > 0 ? displayName : null,
          age,
          city: city.trim(),
          gender: gender.trim(),
          sexual_orientation: sexualOrientation.trim(),
          interested_in_seeing: interestedInSelections.join(", "),
          occupation: occupation.trim(),
          education: education.trim(),
          hometown: hometown.trim(),
          height: height.trim(),
          show_occupation: true,
          show_education: true,
          show_city: true,
          show_hometown: true,
          show_height: true,
        },
        { onConflict: "id" },
      );
      if (profileError) throw new Error(profileError.message);

      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          has_completed_signup_profile: true,
          has_uploaded_photos: true,
          signup_step: "complete",
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

  /** Sign out if needed so auth layout allows sign-in (switch away from this account). */
  const exitToSignIn = useCallback(async () => {
    setErrorMessage("");
    setInfoMessage("");
    if (session) {
      await signOut().catch(() => undefined);
    }
    router.replace("/(auth)/sign-in");
  }, [router, session, signOut]);

  const goBack = useCallback(() => {
    setErrorMessage("");
    setStep((prev) => {
      if (prev === "dob") return "name";
      if (prev === "name") return "password";
      if (prev === "password") return "email";
      if (prev === "verifyEmail") return "password";
      if (prev === "gender") return "dob";
      if (prev === "sexualOrientation") return "gender";
      if (prev === "interestedIn") return "sexualOrientation";
      if (prev === "profilePhotos6") return "interestedIn";
      if (prev === "occupation") return "profilePhotos6";
      if (prev === "education") return "occupation";
      if (prev === "city") return "education";
      if (prev === "hometown") return "city";
      if (prev === "height") return "hometown";
      return prev;
    });
  }, []);

  const handleBackPress = () => {
    if (step === "email") {
      void exitToSignIn();
      return;
    }
    goBack();
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === "email") {
        void exitToSignIn();
        return true;
      }
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [exitToSignIn, goBack, step]);

  const isContinueDisabled =
    isSubmitting ||
    isPhotoSaving ||
    (step === "name" && (!firstName.trim() || !lastName.trim())) ||
    (step === "dob" && (!dobIsComplete || !parsedDob || !isAdult)) ||
    (step === "email" && !normalizedEmail) ||
    (step === "password" && (!password || !confirmPassword)) ||
    (step === "gender" && !gender.trim()) ||
    (step === "sexualOrientation" && !sexualOrientation.trim()) ||
    (step === "interestedIn" && interestedInSelections.length === 0) ||
    ((step === "profilePicture" || step === "profilePhotos6") &&
      signupPhotoUris.filter((u) => u !== null).length < PHOTO_SLOT_COUNT) ||
    (step === "occupation" && !occupation.trim()) ||
    (step === "education" && !education.trim()) ||
    (step === "city" && !city.trim()) ||
    (step === "hometown" && !hometown.trim()) ||
    (step === "height" && !height.trim());

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
          setStep("name");
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
    if (!session?.user?.id) return;
    if (hasHydratedResume) return;

    let cancelled = false;

    const run = async () => {
      setIsResuming(true);
      try {
        const userId = session.user.id;
        const metadata = session.user.user_metadata ?? {};

        const first = typeof metadata.first_name === "string" ? metadata.first_name : "";
        const last = typeof metadata.last_name === "string" ? metadata.last_name : "";
        const dob = typeof metadata.date_of_birth === "string" ? metadata.date_of_birth : "";
        const g = typeof metadata.gender === "string" ? metadata.gender : "";
        const so = typeof metadata.sexual_orientation === "string" ? metadata.sexual_orientation : "";
        const interestedRaw =
          typeof metadata.interested_in_seeing === "string" ? metadata.interested_in_seeing : "";

        setFirstName(first);
        setLastName(last);
        setDateOfBirthInput(dob);
        setGender(g);
        const soAllowed = ORIENTATION_OPTIONS.some((o) => o === so);
        setSexualOrientation(soAllowed ? so : "");

        const interestedParsed = interestedRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        if (interestedParsed.includes("Everyone")) {
          setInterestedInSelections(["Everyone"]);
        } else {
          setInterestedInSelections(interestedParsed);
        }

        const { data: photoRows } = await supabase
          .from("profile_photos")
          .select("slot_index, storage_path")
          .eq("user_id", userId)
          .order("slot_index", { ascending: true });
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("occupation, education, city, hometown, height")
          .eq("id", userId)
          .maybeSingle();

        const rows = photoRows ?? [];
        const nextUris: (string | null)[] = Array.from(
          { length: PHOTO_SLOT_COUNT },
          () => null,
        );

        const storagePaths = rows
          .map((r) => r.storage_path)
          .filter((p): p is string => typeof p === "string");

        if (storagePaths.length > 0) {
          const { data: signedList, error: signedErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrls(storagePaths, 60 * 60);

          if (!signedErr && signedList) {
            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              const signed = signedList[i];
              if (!signed?.signedUrl || signed.error) continue;
              nextUris[row.slot_index - 1] = signed.signedUrl;
            }
          }
        }

        if (cancelled) return;

        setSignupPhotoUris(nextUris);
        const photoCount = rows.filter((r) => typeof r.storage_path === "string").length;
        setOccupation((profileRow?.occupation as string | null) ?? "");
        setEducation((profileRow?.education as string | null) ?? "");
        setCity((profileRow?.city as string | null) ?? "");
        setHometown((profileRow?.hometown as string | null) ?? "");
        setHeight(coerceHeightFtIn((profileRow?.height as string | null) ?? ""));

        if (!first || !last) {
          setStep("name");
        } else if (!dob) {
          setStep("dob");
        } else if (!g) {
          setStep("gender");
        } else if (!so) {
          setStep("sexualOrientation");
        } else if (interestedParsed.length === 0) {
          setStep("interestedIn");
        } else if (photoCount < PHOTO_SLOT_COUNT) {
          setStep("profilePhotos6");
        } else if (!profileRow?.occupation) {
          setStep("occupation");
        } else if (!profileRow?.education) {
          setStep("education");
        } else if (!profileRow?.city) {
          setStep("city");
        } else if (!profileRow?.hometown) {
          setStep("hometown");
        } else if (!profileRow?.height) {
          setStep("height");
        } else {
          setStep("profilePhotos6");
        }
      } catch {
        // If resume hydration fails, keep whatever step the UI is currently on.
      } finally {
        if (!cancelled) {
          setIsResuming(false);
          setHasHydratedResume(true);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, hasHydratedResume]);

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
    if (isPhotoSaving) return;
    setErrorMessage("");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.9,
    });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    if (!session?.user?.id) {
      setErrorMessage("Please sign in again to save your photos.");
      return;
    }

    setSignupPhotoUris((prev) => {
      const next = [...prev];
      next[slotIndex] = uri;
      return next;
    });

    setIsPhotoSaving(true);
    try {
      const userId = session.user.id;
      const storagePath = await uploadPhotoToSupabase(uri, userId, slotIndex);
      await persistPhotoSlot(userId, slotIndex + 1, storagePath);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Could not save this photo.");
      setSignupPhotoUris((prev) => {
        const next = [...prev];
        next[slotIndex] = null;
        return next;
      });
    } finally {
      setIsPhotoSaving(false);
    }
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

  const isPhotoStep = step === "profilePicture" || step === "profilePhotos6";

  if (isResuming) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <Pressable
          onPress={handleBackPress}
          style={({ pressed }) => [styles.backPill, pressed && styles.backPillPressed]}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={step === "email" ? "Back to sign in" : "Previous step"}>
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

      {step === "name" ? (
        <View style={{ gap: 12 }}>
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
          <Pressable onPress={() => void exitToSignIn()} style={styles.switchAccountButton}>
            <Text style={styles.switchAccountText}>Wrong account? Sign in with a different one</Text>
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

      {step === "profilePicture" || step === "profilePhotos6" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.label}>Upload six photos</Text>
          <Text style={styles.hint}>
            Add all six photos here. The top-left photo is your profile picture.
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
                    isProfileSlot && styles.photoSlotPrimary,
                  ]}
                  disabled={isPhotoSaving}
                  onPress={() => openPickerForSlot(index)}
                >
                  {isProfileSlot ? (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Profile</Text>
                    </View>
                  ) : null}
                  {uri ? (
                    <Image source={{ uri }} style={styles.photoSlotImage} resizeMode="cover" />
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

      {step === "occupation" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.label}>Occupation</Text>
          <TextInput
            placeholder="What do you do?"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
            value={occupation}
            onChangeText={setOccupation}
          />
        </View>
      ) : null}

      {step === "education" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.label}>Education</Text>
          <TextInput
            placeholder="School or highest education"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
            value={education}
            onChangeText={setEducation}
          />
        </View>
      ) : null}

      {step === "city" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.label}>City you live in</Text>
          <TextInput
            placeholder="City"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
            value={city}
            onChangeText={setCity}
          />
        </View>
      ) : null}

      {step === "hometown" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.label}>Hometown</Text>
          <TextInput
            placeholder="Where you grew up"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
            value={hometown}
            onChangeText={setHometown}
          />
        </View>
      ) : null}

      {step === "height" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.label}>Height</Text>
          <HeightScrollPicker value={height} onValueChange={setHeight} />
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
              {step === "height" ? "Finish" : "Continue"}
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
  switchAccountButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginTop: 4,
  },
  switchAccountText: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  accountHint: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  signInLink: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    textAlign: "center",
    textDecorationLine: "underline",
    marginTop: 4,
  },
  photoPlaceholderIcon: {
    color: colors.mutedText,
    fontSize: 32,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginTop: 4,
  },
  photoSlot: {
    width: "31.5%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF0F5",
    padding: 0,
    overflow: "hidden",
  },
  photoSlotSelected: {
    borderColor: colors.text,
  },
  photoSlotImage: {
    ...StyleSheet.absoluteFillObject,
  },
  photoSlotPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F5",
  },
  photoSlotPrimary: {
    borderColor: colors.text,
  },
  primaryBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    zIndex: 2,
    backgroundColor: colors.text,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  primaryBadgeText: {
    color: colors.background,
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: "700",
  },
});
