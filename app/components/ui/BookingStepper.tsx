import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";

export type BookingStepId = "date" | "time" | "details" | "confirm";

const STEPS: Array<{ id: BookingStepId; label: string }> = [
  { id: "date", label: "Date" },
  { id: "time", label: "Time" },
  { id: "details", label: "Details" },
  { id: "confirm", label: "Confirm" },
];

type Props = {
  active: BookingStepId;
};

export function BookingStepper({ active }: Props) {
  const { colors } = useTheme();
  const activeIndex = STEPS.findIndex((s) => s.id === active);

  return (
    <View style={styles.row}>
      {STEPS.map((step, index) => {
        const done = index < activeIndex;
        const current = index === activeIndex;
        const filled = done || current;
        return (
          <View key={step.id} style={styles.step}>
            <View style={styles.track}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: filled ? colors.ink : colors.surfaceRaised,
                    borderColor: filled ? colors.ink : colors.hairline,
                  },
                ]}
              >
                <AppText
                  variant="label"
                  style={{
                    color: filled ? colors.inkInverse : colors.inkFaint,
                    letterSpacing: 0,
                    textTransform: "none",
                    fontSize: 10,
                    lineHeight: 12,
                  }}
                >
                  {index + 1}
                </AppText>
              </View>
              {index < STEPS.length - 1 ? (
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor:
                        index < activeIndex ? colors.ink : colors.hairline,
                    },
                  ]}
                />
              ) : null}
            </View>
            <AppText
              variant="caption"
              tone={current ? "primary" : "tertiary"}
              numberOfLines={1}
              style={styles.label}
            >
              {step.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
  },
  step: {
    flex: 1,
    gap: space[2],
    minWidth: 0,
  },
  track: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  line: {
    flex: 1,
    height: 2,
    marginHorizontal: space[2],
    borderRadius: 1,
  },
  label: {
    paddingLeft: 2,
  },
});
