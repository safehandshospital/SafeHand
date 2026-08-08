import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { PressableScale } from "@/components/PressableScale";
import { RailHost } from "@/features/layout/RailContext";
import { useTheme } from "@/theme/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { radius, space } from "@/theme/tokens";

export type ShellNavItem = {
  key: string;
  label: string;
  onPress: () => void;
  active?: boolean;
};

export type ShellPrimaryAction = {
  label: string;
  onPress: () => void;
};

type Props = {
  children: ReactNode;
  navItems: ShellNavItem[];
  title?: string;
  hideRail?: boolean;
  primaryAction?: ShellPrimaryAction;
};

/**
 * Desktop-primary chrome: sidebar | main (scrolls) | fixed context rail.
 * Rail children are published by pages via `useRailContent`.
 */
export function AppShell({
  children,
  navItems,
  title = "HealthBook",
  hideRail = false,
  primaryAction,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isPhone, isDesktop, sidebarWidth } = useBreakpoint();
  const showRail = !hideRail && !isPhone;

  if (isPhone) {
    return <View style={styles.fill}>{children}</View>;
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.canvas }]}>
      <Atmosphere />
      <View
        style={[
          styles.frame,
          {
            paddingTop: Math.max(insets.top, space[5]),
            paddingBottom: Math.max(insets.bottom, space[5]),
            paddingHorizontal: space[5],
            gap: space[5],
          },
        ]}
      >
        <View
          style={[
            styles.sidebar,
            {
              width: sidebarWidth,
              backgroundColor: colors.surface,
              borderColor: colors.hairline,
            },
          ]}
        >
          <View style={{ gap: space[1] }}>
            <AppText variant="label" tone="tertiary">
              HealthBook
            </AppText>
            <AppText variant="h1">{title}</AppText>
            <AppText variant="caption" tone="secondary">
              Outpatient booking
            </AppText>
          </View>

          {primaryAction ? (
            <Button
              label={primaryAction.label}
              variant="accent"
              onPress={primaryAction.onPress}
              fullWidth
            />
          ) : null}

          <View style={styles.navList}>
            {navItems.map((item) => (
              <PressableScale key={item.key} onPress={item.onPress}>
                <View
                  style={[
                    styles.navItem,
                    {
                      backgroundColor: item.active
                        ? colors.accentSoft
                        : "transparent",
                      borderColor: item.active
                        ? colors.accent
                        : "transparent",
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    tone={item.active ? "accent" : "primary"}
                    style={styles.navLabel}
                  >
                    {item.label}
                  </AppText>
                </View>
              </PressableScale>
            ))}
          </View>

          <View style={{ marginTop: "auto", gap: space[1] }}>
            <AppText variant="label" tone="tertiary">
              Workspace
            </AppText>
            <AppText variant="caption" tone="secondary">
              {isDesktop ? "Desktop" : "Tablet"}
            </AppText>
          </View>
        </View>

        <View
          style={[
            styles.main,
            {
              backgroundColor: colors.surface,
              borderColor: colors.hairline,
            },
          ]}
        >
          {children}
        </View>

        {showRail ? (
          <View
            style={[
              styles.rail,
              {
                backgroundColor: colors.surface,
                borderColor: colors.hairline,
                width: isDesktop ? 360 : 320,
              },
            ]}
          >
            <RailHost />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  frame: {
    flex: 1,
    flexDirection: "row",
    minHeight: 0,
  },
  sidebar: {
    borderRadius: radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    padding: space[5],
    gap: space[5],
  },
  navList: { gap: space[2] },
  navItem: {
    paddingVertical: space[3],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  navLabel: {
    fontSize: 14,
    lineHeight: 18,
    textTransform: "none",
    letterSpacing: 0,
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    borderRadius: radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  rail: {
    borderRadius: radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    padding: space[5],
    overflow: "hidden",
    minHeight: 0,
  },
});
