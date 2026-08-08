import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/fonts";
import { space } from "@/theme/tokens";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

type Props = {
  name: string;
  role: string;
  subtitle?: string | null;
  meta?: string | null;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
};

/**
 * Party / participant profile row — photo (or initials fallback) + role hierarchy.
 */
export function PartyCard({
  name,
  role,
  subtitle,
  meta,
  imageUrl,
  size = "md",
  style,
}: Props) {
  const { colors } = useTheme();
  const avatarSize = size === "lg" ? 56 : size === "sm" ? 36 : 44;
  const initialSize = size === "lg" ? 18 : size === "sm" ? 12 : 14;
  const uri = imageUrl?.trim() || null;

  return (
    <View style={[styles.row, style]}>
      <View
        style={[
          styles.avatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: colors.surfaceRaised,
            borderColor: colors.hairline,
          },
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: avatarSize, height: avatarSize }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <AppText
            style={{
              color: colors.inkMuted,
              fontFamily: fonts.ui.bold,
              fontSize: initialSize,
              lineHeight: initialSize + 4,
            }}
          >
            {initials(name)}
          </AppText>
        )}
      </View>
      <View style={styles.copy}>
        <AppText variant="label" tone="tertiary" numberOfLines={1}>
          {role}
        </AppText>
        <AppText variant={size === "lg" ? "h2" : "body"} numberOfLines={1}>
          {name}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
        {meta ? (
          <AppText variant="caption" tone="tertiary" numberOfLines={1}>
            {meta}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
  },
  avatar: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
});
