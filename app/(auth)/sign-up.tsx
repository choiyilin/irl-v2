import DateTimePicker from "@react-native-community/datetimepicker";
import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/src/providers/AuthProvider";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";

export default function SignUpScreen() {
  const { signUp, isConfigured } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirthInput, setDateOfBirthInput] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const GENDER_OPTIONS = [
    "Man",
    "Woman",
    "Non-binary",
    "Prefer to self-describe",
  ];

  const formatDate = (date: Date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const parseDateInput = (text: string): Date | null => {
    const cleaned = text.trim().replace(/-/g, "/");
    const parts = cleaned.split("/");
    if (parts.length !== 3) return null;
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
    if (
      month < 0 ||
      month > 11 ||
      day < 1 ||
      day > 31 ||
      year < 1950 ||
      year > new Date().getFullYear()
    )
      return null;
    const date = new Date(year, month, day);
    if (
      date.getMonth() !== month ||
      date.getDate() !== day ||
      date.getFullYear() !== year
    )
      return null;
    return date;
  };

  const handleDateInputChange = (text: string) => {
    setDateOfBirthInput(text);
    const parsed = parseDateInput(text);
    setDateOfBirth(parsed);
  };

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

  const handleSignUp = async () => {
    setErrorMessage("");

    if (!firstName.trim()) {
      setErrorMessage("Please enter your first name.");
      return;
    }
    if (!lastName.trim()) {
      setErrorMessage("Please enter your last name.");
      return;
    }
    if (!dateOfBirth) {
      setErrorMessage("Please enter your date of birth (MM/DD/YYYY).");
      return;
    }
    const age = calculateAge(dateOfBirth);
    if (age < 18) {
      setErrorMessage("You must be at least 18 years old to sign up.");
      return;
    }
    if (!email.trim()) {
      setErrorMessage("Please enter your email.");
      return;
    }
    if (!password.trim() || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (!gender.trim()) {
      setErrorMessage("Please select your gender.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(email.trim(), password);
      setErrorMessage("Check your email to confirm your account.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign up.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>
        Join IRL and plan meaningful dates in real life.
      </Text>
      {!isConfigured ? (
        <Text style={styles.warning}>
          Add Supabase env vars in `.env` before authentication will work.
        </Text>
      ) : null}

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

      <View style={styles.dateRow}>
        <TextInput
          placeholder="Date of birth (MM/DD/YYYY)"
          placeholderTextColor={colors.mutedText}
          style={[styles.input, styles.dateInput]}
          value={dateOfBirthInput}
          onChangeText={handleDateInputChange}
          keyboardType="numbers-and-punctuation"
        />
        <Pressable
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.datePickerButtonText}>📅</Text>
        </Pressable>
      </View>
      {isUnder18 ? (
        <Text style={styles.ageError}>You must be 18 or older to sign up.</Text>
      ) : null}

      {showDatePicker && (
        <DateTimePicker
          value={dateOfBirth ?? new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          minimumDate={new Date(1950, 0, 1)}
          onChange={(event: any, selectedDate?: Date) => {
            setShowDatePicker(Platform.OS === "ios");
            if (selectedDate) {
              setDateOfBirth(selectedDate);
              setDateOfBirthInput(formatDate(selectedDate));
            }
          }}
        />
      )}

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

      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor={colors.mutedText}
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />
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
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <Pressable
        style={[
          styles.button,
          (isUnder18 ||
            !firstName ||
            !lastName ||
            !dateOfBirth ||
            !gender ||
            !email ||
            !password ||
            !confirmPassword) &&
            styles.buttonDisabled,
        ]}
        onPress={handleSignUp}
        disabled={
          isSubmitting ||
          isUnder18 ||
          !firstName ||
          !lastName ||
          !dateOfBirth ||
          !gender ||
          !email ||
          !password ||
          !confirmPassword
        }
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
      </Pressable>
      <Link href="/(auth)/sign-in" style={styles.link}>
        Already have an account? Sign in
      </Link>
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
  dateRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  dateInput: {
    flex: 1,
    minWidth: 0,
  },
  datePickerButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 56,
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerButtonText: {
    fontSize: 22,
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
  link: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    textAlign: "center",
    textDecorationLine: "underline",
    marginTop: 8,
    fontSize: 15,
  },
  error: {
    color: "#FF3B30",
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
});
