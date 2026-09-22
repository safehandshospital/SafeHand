import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/AppText";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { space } from "@/theme/tokens";

export default function AdminScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { isWide } = useBreakpoint();
  const [departments, setDepartments] = useState<
    Array<{ id: string; name: string; hospital?: { name: string; city?: string } }>
  >([]);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [outlook, setOutlook] = useState<string | null>(null);
  const [busySummary, setBusySummary] = useState<string | null>(null);
  const [busyHours, setBusyHours] = useState<
    Array<{
      weekday: number;
      hour: number;
      level: "HIGH" | "MEDIUM" | "LOW";
      confidence: number;
      reason: string;
    }>
  >([]);
  const [source, setSource] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    const res = await api.departments();
    setDepartments(res.departments);
    if (res.departments[0]) setDepartmentId(res.departments[0].id);
  }, []);

  useEffect(() => {
    if (user?.role !== "STAFF") return;
    void bootstrap().catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load"),
    );
  }, [bootstrap, user?.role]);

  if (user?.role !== "STAFF") {
    return <Redirect href="/(tabs)" />;
  }

  const loadOutlook = async () => {
    if (!departmentId) return;
    setLoading(true);
    setError(null);
    try {
      const [out, evalRes] = await Promise.all([
        api.demandOutlook(departmentId),
        api.evaluationMetrics(),
      ]);
      setOutlook(out.outlook);
      setBusySummary(out.busyHoursSummary);
      setBusyHours(out.busyHours);
      setSource(out.source);
      setMetrics(evalRes.metrics);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      tabBarClearance
      header={
        <View style={{ gap: space[1] }}>
          <AppText variant="h1">Demand admin</AppText>
          <AppText variant="body" tone="secondary">
            Department load and metrics.
          </AppText>
        </View>
      }
    >
      <View style={[styles.row, isWide && styles.rowWide]}>
        <Surface elevated style={[styles.controls, isWide && styles.controlsWide]}>
          <AppText variant="label" tone="tertiary">
            Department
          </AppText>
          <View style={[styles.deptList, isWide && styles.deptListWide]}>
            {departments.map((d) => (
              <Button
                key={d.id}
                label={d.hospital?.name ? `${d.hospital.name} · ${d.name}` : d.name}
                variant={departmentId === d.id ? "accent" : "secondary"}
                onPress={() => setDepartmentId(d.id)}
              />
            ))}
          </View>
          <Button
            label="Generate outlook"
            variant="primary"
            loading={loading}
            onPress={loadOutlook}
            fullWidth
          />
        </Surface>

        <View style={[styles.results, isWide && { flex: 1.4 }]}>
          {error ? (
            <AppText variant="caption" tone="danger">
              {error}
            </AppText>
          ) : null}
          {loading ? <ActivityIndicator color={colors.accent} /> : null}
          {outlook ? (
            <Surface elevated>
              <AppText variant="label" tone="tertiary">
                Source · {source}
              </AppText>
              <AppText variant="body">{outlook}</AppText>
            </Surface>
          ) : (
            <Surface outlined>
              <AppText variant="h2">Outlook panel</AppText>
              <AppText variant="caption" tone="secondary">
                Pick a department and generate a demand summary.
              </AppText>
            </Surface>
          )}
          {busyHours.length > 0 ? (
            <Surface outlined>
              <AppText variant="h2">Predicted busy hours</AppText>
              {busySummary ? (
                <AppText variant="caption" tone="secondary">
                  {busySummary}
                </AppText>
              ) : null}
              <View style={styles.busyList}>
                {busyHours.map((item) => (
                  <View key={`${item.weekday}-${item.hour}`} style={styles.busyRow}>
                    <View style={styles.busyTime}>
                      <AppText variant="body" mono>
                        {formatBusyWindow(item.weekday, item.hour)}
                      </AppText>
                      <AppText variant="caption" tone="tertiary">
                        {Math.round(item.confidence * 100)}% confidence
                      </AppText>
                    </View>
                    <View style={{ flex: 1, gap: space[1], minWidth: 0 }}>
                      <AppText variant="label" tone={item.level === "HIGH" ? "danger" : "secondary"}>
                        {item.level}
                      </AppText>
                      <AppText variant="caption" tone="secondary">
                        {item.reason}
                      </AppText>
                    </View>
                  </View>
                ))}
              </View>
            </Surface>
          ) : null}
          {metrics ? (
            <Surface outlined>
              <AppText variant="h2">Evaluation metrics</AppText>
              <View style={[styles.metricsGrid, isWide && styles.metricsGridWide]}>
                {Object.entries(metrics).map(([k, v]) => (
                  <View key={k} style={styles.metricCell}>
                    <AppText variant="label" tone="tertiary">
                      {k}
                    </AppText>
                    <AppText variant="caption" mono tone="secondary">
                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                    </AppText>
                  </View>
                ))}
              </View>
            </Surface>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { gap: space[4] },
  rowWide: { flexDirection: "row", alignItems: "flex-start" },
  controls: { gap: space[3] },
  controlsWide: { width: 320 },
  deptList: { gap: space[2] },
  deptListWide: { gap: space[2] },
  results: { gap: space[4], flex: 1 },
  busyList: { gap: space[3], marginTop: space[3] },
  busyRow: {
    flexDirection: "row",
    gap: space[3],
    alignItems: "flex-start",
  },
  busyTime: {
    width: 112,
    gap: space[1],
  },
  metricsGrid: { gap: space[3], marginTop: space[3] },
  metricsGridWide: { flexDirection: "row", flexWrap: "wrap" },
  metricCell: { minWidth: 180, flexBasis: 200, flexGrow: 1, gap: space[1] },
});

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatBusyWindow(weekday: number, hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${weekdays[weekday] ?? "Day"} ${h}:00 ${suffix}`;
}
