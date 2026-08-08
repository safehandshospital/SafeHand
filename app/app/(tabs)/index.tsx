import { useCallback, useEffect, useState } from "react";
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
import { useRailContent } from "@/features/layout/RailContext";
import { space } from "@/theme/tokens";

type Dept = ClinicDetail;

export default function DepartmentsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isWide, isDesktop } = useBreakpoint();
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Dept | null>(null);

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

  const openDepartment = (dept: Dept) => {
    setSelected(dept);
    if (!isWide) router.push(`/department/${dept.id}`);
  };

  const rail = selected ? (
    <ClinicDetailRail
      clinic={selected}
      onBook={() => router.push(`/department/${selected.id}`)}
    />
  ) : null;

  useRailContent(isWide ? rail : null, [isWide, selected], "Clinic");

  return (
    <Screen
      topExtra={space[3]}
      contentStyle={styles.screenContent}
      header={
        <View style={{ gap: space[3] }}>
          <View style={{ gap: space[1] }}>
            <AppText variant="h1">Clinics</AppText>
            <AppText variant="body" tone="secondary">
              Choose a clinic to book a slot.
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

      <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
        {departments.map((dept) => {
          const active = selected?.id === dept.id;
          const lead = dept.doctors?.[0];
          const extras = (dept.doctors?.length ?? 0) - 1;
          const place = [dept.location, dept.wing].filter(Boolean).join(", ");
          const mapsQuery = [dept.name, dept.location, dept.wing]
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
                      <AppText variant="label" tone="tertiary" numberOfLines={1}>
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
                    <AppText variant="label" tone="tertiary" numberOfLines={1}>
                      {dept.totalPatients ?? 0} patients, {dept.openSlots ?? 0}{" "}
                      open, {dept._count?.doctors ?? 0} doctors
                    </AppText>
                  </View>

                  {lead ? (
                    <View style={styles.leadRow}>
                      <Image
                        source={{ uri: lead.avatarUrl }}
                        style={styles.leadAvatar}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                        <AppText
                          variant="caption"
                          tone="tertiary"
                          numberOfLines={1}
                        >
                          Lead clinician
                        </AppText>
                        <AppText variant="body" numberOfLines={1}>
                          {lead.fullName}
                          {extras > 0 ? ` +${extras}` : ""}
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
});
