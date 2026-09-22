import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/AppText";
import { Surface } from "@/components/ui/Surface";
import { PressableScale } from "@/components/PressableScale";
import { ClinicCover } from "@/components/ui/ClinicCover";
import { MetaLink } from "@/components/ui/MetaLink";
import { Button } from "@/components/ui/Button";
import {
  ClinicDetailRail,
  type ClinicDetail,
} from "@/components/ui/ClinicDetailRail";
import { api } from "@/lib/api";
import { openMaps, openPhone } from "@/lib/links";
import { useTheme } from "@/theme/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { space } from "@/theme/tokens";

type Dept = ClinicDetail;
type HospitalGroup = NonNullable<Dept["hospital"]> & {
  departments: Dept[];
  openSlots: number;
  doctors: number;
  totalPatients: number;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function LeadAvatar({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const uri = imageUrl?.trim();

  return (
    <View
      style={[
        styles.leadAvatar,
        styles.leadAvatarFallback,
        {
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.hairline,
        },
      ]}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <AppText variant="label" tone="secondary">
          {initials(name)}
        </AppText>
      )}
    </View>
  );
}

export default function DepartmentsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isWide, isDesktop } = useBreakpoint();
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Dept | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.departments();
      setDepartments(res.departments as Dept[]);
      setSelected((prev) => {
        const next = res.departments as Dept[];
        if (prev && next.some((d) => d.id === prev.id)) {
          return next.find((d) => d.id === prev.id) ?? next[0] ?? null;
        }
        return next[0] ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load clinics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hospitals = useMemo(() => {
    const groups = new Map<string, HospitalGroup>();

    departments.forEach((dept) => {
      const hospital = dept.hospital;
      if (!hospital) return;

      const existing = groups.get(hospital.id);
      const group =
        existing ??
        ({
          ...hospital,
          departments: [],
          openSlots: 0,
          doctors: 0,
          totalPatients: 0,
        } satisfies HospitalGroup);

      group.departments.push(dept);
      group.openSlots += dept.openSlots ?? 0;
      group.doctors += dept._count?.doctors ?? dept.doctors?.length ?? 0;
      group.totalPatients += dept.totalPatients ?? 0;
      groups.set(hospital.id, group);
    });

    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

  const selectedHospital =
    hospitals.find((hospital) => hospital.id === selectedHospitalId) ??
    hospitals[0] ??
    null;

  useEffect(() => {
    if (!selectedHospital) return;
    if (selected?.hospital?.id === selectedHospital.id) return;
    setSelected(selectedHospital.departments[0] ?? null);
  }, [selected, selectedHospital]);

  const selectHospital = (hospital: HospitalGroup) => {
    setSelectedHospitalId(hospital.id);
    setSelected(hospital.departments[0] ?? null);
  };

  const openDepartment = (dept: Dept) => {
    setSelected(dept);
    setSelectedHospitalId(dept.hospital?.id ?? selectedHospitalId);
  };

  return (
    <Screen
      topExtra={space[3]}
      contentStyle={styles.screenContent}
      header={
        <View style={{ gap: space[3] }}>
          <View style={{ gap: space[1] }}>
            <AppText variant="h1">Clinics</AppText>
            <AppText variant="body" tone="secondary">
              Choose a hospital, then review departments and doctors.
            </AppText>
          </View>
          {!isWide ? (
            <Button
              label="Book Appointment"
              variant="accent"
              onPress={() => router.push("/book")}
            />
          ) : null}
        </View>
      }
      tabBarClearance
    >
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}

      <View style={{ gap: space[5] }}>
        <View style={{ gap: space[2] }}>
          <AppText variant="label" tone="tertiary">
            Hospitals
          </AppText>
          <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
            {hospitals.map((hospital) => {
              const active = selectedHospital?.id === hospital.id;
              const mapsQuery = [hospital.name, hospital.address, hospital.city]
                .filter(Boolean)
                .join(", ");
              return (
                <PressableScale
                  key={hospital.id}
                  onPress={() => selectHospital(hospital)}
                  style={isDesktop ? styles.cardPress : undefined}
                >
                  <Surface
                    outlined
                    padded={false}
                    style={[
                      styles.card,
                      active ? { borderColor: colors.accent } : null,
                    ]}
                  >
                    <ClinicCover
                      name={hospital.name}
                      imageUrl={hospital.imageUrl}
                      subtitle={hospital.city}
                      height={124}
                      compact
                      flush
                    />
                    <View style={styles.cardBody}>
                      <View style={styles.cardTop}>
                        <AppText variant="label" tone="tertiary" numberOfLines={1}>
                          Hospital
                        </AppText>
                        <AppText variant="h2" numberOfLines={1}>
                          {hospital.name}
                        </AppText>
                        <AppText
                          variant="caption"
                          tone="secondary"
                          numberOfLines={2}
                        >
                          {hospital.description}
                        </AppText>
                      </View>

                      <View style={styles.metaBlock}>
                        {[hospital.city, hospital.address].filter(Boolean).length ? (
                          <MetaLink
                            icon="location-outline"
                            label={[hospital.city, hospital.address]
                              .filter(Boolean)
                              .join(" · ")}
                            numberOfLines={1}
                            onPress={() => void openMaps(mapsQuery)}
                          />
                        ) : null}
                        {hospital.phone ? (
                          <MetaLink
                            icon="call-outline"
                            label={hospital.phone}
                            numberOfLines={1}
                            onPress={() => void openPhone(hospital.phone!)}
                          />
                        ) : null}
                      </View>

                      <View
                        style={[
                          styles.statsRow,
                          { borderTopColor: colors.hairline },
                        ]}
                      >
                        <AppText variant="label" tone="tertiary" numberOfLines={1}>
                          {hospital.departments.length} departments,{" "}
                          {hospital.openSlots} open, {hospital.doctors} doctors
                        </AppText>
                      </View>
                    </View>
                  </Surface>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {selectedHospital ? (
          <View style={{ gap: space[2] }}>
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="label" tone="tertiary">
                  Departments
                </AppText>
                <AppText variant="h2" numberOfLines={1}>
                  {selectedHospital.name}
                </AppText>
              </View>
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {selectedHospital.city}
              </AppText>
            </View>

            <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
              {selectedHospital.departments.map((dept) => {
                const active = selected?.id === dept.id;
                const lead = dept.doctors?.[0];
                const extras = (dept.doctors?.length ?? 0) - 1;
                const place = [dept.location, dept.wing]
                  .filter(Boolean)
                  .join(" · ");
                const mapsQuery = [
                  dept.hospital?.name,
                  dept.name,
                  dept.location,
                  dept.wing,
                ]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <PressableScale
                    key={dept.id}
                    onPress={() => openDepartment(dept)}
                    style={isDesktop ? styles.cardPress : undefined}
                  >
                    <Surface
                      outlined
                      padded={false}
                      style={[
                        styles.card,
                        active && isWide ? { borderColor: colors.accent } : null,
                      ]}
                    >
                      <ClinicCover
                        name={dept.name}
                        imageUrl={dept.imageUrl}
                        height={112}
                        compact
                        flush
                      />
                      <View style={styles.cardBody}>
                        <View style={styles.cardTop}>
                          {dept.category ? (
                            <AppText
                              variant="label"
                              tone="tertiary"
                              numberOfLines={1}
                            >
                              {dept.category}
                            </AppText>
                          ) : null}
                          <AppText variant="h2" numberOfLines={1}>
                            {dept.name}
                          </AppText>
                          <AppText
                            variant="caption"
                            tone="secondary"
                            numberOfLines={2}
                          >
                            {dept.summary?.trim() || dept.description}
                          </AppText>
                        </View>

                        <View style={styles.metaBlock}>
                          {place ? (
                            <MetaLink
                              icon="location-outline"
                              label={place}
                              numberOfLines={1}
                              onPress={() => void openMaps(mapsQuery)}
                            />
                          ) : null}
                          {dept.hours ? (
                            <MetaLink
                              icon="time-outline"
                              label={dept.hours}
                              numberOfLines={1}
                            />
                          ) : null}
                          {dept.phone ? (
                            <MetaLink
                              icon="call-outline"
                              label={dept.phone}
                              numberOfLines={1}
                              onPress={() => void openPhone(dept.phone!)}
                            />
                          ) : null}
                          {dept.priceRange ? (
                            <MetaLink
                              icon="cash-outline"
                              label={dept.priceRange}
                              numberOfLines={1}
                            />
                          ) : null}
                        </View>

                        <View
                          style={[
                            styles.statsRow,
                            { borderTopColor: colors.hairline },
                          ]}
                        >
                          <AppText
                            variant="label"
                            tone="tertiary"
                            numberOfLines={1}
                          >
                            {dept.totalPatients ?? 0} patients,{" "}
                            {dept.openSlots ?? 0} open,{" "}
                            {dept._count?.doctors ?? 0} doctors
                          </AppText>
                        </View>

                        {lead ? (
                          <View style={styles.leadRow}>
                            <LeadAvatar
                              name={lead.fullName}
                              imageUrl={lead.avatarUrl}
                            />
                            <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                              <AppText
                                variant="caption"
                                tone="tertiary"
                                numberOfLines={1}
                              >
                                Doctors
                              </AppText>
                              <AppText variant="body" numberOfLines={1}>
                                {lead.fullName}
                                {extras > 0 ? ` +${extras}` : ""}
                              </AppText>
                              <AppText
                                variant="caption"
                                tone="secondary"
                                numberOfLines={1}
                              >
                                {lead.specialty}
                              </AppText>
                            </View>
                          </View>
                        ) : null}
                      </View>
                    </Surface>
                  </PressableScale>
                );
              })}
            </View>

            {selected ? (
              <Surface outlined style={styles.detailPanel}>
                <ClinicDetailRail
                  clinic={selected}
                  onBook={() => router.push(`/department/${selected.id}`)}
                  bookFirst
                  bookLabel="Book this department"
                />
              </Surface>
            ) : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: space[4],
    paddingTop: space[2],
  },
  grid: { gap: space[3] },
  gridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  cardPress: {
    flexGrow: 1,
    flexBasis: 320,
    minWidth: 280,
    maxWidth: "100%",
  },
  card: {
    overflow: "hidden",
    width: "100%",
  },
  cardBody: {
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[4],
    gap: space[3],
  },
  cardTop: {
    gap: space[1],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: space[3],
  },
  detailPanel: {
    marginTop: space[2],
  },
  metaBlock: {
    gap: space[2],
  },
  statsRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space[3],
  },
  leadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
  },
  leadAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  leadAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    flexShrink: 0,
  },
});
