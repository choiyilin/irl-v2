import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";

const PRONOUN_OPTIONS = [
  "He/him",
  "She/her",
  "They/them",
  "Prefer to self-describe",
];

const INTERESTED_IN_OPTIONS = ["Men", "Women", "Everyone"];

const ORIENTATION_OPTIONS = [
  "Straight",
  "Gay",
  "Bisexual",
  "Prefer not to say",
];

function OptionChips<T extends string>({
  options,
  value,
  onSelect,
  style,
}: {
  options: readonly T[];
  value: string;
  onSelect: (v: T) => void;
  style?: object;
}) {
  return (
    <View style={[styles.chipRow, style]}>
      {options.map((option) => (
        <Pressable
          key={option}
          style={[styles.chip, value === option && styles.chipSelected]}
          onPress={() => onSelect(option)}
        >
          <Text
            style={[
              styles.chipText,
              value === option && styles.chipTextSelected,
            ]}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function PreferencesScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const isPreview = preview === "true";
  const [pronouns, setPronouns] = useState("");
  const [interestedIn, setInterestedIn] = useState("");
  const [orientation, setOrientation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!session && !isPreview) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const canSubmit =
    pronouns.trim() !== "" &&
    interestedIn.trim() !== "" &&
    orientation.trim() !== "";

  const handleContinue = async () => {
    setErrorMessage("");
    if (!canSubmit) {
      setErrorMessage("Please answer all preferences.");
      return;
    }
    if (isPreview && !session) {
      return; // Preview only – no save
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          has_completed_preferences: true,
          pronouns: pronouns.trim(),
          interested_in: interestedIn.trim(),
          orientation: orientation.trim(),
        },
      });
      if (error) throw error;
      router.replace("/(tabs)/explore");
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : "Could not save preferences.",
      );
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
      {isPreview ? <Text style={styles.previewBadge}>Preview</Text> : null}
      <Text style={styles.title}>Preferences</Text>
      <Text style={styles.subtitle}>
        A few quick questions so we can personalize your experience.
      </Text>

      <Text style={styles.label}>Pronouns</Text>
      <OptionChips
        options={PRONOUN_OPTIONS}
        value={pronouns}
        onSelect={setPronouns}
      />

      <Text style={styles.label}>Interested in</Text>
      <OptionChips
        options={INTERESTED_IN_OPTIONS}
        value={interestedIn}
        onSelect={setInterestedIn}
      />

      <Text style={styles.label}>Orientation</Text>
      <OptionChips
        options={ORIENTATION_OPTIONS}
        value={orientation}
        onSelect={setOrientation}
      />

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <Pressable
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={isSubmitting || !canSubmit}
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
  previewBadge: {
    alignSelf: "flex-start",
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
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
  label: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
    marginTop: 8,
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
