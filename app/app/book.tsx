import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/AppText";
import { Surface } from "@/components/ui/Surface";
import { PressableScale } from "@/components/PressableScale";
import { AppShell } from "@/components/ui/AppShell";
import { clinicImageFor } from "@/components/ui/ClinicCover";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAppNav } from "@/hooks/useAppNav";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useTheme } from "@/theme/ThemeProvider";
import { api } from "@/lib/api";
import { space } from "@/theme/tokens";

type Clinic = {
  id: string;
  name: string;
  description: string;
  hospital?: {
    name: string;
    city?: string;
  };
  category?: string;
  imageUrl?: string | null;
  openSlots?: number;
  doctors?: Array<{
    id: string;
    fullName: string;
    avatarUrl: string;
  }>;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function ClinicThumb({ clinic }: { clinic: Clinic }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const uri = clinicImageFor(clinic.name, clinic.imageUrl);

  return (
    <View
      style={[
        styles.thumb,
        styles.thumbFallback,
        {
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.hairline,
        },
      ]}
    >
      {!failed ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <AppText variant="label" tone="secondary">
          {initials(clinic.name)}
        </AppText>
      )}
    </View>
  );
}

function BookClinicPicker() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isWide } = useBreakpoint();
  const { items, bookAction } = useAppNav();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.departments();
      setClinics(res.departments as Clinic[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load clinics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const body = (
    <Screen
      topExtra={space[3]}
      contentStyle={styles.column}
      headerStyle={styles.column}
      header={
        <View style={styles.headerBlock}>
          <AppText variant="label" tone="tertiary">
            Quick book
          </AppText>
          <AppText variant="h1">Book appointment</AppText>
          <AppText variant="body" tone="secondary">
            Choose a clinic, then pick a day and time.
          </AppText>
        </View>
      }
    >
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}

      <View style={styles.list}>
        {clinics.map((clinic) => {
          const lead = clinic.doctors?.[0];
          return (
            <PressableScale
              key={clinic.id}
              onPress={() => router.push(`/department/${clinic.id}`)}
              style={styles.rowPress}
            >
              <Surface outlined style={styles.row}>
                <ClinicThumb clinic={clinic} />
                <View style={styles.rowCopy}>
                  {clinic.category ? (
                    <AppText variant="label" tone="tertiary" numberOfLines={1}>
                      {clinic.hospital?.name
                        ? `${clinic.hospital.name} · ${clinic.category}`
                        : clinic.category}
                    </AppText>
                  ) : null}
                  <AppText variant="h2" numberOfLines={1}>
                    {clinic.name}
                  </AppText>
                  <AppText variant="caption" tone="secondary" numberOfLines={2}>
                    {clinic.description}
                  </AppText>
                  <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                    {clinic.hospital?.city ? `${clinic.hospital.city} · ` : ""}
                    {clinic.openSlots ?? 0} open
                    {lead ? `, ${lead.fullName}` : ""}
                  </AppText>
                </View>
              </Surface>
            </PressableScale>
          );
        })}
      </View>
    </Screen>
  );

  if (!isWide) return body;

  return (
    <AppShell navItems={items} hideRail primaryAction={bookAction}>
      {body}
    </AppShell>
  );
}

export default function BookScreen() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  return <BookClinicPicker />;
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
    gap: space[1],
    width: "100%",
  },
  list: {
    gap: space[3],
    width: "100%",
  },
  rowPress: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    gap: space[3],
    alignItems: "center",
    width: "100%",
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    flexShrink: 0,
  },
  thumbFallback: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  rowCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
});
