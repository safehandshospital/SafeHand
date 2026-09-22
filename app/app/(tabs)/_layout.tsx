import { Redirect, Tabs } from "expo-router";
import { Text, Platform } from "react-native";
import { useAuth } from "@/features/auth/AuthProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/fonts";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useAppNav } from "@/hooks/useAppNav";
import { AppShell } from "@/components/ui/AppShell";
import { RailProvider } from "@/features/layout/RailContext";

export default function TabLayout() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const { isPhone } = useBreakpoint();
  const { items, bookAction } = useAppNav();

  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  const tabs = (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: "transparent",
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: isPhone
          ? {
              backgroundColor: colors.surface,
              borderTopColor: colors.hairline,
            }
          : {
              display: "none",
              height: 0,
              overflow: "hidden",
              borderTopWidth: 0,
              ...(Platform.OS === "web"
                ? { position: "absolute" as const }
                : null),
            },
        tabBarLabelStyle: {
          fontFamily: fonts.ui.medium,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Text style={{ color: String(color), fontSize: 14 }}>●</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color }) => (
            <Text style={{ color: String(color), fontSize: 14 }}>◎</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: "AI",
          tabBarIcon: ({ color }) => (
            <Text style={{ color: String(color), fontSize: 14 }}>✦</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: user.role === "STAFF" ? undefined : null,
          tabBarIcon: ({ color }) => (
            <Text style={{ color: String(color), fontSize: 14 }}>▣</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Text style={{ color: String(color), fontSize: 14 }}>☺</Text>
          ),
        }}
      />
    </Tabs>
  );

  if (isPhone) {
    return <RailProvider>{tabs}</RailProvider>;
  }

  return (
    <RailProvider>
      <AppShell navItems={items} primaryAction={bookAction}>
        {tabs}
      </AppShell>
    </RailProvider>
  );
}
