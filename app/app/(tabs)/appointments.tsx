import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/AppText";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { DateTimeBlock } from "@/components/ui/DateTimeBlock";
import { FilterPills } from "@/components/ui/FilterPills";
import { PartyCard } from "@/components/ui/PartyCard";
import { ClinicCover } from "@/components/ui/ClinicCover";
import { HealthFilesList } from "@/components/ui/HealthFilesList";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useRailContent } from "@/features/layout/RailContext";
import { radius, space } from "@/theme/tokens";

type HealthFile = {
  id: string;
  name: string;
  kind: string;
  sizeLabel?: string | null;
  note?: string | null;
  url?: string | null;
};

type Appt = {
  id: string;
  status: string;
  aiRecommended: boolean;
  title?: string | null;
  topic?: string | null;
  purpose?: string | null;
  description?: string | null;
  notes?: string | null;
  department: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string | null;
  };
  timeSlot: { startsAt: string; endsAt: string };
  doctor?: {
    id: string;
    fullName: string;
    specialty: string;
    avatarUrl?: string | null;
  } | null;
  user?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
  healthFiles?: HealthFile[];
};

type FilterKey = "upcoming" | "past" | "cancelled" | "all";

function displayTitle(appt: Appt): string {
  if (appt.title?.trim()) return appt.title.trim();
  const topic = appt.topic?.trim() || `${appt.department.name} appointment`;
  const who = appt.doctor?.fullName ? ` with ${appt.doctor.fullName}` : "";
  return `${topic}${who}`;
}

function isUpcoming(appt: Appt, now: Date) {
  return (
    appt.status === "BOOKED" &&
    new Date(appt.timeSlot.startsAt).getTime() >= now.getTime()
  );
}

function isPast(appt: Appt, now: Date) {
  if (appt.status === "COMPLETED") return true;
  if (appt.status === "CANCELLED") return false;
  return new Date(appt.timeSlot.endsAt).getTime() < now.getTime();
}

