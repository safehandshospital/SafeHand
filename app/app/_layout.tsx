import { useFonts } from "expo-font";
import {
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from "@expo-google-fonts/ibm-plex-mono";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { fonts } from "@/theme/fonts";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) {
      router.replace("/(auth)/login");
    } else if (user && inAuth) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    [fonts.display.regular]: Fraunces_400Regular,
    [fonts.display.medium]: Fraunces_600SemiBold,
    [fonts.display.bold]: Fraunces_700Bold,
    [fonts.ui.regular]: PlusJakartaSans_400Regular,
    [fonts.ui.medium]: PlusJakartaSans_500Medium,
    [fonts.ui.semibold]: PlusJakartaSans_600SemiBold,
    [fonts.ui.bold]: PlusJakartaSans_700Bold,
    [fonts.ui.extrabold]: PlusJakartaSans_800ExtraBold,
    [fonts.mono.regular]: IBMPlexMono_400Regular,
    [fonts.mono.medium]: IBMPlexMono_500Medium,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="book" />
              <Stack.Screen name="department/[id]" />
              <Stack.Screen name="+not-found" />
            </Stack>
          </AuthGate>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
