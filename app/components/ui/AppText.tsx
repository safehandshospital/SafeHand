import {
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
  type TextStyle as RNTextStyle,
} from "react-native";
import { frauncesForWeight, fonts, jakartaForWeight } from "@/theme/fonts";
import { useTheme } from "@/theme/ThemeProvider";
import { type } from "@/theme/tokens";

export type TextVariant = keyof typeof type;
export type TextTone =
  | "primary"
  | "secondary"
  | "tertiary"
  | "accent"
  | "success"
  | "danger"
  | "inverse";

type Props = TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  mono?: boolean;
};

type Weight = "400" | "500" | "600" | "700";

function familyFor(variant: TextVariant, mono: boolean): string {
  if (mono) return fonts.mono.regular;
  const spec = type[variant];
  const weight = String(spec.fontWeight) as Weight;
  return spec.display ? frauncesForWeight(weight) : jakartaForWeight(weight);
}

/**
 * Typed text — Fraunces for display (hero/h1), Plus Jakarta Sans for UI.
 * `mono` uses IBM Plex Mono for times and IDs (tabular).
 */
export function AppText({
  variant = "body",
  tone = "primary",
  mono = false,
  style,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const toneColor: Record<TextTone, string> = {
    primary: colors.ink,
    secondary: colors.inkMuted,
    tertiary: colors.inkFaint,
    accent: colors.accent,
    success: colors.success,
    danger: colors.danger,
    inverse: colors.inkInverse,
  };

  const { display: _display, fontWeight: _fw, ...typeStyle } = type[variant];

  return (
    <Text
      {...rest}
      style={[
        typeStyle as TextStyle,
        {
          color: toneColor[tone],
          fontFamily: familyFor(variant, mono),
          fontWeight: "400" as RNTextStyle["fontWeight"],
        },
        mono ? styles.mono : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  mono: {
    fontVariant: ["tabular-nums"],
  },
});
