import { memo } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export const Atmosphere = memo(function Atmosphere() {
  const { colors, isDark } = useTheme();
  const accentWash = isDark
    ? "rgba(0, 82, 255, 0.08)"
    : "rgba(0, 82, 255, 0.06)";

  return (
    <View style={[StyleSheet.absoluteFill, styles.noPointerEvents]}>
      <LinearGradient
        colors={[colors.canvas, colors.canvasMid, colors.canvas]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[accentWash, "transparent"]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.8, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  noPointerEvents: {
    pointerEvents: "none",
  },
});
