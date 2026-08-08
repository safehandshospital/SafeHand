import { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  outlined?: boolean;
  padded?: boolean;
};

export function Surface({
  children,
  style,
  elevated = false,
  outlined = false,
  padded = true,
}: Props) {
  const { colors, shadow } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderCurve: "continuous",
          overflow: "hidden",
        },
        elevated ? shadow.soft : null,
        outlined
          ? {
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.hairline,
            }
          : null,
        padded ? { padding: space[4] } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
