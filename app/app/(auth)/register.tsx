import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { useAuth } from "@/features/auth/AuthProvider";
import { useTheme } from "@/theme/ThemeProvider";
import {
  PROFILE_AVATAR_PRESETS,
  isValidAvatarUrl,
} from "@/lib/avatars";
import { radius, space } from "@/theme/tokens";

export default function RegisterScreen() {
  const { register } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!avatarUrl || !isValidAvatarUrl(avatarUrl)) {
      setError("Choose a profile photo to continue.");
      return;
    }
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, fullName.trim(), undefined, avatarUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
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
        <AppText variant="hero">Create account</AppText>
        <AppText variant="body" tone="secondary">
          Book and manage appointments.
        </AppText>
      </View>

      <Surface elevated>
        <View style={{ gap: space[4] }}>
          <View style={{ gap: space[2] }}>
            <AppText variant="label" tone="secondary">
              Profile photo, required
            </AppText>
            <AppText variant="caption" tone="tertiary">
              Choose a photo for your account.
            </AppText>
            <View style={styles.avatarGrid}>
              {PROFILE_AVATAR_PRESETS.map((preset) => {
                const selected = avatarUrl === preset.url;
                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => setAvatarUrl(preset.url)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${preset.label}`}
                  >
                    <View
                      style={[
                        styles.avatarOption,
                        {
                          borderColor: selected ? colors.accent : colors.hairline,
                          backgroundColor: colors.surfaceRaised,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: preset.url }}
                        style={styles.avatarImage}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {!avatarUrl ? (
              <AppText variant="caption" tone="danger">
                A profile photo is required.
              </AppText>
            ) : null}
          </View>

          {[
            { label: "Full name", value: fullName, set: setFullName, secure: false },
            { label: "Email", value: email, set: setEmail, secure: false },
            { label: "Password", value: password, set: setPassword, secure: true },
          ].map((field) => (
            <View key={field.label} style={{ gap: space[2] }}>
              <AppText variant="label" tone="secondary">
                {field.label}
              </AppText>
              <TextInput
                autoCapitalize={field.label === "Email" ? "none" : "words"}
                secureTextEntry={field.secure}
                value={field.value}
                onChangeText={field.set}
                style={[
                  styles.input,
                  {
                    color: colors.ink,
                    borderColor: colors.hairline,
                    backgroundColor: colors.surfaceRaised,
                  },
                ]}
              />
            </View>
          ))}
          {error ? (
            <AppText variant="caption" tone="danger">
              {error}
            </AppText>
          ) : null}
          <Button
            label="Create account"
            variant="accent"
            loading={loading}
            onPress={onSubmit}
            fullWidth
          />
          <AppText
            variant="caption"
            tone="secondary"
            style={{ textAlign: "center" }}
            onPress={() => router.push("/(auth)/login")}
          >
            Already registered? Sign in
          </AppText>
        </View>
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space[2],
  },
  avatarOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    borderCurve: "continuous",
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    fontSize: 15,
  },
});
