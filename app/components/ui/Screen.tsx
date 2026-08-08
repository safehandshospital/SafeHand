import { type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { useTheme } from "@/theme/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { screenPad, space } from "@/theme/tokens";

type Props = {
  children: ReactNode;
  header?: ReactNode;
  overlay?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
  topExtra?: number;
  bottomExtra?: number;
  tabBarClearance?: boolean;
  /**
   * `page` — full canvas (phone / standalone).
   * `embedded` — inside AppShell main pane (no atmosphere, denser pad).
   * `auth` — centered auth card on wide screens.
   */
  variant?: "page" | "embedded" | "auth";
};

export function Screen({
  children,
  header,
  overlay,
  style,
  contentStyle,
  headerStyle,
  scroll = true,
  topExtra,
  bottomExtra = space[6],
  tabBarClearance = false,
  variant = "page",
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isWide, contentMaxWidth, isPhone } = useBreakpoint();
  const embedded = variant === "embedded" || (variant === "page" && isWide);
  const authWide = variant === "auth" && isWide;

  const resolvedTopExtra =
    topExtra ?? (embedded ? space[5] : space[6]);
  const topPad = embedded
    ? resolvedTopExtra
    : insets.top + resolvedTopExtra;
  const bottomPad = embedded
    ? bottomExtra
    : tabBarClearance
      ? bottomExtra
      : insets.bottom + bottomExtra;

  const horizontalPad = embedded ? space[6] : screenPad;

  const contentPadStyle = [
    styles.content,
    scroll ? null : styles.fill,
    {
      paddingTop: header ? space[2] : topPad,
      paddingBottom: bottomPad,
      paddingHorizontal: horizontalPad,
      width: "100%" as const,
      maxWidth: authWide ? 440 : embedded && !isPhone ? contentMaxWidth : undefined,
      alignSelf: "center" as const,
    },
    authWide ? styles.authCenter : null,
    contentStyle,
  ];

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: embedded ? "transparent" : colors.canvas,
        },
        style,
      ]}
    >
      {embedded ? null : <Atmosphere />}
      {header ? (
        <View
          style={[
            styles.header,
            {
              paddingTop: topPad,
              paddingHorizontal: horizontalPad,
              backgroundColor: embedded ? "transparent" : colors.canvas,
              maxWidth: embedded && !isPhone ? contentMaxWidth : undefined,
              width: "100%",
              alignSelf: "center",
            },
            headerStyle,
          ]}
        >
          {header}
        </View>
      ) : null}
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={contentPadStyle}
          showsVerticalScrollIndicator={isWide}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={contentPadStyle}>{children}</View>
      )}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  header: { zIndex: 5, paddingBottom: space[3] },
  scroll: { flex: 1 },
  content: { gap: space[6], flexGrow: 1 },
  fill: { flex: 1 },
  authCenter: {
    justifyContent: "center",
    minHeight: "100%",
  },
});
