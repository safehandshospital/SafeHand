import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";

/** Curated clinic / hospital photography (Unsplash). */
export const CLINIC_IMAGES: Record<string, string> = {
  "General Practice":
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
  Pediatrics:
    "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=1200&q=80",
  Cardiology:
    "https://images.unsplash.com/photo-1581595220892-b0739db3b8c5?auto=format&fit=crop&w=1200&q=80",
  Dermatology:
    "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
  Orthopedics:
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
  default:
    "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80",
};

export function clinicImageFor(
  name?: string | null,
  imageUrl?: string | null,
): string {
  if (imageUrl) return imageUrl;
  if (name && CLINIC_IMAGES[name]) return CLINIC_IMAGES[name];
  return CLINIC_IMAGES.default;
}

type Props = {
  name: string;
  imageUrl?: string | null;
  subtitle?: string | null;
  height?: number;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  /** Flush into a parent Surface — no radius/border on the cover itself. */
  flush?: boolean;
};

export function ClinicCover({
  name,
  imageUrl,
  subtitle,
  height,
  style,
  compact = false,
  flush = false,
}: Props) {
  const { colors } = useTheme();
  const uri = clinicImageFor(name, imageUrl);
  const h = height ?? (compact ? 96 : 160);

  return (
    <View
      style={[
        styles.wrap,
        flush ? styles.flush : null,
        {
          height: h,
          borderColor: flush ? "transparent" : colors.hairline,
          backgroundColor: colors.canvasMid,
        },
        style,
      ]}
    >
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
      />
      <LinearGradient
        colors={["transparent", "rgba(10,10,12,0.72)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.caption, compact && styles.captionCompact]}>
        <AppText variant="label" style={{ color: "rgba(255,255,255,0.75)" }}>
          Clinic
        </AppText>
        <AppText
          variant={compact ? "h2" : "h1"}
          style={{ color: "#FFFFFF" }}
          numberOfLines={1}
        >
          {name}
        </AppText>
        {subtitle ? (
          <AppText
            variant="caption"
            style={{ color: "rgba(255,255,255,0.8)" }}
            numberOfLines={compact ? 1 : 2}
          >
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    borderCurve: "continuous",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    width: "100%",
  },
  flush: {
    borderRadius: 0,
    borderWidth: 0,
  },
  caption: {
    position: "absolute",
    left: space[4],
    right: space[4],
    bottom: space[4],
    gap: 2,
  },
  captionCompact: {
    left: space[3],
    right: space[3],
    bottom: space[3],
  },
});
