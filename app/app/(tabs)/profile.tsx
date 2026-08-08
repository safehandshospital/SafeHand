import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/AppText";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { space } from "@/theme/tokens";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colors, preference, setPreference } = useTheme();
  const { isWide } = useBreakpoint();

  return (
    <Screen
      tabBarClearance
      header={
        <View style={{ gap: space[1] }}>
          <AppText variant="h1">Profile</AppText>
          <AppText variant="body" tone="secondary">
            Your account and theme.
          </AppText>
        </View>
      }
    >
      <View style={[styles.row, isWide && styles.rowWide]}>
        <Surface elevated style={[styles.card, isWide && styles.cardWide]}>
          <AppText variant="label" tone="tertiary">
            Signed in
          </AppText>
          <View style={styles.identity}>
            {user?.avatarUrl ? (
              <View
                style={[
                  styles.avatar,
                  { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised },
                ]}
              >
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              </View>
            ) : null}
            <View style={{ flex: 1, gap: space[1], minWidth: 0 }}>
              <AppText variant="h2" numberOfLines={1}>
                {user?.fullName}
              </AppText>
              <AppText variant="body" tone="secondary" numberOfLines={1}>
                {user?.email}
              </AppText>
              <AppText variant="caption" tone="secondary">
                Role · {user?.role}
              </AppText>
            </View>
          </View>
          <Button
            label="Sign out"
            variant="primary"
            onPress={() => logout()}
            style={{ marginTop: space[4] }}
          />
        </Surface>

        <Surface outlined style={[styles.card, isWide && styles.cardWide]}>
          <AppText variant="label" tone="secondary">
            Theme
          </AppText>
          <View style={[styles.themeRow, isWide && styles.themeRowWide]}>
            {(["system", "light", "dark"] as const).map((p) => (
              <Button
                key={p}
                label={p}
                variant={preference === p ? "accent" : "secondary"}
                onPress={() => setPreference(p)}
              />
            ))}
          </View>
        </Surface>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { gap: space[4] },
  rowWide: { flexDirection: "row", alignItems: "stretch" },
  card: { gap: space[2], flex: 1 },
  cardWide: { minWidth: 280 },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[4],
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    flexShrink: 0,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  themeRow: { gap: space[2], marginTop: space[2] },
  themeRowWide: { flexDirection: "row", flexWrap: "wrap" },
});
