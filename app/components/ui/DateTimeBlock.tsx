import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/fonts";
import { space } from "@/theme/tokens";
import {
  durationMinutes,
  formatCalendarDate,
  formatTimeRange,
} from "@/lib/datetime";

type Props = {
  startsAt: string | Date;
  endsAt?: string | Date | null;
  /** `stack` = date over time (cards). `inline` = compact single row. */
  layout?: "stack" | "inline";
  /** Invert colors for selected accent chips. */
  inverted?: boolean;
  showDuration?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Google Calendar–style date & time block with calendar + clock icons.
 */
export function DateTimeBlock({
  startsAt,
  endsAt,
  layout = "stack",
  inverted = false,
  showDuration = true,
  style,
}: Props) {
  const { colors } = useTheme();
  const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  const end = endsAt
    ? typeof endsAt === "string"
      ? new Date(endsAt)
      : endsAt
    : new Date(start.getTime() + 30 * 60 * 1000);

  const dateLabel = formatCalendarDate(start);
  const timeLabel = formatTimeRange(start, end);
  const mins = durationMinutes(start, end);

  const ink = inverted ? "#FFFFFF" : colors.ink;
  const muted = inverted ? "rgba(255,255,255,0.78)" : colors.inkMuted;
  const icon = inverted ? "#FFFFFF" : colors.inkMuted;

  const dateRow = (
    <View style={styles.row}>
      <Ionicons name="calendar-outline" size={16} color={icon} style={styles.icon} />
      <AppText
        variant="caption"
        numberOfLines={1}
        style={[styles.dateText, { color: ink, fontFamily: fonts.ui.semibold }]}
      >
        {dateLabel}
      </AppText>
    </View>
  );

  const timeRow = (
    <View style={styles.row}>
      <Ionicons name="time-outline" size={16} color={icon} style={styles.icon} />
      <View style={styles.timeCopy}>
        <AppText
          variant="body"
          mono
          numberOfLines={1}
          style={[styles.timeText, { color: ink, fontFamily: fonts.mono.medium }]}
        >
          {timeLabel}
        </AppText>
        {showDuration ? (
          <AppText variant="caption" style={{ color: muted }} numberOfLines={1}>
            {mins} min
          </AppText>
        ) : null}
      </View>
    </View>
  );

  if (layout === "inline") {
    return (
      <View style={[styles.inline, style]}>
        {dateRow}
        <View style={[styles.dot, { backgroundColor: muted }]} />
        {timeRow}
      </View>
    );
  }

  return (
    <View style={[styles.stack, style]}>
      {dateRow}
      {timeRow}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: space[2],
  },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: space[2],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    minWidth: 0,
  },
  icon: {
    flexShrink: 0,
  },
  dateText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    textTransform: "none",
    letterSpacing: 0,
  },
  timeCopy: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: space[2],
    minWidth: 0,
  },
  timeText: {
    fontSize: 15,
    lineHeight: 20,
    fontVariant: ["tabular-nums"],
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
});
