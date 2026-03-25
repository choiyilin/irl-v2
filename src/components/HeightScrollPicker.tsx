import { Picker } from "@react-native-picker/picker";
import { Platform, StyleSheet, View } from "react-native";

import {
  DEFAULT_HEIGHT_FT_IN,
  HEIGHT_OPTIONS_FT_IN,
} from "@/src/lib/heightOptions";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";

type Props = {
  value: string;
  onValueChange: (value: string) => void;
};

export function HeightScrollPicker({ value, onValueChange }: Props) {
  const selected = HEIGHT_OPTIONS_FT_IN.includes(value) ? value : DEFAULT_HEIGHT_FT_IN;

  return (
    <View style={styles.wrap}>
      <Picker
        selectedValue={selected}
        onValueChange={onValueChange}
        {...(Platform.OS === "android" ? { mode: "dropdown" as const } : {})}
        style={styles.picker}
        itemStyle={Platform.OS === "ios" ? styles.itemIOS : undefined}
      >
        {HEIGHT_OPTIONS_FT_IN.map((opt) => (
          <Picker.Item key={opt} label={opt} value={opt} color={colors.text} />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    ...(Platform.OS === "ios" ? { height: 180 } : {}),
  },
  itemIOS: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 18,
  },
});
