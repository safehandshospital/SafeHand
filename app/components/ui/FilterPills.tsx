import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { PressableScale } from "@/components/PressableScale";
import { useTheme } from "@/theme/ThemeProvider";
import { selectionChipColors } from "@/theme/selectionChip";
import { radius, space } from "@/theme/tokens";

export type FilterPill = {
  key: string;
  label: string;
  count?: number;
};

type Props = {
  pills: FilterPill[];
  activeKey: string;
  onChange: (key: string) => void;
};

export function FilterPills({ pills, activeKey, onChange }: Props) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {pills.map((pill) => {
        const selected = pill.key === activeKey;
        const chip = selectionChipColors(selected, colors, colors.surfaceRaised);
        const label =
          typeof pill.count === "number"
            ? `${pill.label} ${pill.count}`
            : pill.label;
        return (
          <PressableScale key={pill.key} onPress={() => onChange(pill.key)}>
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: chip.backgroundColor,
                  borderColor: selected ? colors.accent : colors.hairline,
                },
              ]}
            >
              <AppText
                variant="caption"
                style={{
                  color: chip.labelColor,
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                {label}
              </AppText>
            </View>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingVertical: 0,
  },
  pill: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
