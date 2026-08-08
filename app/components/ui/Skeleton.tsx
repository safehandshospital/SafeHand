import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";

/** Simple skeleton bone matching list/surface layout. */
export function SkeletonBlock({ height = 72 }: { height?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.bone,
        {
          height,
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.hairline,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bone: {
    borderRadius: radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: space[3],
  },
});