export default function AppointmentsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { isWide, isDesktop } = useBreakpoint();
  const [items, setItems] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Appt | null>(null);
  const [filter, setFilter] = useState<FilterKey>("upcoming");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.appointments();
      setItems(res.appointments as Appt[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const now = useMemo(() => new Date(), [items]);

  const counts = useMemo(() => {
    let upcoming = 0;
    let past = 0;
    let cancelled = 0;
    for (const a of items) {
      if (a.status === "CANCELLED") cancelled += 1;
      else if (isUpcoming(a, now)) upcoming += 1;
      else if (isPast(a, now) || a.status === "COMPLETED") past += 1;
      else upcoming += 1;
    }
    return { upcoming, past, cancelled, all: items.length };
  }, [items, now]);

  const filtered = useMemo(() => {
    const list = items.filter((a) => {
      if (filter === "all") return true;
      if (filter === "cancelled") return a.status === "CANCELLED";
      if (filter === "upcoming") return isUpcoming(a, now);
      if (filter === "past") return isPast(a, now) || a.status === "COMPLETED";
      return true;
    });
    const dir = filter === "past" ? -1 : 1;
    return [...list].sort(
      (a, b) =>
        dir *
        (new Date(a.timeSlot.startsAt).getTime() -
          new Date(b.timeSlot.startsAt).getTime()),
    );
  }, [items, filter, now]);

  useEffect(() => {
    if (!filtered.length) {
      setSelected(null);
      return;
    }
    setSelected((prev) => {
      if (prev && filtered.some((a) => a.id === prev.id)) return prev;
      return filtered[0];
    });
  }, [filtered]);

  const cancel = async (id: string) => {
    setBusyId(id);
    try {
      await api.cancel(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  };

  const patientParty = (appt: Appt) => {
    if (appt.user) {
      return {
        name: appt.user.fullName,
        subtitle: appt.user.email,
        meta: appt.user.phone ?? null,
        imageUrl: appt.user.avatarUrl ?? null,
      };
    }
    if (user) {
      return {
        name: user.fullName,
        subtitle: user.email,
        meta: user.phone ?? null,
        imageUrl: user.avatarUrl ?? null,
      };
    }
    return { name: "Patient", subtitle: null, meta: null, imageUrl: null };
  };

  const detailBody = selected ? (
    <View style={{ gap: space[4] }}>
      <ClinicCover
        name={selected.department.name}
        imageUrl={selected.department.imageUrl}
        subtitle={selected.department.description}
        height={140}
        compact
      />

      <View style={{ gap: space[2] }}>
        <AppText variant="label" tone="tertiary">
          Appointment
        </AppText>
        <AppText variant="h1">{displayTitle(selected)}</AppText>
        {selected.topic ? (
          <AppText variant="caption" tone="secondary">
            About · {selected.topic}
          </AppText>
        ) : null}
      </View>

      <DateTimeBlock
        startsAt={selected.timeSlot.startsAt}
        endsAt={selected.timeSlot.endsAt}
        layout="stack"
      />

      <View
        style={[
          styles.statusChip,
          {
            backgroundColor: colors.surfaceRaised,
            borderColor: colors.hairline,
          },
        ]}
      >
        <AppText variant="caption" tone="secondary">
          {selected.status}
          {selected.aiRecommended ? " · AI recommended" : ""}
        </AppText>
      </View>

      {selected.purpose ? (
        <View style={{ gap: space[1] }}>
          <AppText variant="label" tone="tertiary">
            Purpose
          </AppText>
          <AppText variant="body">{selected.purpose}</AppText>
        </View>
      ) : null}

      {selected.description ? (
        <View style={{ gap: space[1] }}>
          <AppText variant="label" tone="tertiary">
            Description
          </AppText>
          <AppText variant="body" tone="secondary">
            {selected.description}
          </AppText>
        </View>
      ) : null}

      <View style={{ gap: space[3] }}>
        <AppText variant="label" tone="tertiary">
          Parties
        </AppText>
        <Surface outlined>
          {selected.doctor ? (
            <PartyCard
              size="lg"
              name={selected.doctor.fullName}
              role="Meeting with"
              subtitle={selected.doctor.specialty}
              meta="Attending clinician"
              imageUrl={selected.doctor.avatarUrl}
            />
          ) : (
            <PartyCard
              size="lg"
              name={selected.department.name}
              role="Clinic"
              subtitle="Department visit"
            />
          )}
        </Surface>
        <Surface outlined>
          <PartyCard
            size="md"
            name={patientParty(selected).name}
            role="Patient"
            subtitle={patientParty(selected).subtitle}
            meta={patientParty(selected).meta}
            imageUrl={patientParty(selected).imageUrl}
          />
        </Surface>
      </View>

      <View style={{ gap: space[2] }}>
        <AppText variant="label" tone="tertiary">
          Health files
        </AppText>
        <AppText variant="caption" tone="secondary">
          Files shared with your clinician.
        </AppText>
        <HealthFilesList files={selected.healthFiles ?? []} />
      </View>

      {selected.notes ? (
        <View style={{ gap: space[1] }}>
          <AppText variant="label" tone="tertiary">
            Patient notes
          </AppText>
          <AppText variant="body" tone="secondary">
            {selected.notes}
          </AppText>
        </View>
      ) : null}

      {selected.status === "BOOKED" && isUpcoming(selected, now) ? (
        <Button
          label="Cancel appointment"
          variant="secondary"
          loading={busyId === selected.id}
          onPress={() => cancel(selected.id)}
        />
      ) : null}
    </View>
  ) : null;

  useRailContent(
    isWide ? detailBody : null,
    [isWide, selected, busyId, colors, user, now],
    "Appointment details",
  );

  return (
    <Screen
      tabBarClearance
      topExtra={space[3]}
      contentStyle={styles.screenContent}
      header={
        <View style={styles.headerBlock}>
          <View style={{ gap: space[1] }}>
            <AppText variant="h1">Appointments</AppText>
            <AppText variant="body" tone="secondary" numberOfLines={2}>
              Your visits, details, and shared files.
            </AppText>
          </View>
          <FilterPills
            activeKey={filter}
            onChange={(key) => setFilter(key as FilterKey)}
            pills={[
              { key: "upcoming", label: "Upcoming", count: counts.upcoming },
              { key: "past", label: "Past", count: counts.past },
              { key: "cancelled", label: "Cancelled", count: counts.cancelled },
              { key: "all", label: "All", count: counts.all },
            ]}
          />
        </View>
      }
    >
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <Surface>
          <AppText variant="h2">
            {filter === "upcoming"
              ? "No upcoming appointments"
              : "Nothing in this filter"}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {filter === "upcoming"
              ? "Book a clinic slot, or try Past or All."
              : "Try another filter."}
          </AppText>
        </Surface>
      ) : null}

      <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
        {filtered.map((appt) => {
          const active = selected?.id === appt.id;
          const fileCount = appt.healthFiles?.length ?? 0;
          return (
            <Pressable
              key={appt.id}
              onPress={() => setSelected(appt)}
              style={isDesktop ? styles.cardPress : undefined}
            >
              <Surface
                outlined
                padded={false}
                style={[
                  styles.card,
                  isDesktop ? styles.cardDesktop : null,
                  active ? { borderColor: colors.accent } : null,
                ]}
              >
                <ClinicCover
                  name={appt.department.name}
                  imageUrl={appt.department.imageUrl}
                  height={88}
                  compact
                  flush
                />
                <View style={styles.cardBody}>
                  <AppText variant="label" tone="tertiary" numberOfLines={1}>
                    {appt.status}
                    {appt.aiRecommended ? " · AI" : ""}
                    {fileCount > 0 ? ` · ${fileCount} files` : ""}
                  </AppText>
                  <AppText variant="h2" numberOfLines={2}>
                    {displayTitle(appt)}
                  </AppText>
                  <View style={styles.purposeSlot}>
                    {appt.purpose?.trim() ? (
                      <AppText
                        variant="caption"
                        tone="secondary"
                        numberOfLines={2}
                      >
                        {appt.purpose}
                      </AppText>
                    ) : null}
                  </View>
                  <DateTimeBlock
                    startsAt={appt.timeSlot.startsAt}
                    endsAt={appt.timeSlot.endsAt}
                    layout="stack"
                  />
                  <View style={styles.partySlot}>
                    {appt.doctor ? (
                      <PartyCard
                        size="sm"
                        name={appt.doctor.fullName}
                        role="With"
                        subtitle={appt.doctor.specialty}
                        imageUrl={appt.doctor.avatarUrl}
                      />
                    ) : (
                      <PartyCard
                        size="sm"
                        name={appt.department.name}
                        role="Clinic"
                        subtitle="Department visit"
                      />
                    )}
                  </View>
                </View>
              </Surface>
            </Pressable>
          );
        })}
      </View>

      {!isWide && detailBody ? (
        <Surface elevated style={{ gap: space[4] }}>
          <AppText variant="label" tone="tertiary">
            Appointment details
          </AppText>
          {detailBody}
        </Surface>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: space[3],
  },
  screenContent: {
    gap: space[4],
    paddingTop: space[2],
  },
  grid: { gap: space[3] },
  gridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
  },
  cardPress: {
    flexGrow: 1,
    flexBasis: 300,
    minWidth: 280,
    maxWidth: "100%",
  },
  card: {
    overflow: "hidden",
    width: "100%",
  },
  cardDesktop: {
    width: "100%",
  },
  cardBody: {
    padding: space[4],
    gap: space[2],
    minWidth: 0,
  },
  purposeSlot: {
    minHeight: 0,
  },
  partySlot: {
    marginTop: space[1],
  },
  statusChip: {
    alignSelf: "flex-start",
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
