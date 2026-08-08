import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  /** When linked, label reads as actionable. */
  linked?: boolean;
  numberOfLines?: number;
};

/**
 * Compact meta row. Pass onPress for maps, phone, or other external actions.
 */
export function MetaLink({
  icon,
  label,
  onPress,
  linked = Boolean(onPress),
  numberOfLines = 2,
}: Props) {
  const { colors } = useTheme();
  const row = (
    <View style={styles.row}>
      <Ionicons name={icon} size={14} color={colors.inkMuted} />
      <AppText
        variant="caption"
        tone={linked ? "primary" : "secondary"}
        numberOfLines={numberOfLines}
        style={[styles.label, linked ? styles.link : null]}
      >
        {label}
      </AppText>
      {linked ? (
        <Ionicons name="open-outline" size={12} color={colors.inkFaint} />
      ) : null}
    </View>
  );

  if (!onPress) return row;

  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={label}>
      {row}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space[2],
    minWidth: 0,
  },
  label: {
    flex: 1,
    minWidth: 0,
  },
  link: {
    textDecorationLine: "underline",
  },
});
