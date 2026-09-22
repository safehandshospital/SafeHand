import { type ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { PressableScale } from "@/components/PressableScale";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";
import { ON_ACCENT } from "@/theme/selectionChip";
import { pressScale as defaultPressScale, radius, space } from "@/theme/tokens";
import { fonts } from "@/theme/fonts";

type Variant = "primary" | "secondary" | "ghost" | "accent";

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  leftSlot?: ReactNode;
  pressScale?: number;
};

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = "primary",
  fullWidth = false,
  style,
  leftSlot,
  pressScale = defaultPressScale,
}: Props) {
  const { colors } = useTheme();
  const isPrimary = variant === "primary";
  const isAccent = variant === "accent";
  const isGhost = variant === "ghost";
  const isBooking = /^book appointment$/i.test(label.trim());
  const busy = disabled || loading;
  const labelTone = isPrimary ? "inverse" : "primary";
  const labelColor = isAccent || isBooking ? ON_ACCENT : undefined;
  const spinnerColor = isPrimary || isAccent || isBooking ? ON_ACCENT : colors.ink;

  const background = isBooking
    ? { backgroundColor: "#16A34A" }
    : isAccent
    ? { backgroundColor: colors.accent }
    : isPrimary
      ? { backgroundColor: colors.ink }
      : isGhost
        ? { backgroundColor: "transparent" }
        : {
            backgroundColor: colors.surfaceRaised,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
          };

  return (
    <PressableScale
      onPress={onPress}
      disabled={busy}
      scale={pressScale}
      style={[fullWidth ? styles.stretch : null, style]}
    >
      <View
        style={[
          styles.base,
          background,
          busy ? styles.dim : null,
          fullWidth ? styles.stretch : null,
        ]}
      >
        <View style={[styles.row, loading ? styles.rowHidden : null]}>
          {leftSlot}
          <AppText
            variant="caption"
            tone={labelTone}
            style={[styles.label, labelColor ? { color: labelColor } : null]}
          >
            {label}
          </AppText>
        </View>
        {loading ? (
          <View style={styles.spinner}>
            <ActivityIndicator color={spinnerColor} />
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  stretch: { alignSelf: "stretch" },
  base: {
    minHeight: 52,
    paddingHorizontal: space[6],
    paddingVertical: space[3],
    borderRadius: radius.pill,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
  },
  rowHidden: { opacity: 0 },
  spinner: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: fonts.ui.semibold,
    fontWeight: "400",
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0,
    textTransform: "none",
  },
  dim: { opacity: 0.55 },
});
