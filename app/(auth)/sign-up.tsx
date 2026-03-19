import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Linking from "expo-linking";

import { useAuth } from "@/src/providers/AuthProvider";
import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";

type Step = "name" | "email" | "verifyEmail" | "dob" | "gender" | "password";

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

export default function SignUpScreen() {
  const { signIn, isConfigured, session } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState<string>("");
  const [dateOfBirthInput, setDateOfBirthInput] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const GENDER_OPTIONS = [
    "Man",
    "Woman",
    "Non-binary",
    "Prefer to self-describe",
  ];

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

  const isUnder18 = dateOfBirth !== null && calculateAge(dateOfBirth) < 18;

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const emailRedirectTo = useMemo(() => Linking.createURL("/"), []);

  const generateTemporaryPassword = () => {
    // Supabase requires a password on sign-up, but we collect the user's chosen
    // password later. This temp password is only used until the user sets theirs.
    const rand = Math.random().toString(36).slice(2);
    return `tmp_${Date.now()}_${rand}_A1!`;
  };

  const goNext = async () => {
    setErrorMessage("");
    setInfoMessage("");

    if (step === "name") {
      if (!firstName.trim()) return setErrorMessage("Please enter your first name.");
      if (!lastName.trim()) return setErrorMessage("Please enter your last name.");
      setStep("email");
      return;
    }

    if (step === "email") {
      if (!normalizedEmail) return setErrorMessage("Please enter your email.");
      setEmail(normalizedEmail);
      // Create the auth user now so Supabase can send the verification email.
      const tmp = generateTemporaryPassword();
      setTemporaryPassword(tmp);
      setIsSubmitting(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: tmp,
          options: { emailRedirectTo },
        });
        if (error) throw error;

        // If email confirmations are disabled in Supabase, a session will be returned immediately.
        if (data.session) {
          setInfoMessage("Email verification is not required. Continuing…");
          setStep("dob");
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

    if (step === "dob") {
      const parsed = parseDob(dateOfBirthInput);
      if (!parsed) return setErrorMessage("Please enter your date of birth (MM/DD/YYYY).");
      const age = calculateAge(parsed);
      if (age < 18) return setErrorMessage("You must be at least 18 years old to sign up.");
      setDateOfBirth(parsed);
      setStep("gender");
      return;
    }

    if (step === "gender") {
      if (!gender.trim()) {
        setErrorMessage("Please select your gender.");
        return;
      }
      setStep("password");
      return;
    }

    // password (finalize account details)
    if (!password.trim() || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

      if (!session) {
        setErrorMessage("Please verify your email first.");
        return;
      }

      setIsSubmitting(true);
      try {
        const { error: passwordError } = await supabase.auth.updateUser({
          password,
        });
        if (passwordError) throw passwordError;

        const { error } = await supabase.auth.updateUser({
          data: {
            has_completed_signup_profile: true,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            date_of_birth: formatDobInput(dateOfBirthInput),
            gender: gender.trim(),
          },
        });
        if (error) throw error;
        router.replace("/photos");
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "Could not save profile details.");
      } finally {
        setIsSubmitting(false);
      }
      return;
  };

  const goBack = () => {
    setErrorMessage("");
    setStep((prev) => {
      if (prev === "email") return "name";
      if (prev === "verifyEmail") return "email";
      if (prev === "dob") return "verifyEmail";
      if (prev === "gender") return "dob";
      if (prev === "password") return "gender";
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
    (step === "email" && !normalizedEmail) ||
    (step === "dob" && dateOfBirthInput.trim().length < 10) ||
    (step === "gender" && !gender.trim()) ||
    (step === "password" && (!password || !confirmPassword));

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let isCancelled = false;

    const startPolling = () => {
      if (interval) return;
      interval = setInterval(async () => {
        if (isCancelled) return;
        if (!normalizedEmail || !temporaryPassword) return;
        try {
          await signIn(normalizedEmail, temporaryPassword);
          if (isCancelled) return;
          setStep("dob");
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
  }, [normalizedEmail, signIn, step, temporaryPassword]);

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

  return (
    <View style={styles.container}>
      <Pressable onPress={handleBackPress} style={styles.backCircleFloating}>
        <Text style={styles.backCircleIcon}>←</Text>
      </Pressable>
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
        <Text style={styles.stepText}>
          {step === "name"
            ? "Name"
            : step === "email"
              ? "Email"
              : step === "verifyEmail"
                ? "Verify email"
                : step === "dob"
                  ? "Birth date"
                  : step === "gender"
                    ? "Gender"
                    : "Password"}
        </Text>
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
              setDateOfBirth(parseDob(formatted));
            }}
            keyboardType="number-pad"
            maxLength={10}
          />
          {isUnder18 ? (
            <Text style={styles.ageError}>
              You must be 18 or older to sign up.
            </Text>
          ) : null}
        </View>
      ) : null}

      {step === "gender" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.genderChip,
                  gender === option && styles.genderChipSelected,
                ]}
                onPress={() => setGender(option)}
              >
                <Text
                  style={[
                    styles.genderChipText,
                    gender === option && styles.genderChipTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
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
              {step === "password" ? "Continue" : "Continue"}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 16,
  },
  backCircleFloating: {
    position: "absolute",
    top: 18,
    left: 16,
    height: 34,
    width: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
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
  backCircleIcon: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 18,
    fontWeight: "600",
    marginTop: -1,
  },
  label: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  genderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genderChip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  genderChipSelected: {
    borderColor: colors.text,
    backgroundColor: colors.background,
  },
  genderChipText: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 15,
  },
  genderChipTextSelected: {
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
    marginTop: -8,
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
});
