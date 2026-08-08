import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { useAuth } from "@/features/auth/AuthProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("patient@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen variant="auth">
      <View style={{ gap: space[2] }}>
        <AppText variant="label" tone="tertiary">
          HealthBook
        </AppText>
        <AppText variant="hero">Sign in</AppText>
        <AppText variant="body" tone="secondary">
          Book quieter appointment times.
        </AppText>
      </View>

      <Surface elevated>
        <View style={{ gap: space[4] }}>
          <View style={{ gap: space[2] }}>
            <AppText variant="label" tone="secondary">
              Email
            </AppText>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={[
                styles.input,
                { color: colors.ink, borderColor: colors.hairline, backgroundColor: colors.surfaceRaised },
              ]}
            />
          </View>
          <View style={{ gap: space[2] }}>
            <AppText variant="label" tone="secondary">
              Password
            </AppText>
            <TextInput
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={[
                styles.input,
                { color: colors.ink, borderColor: colors.hairline, backgroundColor: colors.surfaceRaised },
              ]}
            />
          </View>
          {error ? (
            <AppText variant="caption" tone="danger">
              {error}
            </AppText>
          ) : null}
          <Button label="Continue" variant="accent" loading={loading} onPress={onSubmit} fullWidth />
          <AppText
            variant="caption"
            tone="secondary"
            style={{ textAlign: "center" }}
            onPress={() => router.push("/(auth)/register")}
          >
            Need an account? Register
          </AppText>
        </View>
      </Surface>

      <AppText variant="caption" tone="tertiary">
        Demo: patient@example.com or staff@example.com, password123
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    borderCurve: "continuous",
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    fontSize: 15,
  },
});
