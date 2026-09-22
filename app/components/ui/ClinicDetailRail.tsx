import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { ClinicCover } from "@/components/ui/ClinicCover";
import { PartyCard } from "@/components/ui/PartyCard";
import { DateTimeBlock } from "@/components/ui/DateTimeBlock";
import { MetaLink } from "@/components/ui/MetaLink";
import { openMaps, openPhone } from "@/lib/links";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";

export type ClinicRecentAppointment = {
  id: string;
  status: string;
  startsAt: string;
  patientLabel: string;
  visitLabel: string;
};

export type ClinicDetail = {
  id: string;
  name: string;
  description: string;
  hospital?: {
    id: string;
    name: string;
    description?: string;
    address?: string;
    city?: string;
    phone?: string | null;
    imageUrl?: string | null;
  };
  summary?: string;
  category?: string;
  treatment?: string;
  services?: string[];
  priceRange?: string;
  location?: string;
  wing?: string;
  hours?: string;
  phone?: string | null;
  imageUrl?: string | null;
  openSlots?: number;
  upcomingSlots?: number;
  totalPatients?: number;
  recentAppointments?: ClinicRecentAppointment[];
  doctors?: Array<{
    id: string;
    fullName: string;
    specialty: string;
    avatarUrl: string;
  }>;
  _count?: { timeSlots: number; doctors: number; appointments?: number };
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <AppText variant="label" tone="tertiary" numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="body" numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

type Props = {
  clinic: ClinicDetail;
  onBook: () => void;
};

/** Clinic detail panel for the right rail. */
export function ClinicDetailRail({ clinic, onBook }: Props) {
  const { colors } = useTheme();
  const lead = clinic.doctors?.[0] ?? null;
  const services = clinic.services ?? [];
  const recent = clinic.recentAppointments ?? [];
  const hospitalPlace = [clinic.hospital?.name, clinic.hospital?.city]
    .filter(Boolean)
    .join(", ");
  const placeLabel = [hospitalPlace, clinic.location, clinic.wing]
    .filter(Boolean)
    .join(" · ");
  const mapsQuery = [clinic.hospital?.name, clinic.name, clinic.location, clinic.wing]
    .filter(Boolean)
    .join(", ");

  return (
    <View style={styles.root}>
      <ClinicCover
        name={clinic.name}
        imageUrl={clinic.imageUrl}
        subtitle={clinic.category || clinic.description}
        height={148}
      />

      <View style={{ gap: space[1] }}>
        <AppText variant="h2">{clinic.name}</AppText>
        {clinic.category ? (
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {clinic.hospital?.name ? `${clinic.hospital.name} · ` : ""}
          {clinic.category}
          </AppText>
        ) : null}
        <AppText variant="body" tone="secondary">
          {clinic.summary?.trim() || clinic.description}
        </AppText>
      </View>

      <View style={styles.facts}>
        <Fact label="Patients" value={String(clinic.totalPatients ?? 0)} />
        <Fact label="Open" value={String(clinic.openSlots ?? 0)} />
        <Fact
          label="Clinicians"
          value={String(clinic._count?.doctors ?? clinic.doctors?.length ?? 0)}
        />
      </View>

      <View style={{ gap: space[2] }}>
        {placeLabel ? (
          <MetaLink
            icon="location-outline"
            label={placeLabel}
            onPress={() => void openMaps(mapsQuery)}
          />
        ) : null}
        {clinic.hours ? (
          <MetaLink icon="time-outline" label={clinic.hours} />
        ) : null}
        {clinic.phone ? (
          <MetaLink
            icon="call-outline"
            label={clinic.phone}
            onPress={() => void openPhone(clinic.phone!)}
          />
        ) : null}
        {clinic.priceRange ? (
          <MetaLink icon="cash-outline" label={`Fees ${clinic.priceRange}`} />
        ) : null}
      </View>

      {clinic.treatment?.trim() ? (
        <View style={{ gap: space[1] }}>
          <AppText variant="label" tone="tertiary">
            Treatment
          </AppText>
          <AppText variant="caption" tone="secondary">
            {clinic.treatment}
          </AppText>
        </View>
      ) : null}

      {services.length > 0 ? (
        <View style={{ gap: space[2] }}>
          <AppText variant="label" tone="tertiary">
            Services
          </AppText>
          <View style={styles.chips}>
            {services.map((service) => (
              <View
                key={service}
                style={[
                  styles.chip,
                  {
                    borderColor: colors.hairline,
                    backgroundColor: colors.surfaceRaised,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  tone="secondary"
                  style={styles.chipLabel}
                  numberOfLines={1}
                >
                  {service}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {lead ? (
        <PartyCard
          size="md"
          name={lead.fullName}
          role="Lead clinician"
          subtitle={lead.specialty}
          imageUrl={lead.avatarUrl}
        />
      ) : null}

      <View style={{ gap: space[2] }}>
        <AppText variant="label" tone="tertiary">
          Recent appointments
        </AppText>
        <AppText variant="caption" tone="tertiary">
          Initials only. No notes or contact details.
        </AppText>
        {recent.length === 0 ? (
          <Surface outlined>
            <AppText variant="caption" tone="secondary">
              No recent visits yet.
            </AppText>
          </Surface>
        ) : (
          <View style={{ gap: space[2] }}>
            {recent.map((appt) => (
              <Surface key={appt.id} outlined style={styles.recentRow}>
                <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                  <View style={styles.recentHead}>
                    <AppText
                      variant="body"
                      numberOfLines={1}
                      style={{ flexShrink: 1 }}
                    >
                      {appt.patientLabel}
                    </AppText>
                    <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                      {appt.status.toLowerCase()}
                    </AppText>
                  </View>
                  <AppText variant="caption" tone="secondary" numberOfLines={1}>
                    {appt.visitLabel}
                  </AppText>
                  <DateTimeBlock
                    startsAt={appt.startsAt}
                    layout="inline"
                    showDuration={false}
                  />
                </View>
              </Surface>
            ))}
          </View>
        )}
      </View>

      <Button label="Book appointment" variant="accent" onPress={onBook} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[4] },
  facts: { flexDirection: "row", gap: space[2] },
  fact: { flex: 1, gap: 2, minWidth: 0 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  chip: {
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "100%",
  },
  chipLabel: { textTransform: "none", letterSpacing: 0 },
  recentRow: { gap: space[1] },
  recentHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space[2],
  },
});
