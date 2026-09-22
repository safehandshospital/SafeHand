import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/AppText";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { PressableScale } from "@/components/PressableScale";
import { AppShell } from "@/components/ui/AppShell";
import { DateTimeBlock } from "@/components/ui/DateTimeBlock";
import { ClinicCover } from "@/components/ui/ClinicCover";
import { PartyCard } from "@/components/ui/PartyCard";
import {
  BookingStepper,
  type BookingStepId,
} from "@/components/ui/BookingStepper";
import { api } from "@/lib/api";
import {
  dayKey,
  formatCalendarDate,
  formatClockTime,
  parseDayKey,
} from "@/lib/datetime";
import { useTheme } from "@/theme/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useAppNav } from "@/hooks/useAppNav";
import { radius, space } from "@/theme/tokens";
import { hapticSuccess } from "@/lib/haptics";

type Slot = {
  id: string;
  startsAt: string;
  endsAt: string;
  remaining: number;
  available: boolean;
  demandLevel: "LOW" | "MEDIUM" | "HIGH";
  demandScore: number;
  doctor?: {
    fullName: string;
    specialty?: string;
    avatarUrl?: string | null;
  } | null;
};

type WebPickerInputProps = {
  kind: "date" | "time";
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  min?: string;
  max?: string;
  step?: number;
  colors: {
    ink: string;
    inkFaint: string;
    hairline: string;
    surfaceRaised: string;
  };
};

function WebPickerInput({
  kind,
  value,
  onChangeText,
  placeholder,
  min,
  max,
  step,
  colors,
}: WebPickerInputProps) {
  const openPicker = (event: { currentTarget: HTMLInputElement }) => {
    event.currentTarget.showPicker?.();
  };

  return createElement("input", {
    type: kind,
    value,
    min,
    max,
    step,
    placeholder,
    onChange: (event: { currentTarget: HTMLInputElement }) =>
      onChangeText(event.currentTarget.value),
    onClick: openPicker,
    onFocus: openPicker,
    style: {
      width: "100%",
      boxSizing: "border-box",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: colors.hairline,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceRaised,
      color: colors.ink,
      padding: `${space[3]}px`,
      fontSize: 15,
      lineHeight: "20px",
      outline: "none",
      colorScheme: "dark",
    },
  });
}

function BookingWorkspace() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const { isWide, isPhone } = useBreakpoint();
  const { items, bookAction } = useAppNav();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<BookingStepId>("date");
  const [day, setDay] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [customStartsAt, setCustomStartsAt] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deptName, setDeptName] = useState("Clinic");
  const [hospitalName, setHospitalName] = useState<string | null>(null);
  const [hospitalCity, setHospitalCity] = useState<string | null>(null);
  const [deptImage, setDeptImage] = useState<string | null>(null);
  const [deptDescription, setDeptDescription] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [slotRes, deptRes] = await Promise.all([
        api.slots(id),
        api.departments(),
      ]);
      setSlots(slotRes.slots);
      const dept = deptRes.departments.find((d) => d.id === id);
      if (dept) {
        setDeptName(dept.name);
        setHospitalName(dept.hospital?.name ?? null);
        setHospitalCity(dept.hospital?.city ?? null);
        setDeptImage(dept.imageUrl ?? null);
        setDeptDescription(dept.description);
        setTopic((t) => t || `${dept.name} visit`);
        setPurpose((p) => p || `Discuss this ${dept.name.toLowerCase()} visit.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load times");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const available = useMemo(
    () =>
      slots
        .filter((s) => s.available)
        .sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        ),
    [slots],
  );

  const days = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of available) {
      const key = dayKey(slot.startsAt);
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return [...map.entries()].map(([key, daySlots]) => ({
      key,
      label: formatCalendarDate(parseDayKey(key)),
      count: daySlots.length,
      lowDemand: daySlots.filter((s) => s.demandLevel === "LOW").length,
    }));
  }, [available]);

  const timesForDay = useMemo(() => {
    if (!day) return [];
    return available.filter((s) => dayKey(s.startsAt) === day);
  }, [available, day]);

  const customDateBounds = useMemo(() => {
    const now = new Date();
    const max = new Date(now);
    max.setDate(max.getDate() + 13);
    return {
      min: dayKey(now),
      max: dayKey(max),
    };
  }, []);

  const selected = available.find((s) => s.id === selectedId) ?? null;
  const selectedStartsAt = selected?.startsAt ?? customStartsAt;
  const selectedEndsAt = selected
    ? selected.endsAt
    : customStartsAt
      ? new Date(new Date(customStartsAt).getTime() + 30 * 60 * 1000).toISOString()
      : null;

  useEffect(() => {
    if (!day && days[0]) setDay(days[0].key);
  }, [day, days]);

  const goBack = () => {
    if (step === "time") setStep("date");
    else if (step === "details") setStep("time");
    else if (step === "confirm") setStep("details");
    else router.push("/book");
  };

  const book = async () => {
    if (!selectedId && !customStartsAt) return;
    setBooking(true);
    setError(null);
    try {
      if (customStartsAt) {
        await api.bookCustom({
          departmentId: id,
          startsAt: customStartsAt,
          topic: topic.trim() || undefined,
          purpose: purpose.trim() || undefined,
          description: notes.trim() || undefined,
        });
      } else if (selectedId) {
        await api.book({
          timeSlotId: selectedId,
          topic: topic.trim() || undefined,
          purpose: purpose.trim() || undefined,
          description: notes.trim() || undefined,
        });
      }
      await hapticSuccess();
      router.replace("/(tabs)/appointments");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBooking(false);
    }
  };

  const chooseCustomTime = () => {
    if (!customDate || !customTime) {
      setError("Choose a date and time.");
      return;
    }
    const selectedDay = parseDayKey(customDate);
    const [hourRaw, minuteRaw] = customTime.split(":").map(Number);
    const hour = hourRaw ?? NaN;
    const minute = minuteRaw ?? NaN;
    const startsAt = new Date(
      selectedDay.getFullYear(),
      selectedDay.getMonth(),
      selectedDay.getDate(),
      hour,
      minute,
      0,
      0,
    );
    const allowedHours = new Set([8, 9, 10, 11, 13, 14, 15, 16]);
    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      minute !== 0 ||
      !allowedHours.has(hour)
    ) {
      setError("Choose an hourly time from 8:00 AM to 4:00 PM, excluding 12:00 PM.");
      return;
    }
    const maxDate = parseDayKey(customDateBounds.max);
    maxDate.setHours(23, 59, 59, 999);
    if (
      startsAt.getDay() === 0 ||
      startsAt.getTime() > maxDate.getTime()
    ) {
      setError("Choose a Monday to Saturday date within the next 14 days.");
      return;
    }
    if (startsAt.getTime() <= Date.now()) {
      setError("Choose a future date and time.");
      return;
    }
    if (Number.isNaN(startsAt.getTime())) {
      setError("Enter a valid date and time.");
      return;
    }
    setError(null);
    setSelectedId(null);
    setCustomStartsAt(startsAt.toISOString());
    setStep("details");
  };

  const handleCustomDateChange = (value: string) => {
    setCustomDate(value);
    setCustomStartsAt(null);
    setSelectedId(null);
  };

  const handleCustomTimeChange = (value: string) => {
    setCustomTime(value);
    setCustomStartsAt(null);
    setSelectedId(null);
  };

  const inputStyle = [
    styles.input,
    {
      color: colors.ink,
      borderColor: colors.hairline,
      backgroundColor: colors.surfaceRaised,
    },
  ];

  const body = (
    <Screen
      topExtra={space[3]}
      contentStyle={styles.column}
      headerStyle={styles.column}
      header={
        <View style={styles.headerBlock}>
          <AppText variant="caption" tone="secondary" onPress={goBack}>
            {step === "date" ? "Back to clinics" : "Back"}
          </AppText>
          <View style={[styles.heroRow, isPhone && styles.heroStack]}>
            <ClinicCover
              name={deptName}
              imageUrl={deptImage}
              height={isPhone ? 120 : 112}
              compact
              flush={!isPhone}
              style={isPhone ? styles.heroCoverPhone : styles.heroCover}
            />
            <View style={styles.heroCopy}>
              <AppText variant="label" tone="tertiary">
                {hospitalName
                  ? `${hospitalName}${hospitalCity ? ` · ${hospitalCity}` : ""}`
                  : "Book appointment"}
              </AppText>
              <AppText variant="h1" numberOfLines={2}>
                {deptName}
              </AppText>
              {deptDescription ? (
                <AppText variant="caption" tone="secondary" numberOfLines={2}>
                  {deptDescription}
                </AppText>
              ) : null}
            </View>
          </View>
          <BookingStepper active={step} />
        </View>
      }
    >
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}

      {!loading && step === "date" ? (
        <View style={styles.section}>
          <View style={styles.sectionIntro}>
            <AppText variant="h2">Pick a day</AppText>
            <AppText variant="caption" tone="secondary">
              Choose an open day, or enter your own exact date and time.
            </AppText>
          </View>
          <Surface outlined style={styles.customCard}>
            <View style={styles.sectionIntro}>
              <AppText variant="h2">Exact date and time</AppText>
              <AppText variant="caption" tone="secondary">
                Choose from hospital hours. If the time is booked, we will tell you.
              </AppText>
            </View>
            <View style={styles.pickerBlock}>
              <AppText variant="label" tone="tertiary">
                Date
              </AppText>
              {Platform.OS === "web" ? (
                <WebPickerInput
                  kind="date"
                  value={customDate}
                  onChangeText={handleCustomDateChange}
                  placeholder="Select date"
                  min={customDateBounds.min}
                  max={customDateBounds.max}
                  colors={colors}
                />
              ) : (
                <TextInput
                  value={customDate}
                  onChangeText={handleCustomDateChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.inkFaint}
                  style={inputStyle}
                />
              )}
              <AppText variant="caption" tone="tertiary">
                Monday to Saturday, within the next 14 days.
              </AppText>
            </View>
            <View style={styles.pickerBlock}>
              <AppText variant="label" tone="tertiary">
                Time
              </AppText>
              {Platform.OS === "web" ? (
                <WebPickerInput
                  kind="time"
                  value={customTime}
                  onChangeText={handleCustomTimeChange}
                  placeholder="Select time"
                  min="08:00"
                  max="16:00"
                  step={3600}
                  colors={colors}
                />
              ) : (
                <TextInput
                  value={customTime}
                  onChangeText={handleCustomTimeChange}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.inkFaint}
                  style={inputStyle}
                />
              )}
              <AppText variant="caption" tone="tertiary">
                Hourly starts from 8:00 AM to 4:00 PM, excluding 12:00 PM.
              </AppText>
            </View>
            <Button
              label="Use this date and time"
              variant="accent"
              onPress={chooseCustomTime}
              disabled={!customDate || !customTime}
            />
          </Surface>
          <View style={[styles.dayGrid, isPhone && styles.dayGridPhone]}>
            {days.map((d) => {
              const active = day === d.key;
              return (
                <PressableScale
                  key={d.key}
                  onPress={() => {
                    setDay(d.key);
                    setSelectedId(null);
                    setCustomStartsAt(null);
                    setStep("time");
                  }}
                  style={[styles.dayPress, isPhone && styles.dayPressPhone]}
                >
                  <Surface
                    outlined
                    style={[
                      styles.dayCard,
                      active ? { borderColor: colors.ink } : null,
                    ]}
                  >
                    <AppText variant="body" numberOfLines={1}>
                      {d.label}
                    </AppText>
                    <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                      {d.count} times
                      {d.lowDemand > 0 ? `, ${d.lowDemand} quiet` : ""}
                    </AppText>
                  </Surface>
                </PressableScale>
              );
            })}
          </View>
          {days.length === 0 ? (
            <Surface>
              <AppText variant="body">No open days right now.</AppText>
            </Surface>
          ) : null}
        </View>
      ) : null}

      {!loading && step === "time" ? (
        <View style={styles.section}>
          <View style={styles.sectionIntro}>
            <AppText variant="h2">
              {day ? formatCalendarDate(parseDayKey(day)) : "Pick a time"}
            </AppText>
            <AppText variant="caption" tone="secondary">
              Choose one open slot.
            </AppText>
          </View>
          <View style={[styles.timeGrid, isPhone && styles.timeGridPhone]}>
            {timesForDay.map((slot) => {
              const active = selectedId === slot.id;
              const quiet = slot.demandLevel === "LOW";
              return (
                <PressableScale
                  key={slot.id}
                  onPress={() => {
                    setSelectedId(slot.id);
                    setStep("details");
                  }}
                  style={[styles.timePress, isPhone && styles.timePressPhone]}
                >
                  <Surface
                    outlined
                    style={[
                      styles.timeCard,
                      {
                        backgroundColor: active
                          ? colors.ink
                          : colors.surfaceRaised,
                        borderColor: active ? colors.ink : colors.hairline,
                      },
                    ]}
                  >
                    <AppText
                      variant="body"
                      mono
                      numberOfLines={1}
                      style={{ color: active ? colors.inkInverse : colors.ink }}
                    >
                      {formatClockTime(new Date(slot.startsAt))}
                    </AppText>
                    <AppText
                      variant="caption"
                      numberOfLines={1}
                      style={{
                        color: active ? colors.inkInverse : colors.inkMuted,
                      }}
                    >
                      {quiet ? "Quiet" : slot.demandLevel.toLowerCase()}
                      {slot.doctor ? `, ${slot.doctor.fullName}` : ""}
                    </AppText>
                  </Surface>
                </PressableScale>
              );
            })}
          </View>
          <Button
            label="Change day"
            variant="secondary"
            onPress={() => setStep("date")}
          />
        </View>
      ) : null}

      {!loading && step === "details" ? (
        <View style={styles.section}>
          <View style={styles.sectionIntro}>
            <AppText variant="h2">Visit details</AppText>
          </View>
          {selected ? (
            <Surface outlined style={styles.summaryCard}>
              <DateTimeBlock
                startsAt={selected.startsAt}
                endsAt={selected.endsAt}
                layout="stack"
              />
              {selected.doctor ? (
                <PartyCard
                  size="sm"
                  name={selected.doctor.fullName}
                  role="With"
                  subtitle={selected.doctor.specialty ?? deptName}
                  imageUrl={selected.doctor.avatarUrl}
                />
              ) : null}
            </Surface>
          ) : selectedStartsAt && selectedEndsAt ? (
            <Surface outlined style={styles.summaryCard}>
              <DateTimeBlock
                startsAt={selectedStartsAt}
                endsAt={selectedEndsAt}
                layout="stack"
              />
              <AppText variant="caption" tone="secondary">
                Exact time requested by you.
              </AppText>
            </Surface>
          ) : null}

          <View style={styles.field}>
            <AppText variant="label" tone="tertiary">
              Topic
            </AppText>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="What is this visit about?"
              placeholderTextColor={colors.inkFaint}
              style={inputStyle}
            />
          </View>
          <View style={styles.field}>
            <AppText variant="label" tone="tertiary">
              Purpose
            </AppText>
            <TextInput
              value={purpose}
              onChangeText={setPurpose}
              multiline
              placeholder="Why you need this visit"
              placeholderTextColor={colors.inkFaint}
              style={[inputStyle, styles.inputTall]}
            />
          </View>
          <View style={styles.field}>
            <AppText variant="label" tone="tertiary">
              Notes (optional)
            </AppText>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Anything the clinician should know"
              placeholderTextColor={colors.inkFaint}
              style={[inputStyle, styles.inputTall]}
            />
          </View>

          <View style={styles.actions}>
            <Button
              label="Back"
              variant="secondary"
              onPress={() => setStep("time")}
              style={styles.actionSecondary}
            />
            <Button
              label="Continue"
              variant="accent"
              onPress={() => setStep("confirm")}
              disabled={!topic.trim() || !purpose.trim()}
              style={styles.actionPrimary}
            />
          </View>
        </View>
      ) : null}

      {!loading && step === "confirm" ? (
        <View style={styles.section}>
          <View style={styles.sectionIntro}>
            <AppText variant="h2">Confirm booking</AppText>
          </View>
          <Surface outlined style={styles.summaryCard}>
            <AppText variant="label" tone="tertiary">
              Hospital
            </AppText>
            <AppText variant="body">
              {hospitalName ?? "SafeHand network"}
              {hospitalCity ? ` · ${hospitalCity}` : ""}
            </AppText>
            <AppText variant="label" tone="tertiary">
              Clinic
            </AppText>
            <AppText variant="h2">{deptName}</AppText>
            {selectedStartsAt && selectedEndsAt ? (
              <DateTimeBlock
                startsAt={selectedStartsAt}
                endsAt={selectedEndsAt}
                layout="stack"
              />
            ) : null}
            {selected?.doctor ? (
              <PartyCard
                size="md"
                name={selected.doctor.fullName}
                role="Meeting with"
                subtitle={selected.doctor.specialty ?? deptName}
                imageUrl={selected.doctor.avatarUrl}
              />
            ) : null}
            <View style={styles.field}>
              <AppText variant="label" tone="tertiary">
                Topic
              </AppText>
              <AppText variant="body">{topic.trim()}</AppText>
            </View>
            <View style={styles.field}>
              <AppText variant="label" tone="tertiary">
                Purpose
              </AppText>
              <AppText variant="body" tone="secondary">
                {purpose.trim()}
              </AppText>
            </View>
            {notes.trim() ? (
              <View style={styles.field}>
                <AppText variant="label" tone="tertiary">
                  Notes
                </AppText>
                <AppText variant="caption" tone="secondary">
                  {notes.trim()}
                </AppText>
              </View>
            ) : null}
          </Surface>

          <View style={styles.actions}>
            <Button
              label="Edit"
              variant="secondary"
              onPress={() => setStep("details")}
              style={styles.actionSecondary}
            />
            <Button
              label="Book appointment"
              variant="primary"
              loading={booking}
              onPress={book}
              style={styles.actionPrimary}
            />
          </View>
        </View>
      ) : null}
    </Screen>
  );

  if (!isWide) return body;

  return (
    <AppShell navItems={items} hideRail primaryAction={bookAction}>
      {body}
    </AppShell>
  );
}

export default function DepartmentDetailScreen() {
  return <BookingWorkspace />;
}

const styles = StyleSheet.create({
  column: {
    gap: space[4],
    paddingTop: space[2],
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
  },
  headerBlock: {
    gap: space[4],
    width: "100%",
  },
  heroRow: {
    flexDirection: "row",
    gap: space[4],
    alignItems: "center",
    width: "100%",
  },
  heroStack: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  heroCover: {
    width: 148,
    height: 112,
    flexShrink: 0,
  },
  heroCoverPhone: {
    width: "100%",
  },
  heroCopy: {
    flex: 1,
    gap: space[1],
    minWidth: 0,
    justifyContent: "center",
  },
  section: {
    gap: space[4],
    width: "100%",
  },
  sectionIntro: {
    gap: space[1],
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space[3],
  },
  dayGridPhone: {
    gap: space[2],
  },
  dayPress: {
    width: "48%",
    maxWidth: "48%",
  },
  dayPressPhone: {
    width: "100%",
    maxWidth: "100%",
  },
  dayCard: {
    gap: space[1],
    width: "100%",
    minHeight: 72,
    justifyContent: "center",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space[2],
  },
  timeGridPhone: {
    gap: space[2],
  },
  timePress: {
    width: "32%",
    maxWidth: "32%",
  },
  timePressPhone: {
    width: "48%",
    maxWidth: "48%",
  },
  timeCard: {
    gap: space[1],
    width: "100%",
    minHeight: 64,
    justifyContent: "center",
  },
  customCard: {
    gap: space[3],
    width: "100%",
  },
  pickerBlock: { gap: space[2] },
  datePickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space[2],
  },
  datePickerGridPhone: {
    gap: space[2],
  },
  customDatePress: {
    width: "31%",
    maxWidth: "31%",
  },
  customDatePressPhone: {
    width: "48%",
    maxWidth: "48%",
  },
  customChoice: {
    minHeight: 44,
    justifyContent: "center",
    width: "100%",
  },
  timePickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space[2],
  },
  summaryCard: {
    gap: space[3],
    width: "100%",
  },
  field: {
    gap: space[2],
    width: "100%",
  },
  actions: {
    flexDirection: "row",
    gap: space[3],
    alignItems: "stretch",
    width: "100%",
  },
  actionSecondary: {
    minWidth: 104,
  },
  actionPrimary: {
    flex: 1,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    borderCurve: "continuous",
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    fontSize: 15,
    width: "100%",
  },
  inputTall: {
    minHeight: 88,
    textAlignVertical: "top",
  },
});
