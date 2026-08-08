import { useMemo } from "react";
import { usePathname, useRouter } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
import type {
  ShellNavItem,
  ShellPrimaryAction,
} from "@/components/ui/AppShell";

export function useAppNav(): {
  items: ShellNavItem[];
  activeKey: string;
  bookAction: ShellPrimaryAction;
} {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  return useMemo(() => {
    const path = pathname ?? "";
    let activeKey = "departments";
    if (path.includes("/book") || path.includes("department")) activeKey = "book";
    else if (path.includes("appointments")) activeKey = "appointments";
    else if (path.includes("assistant")) activeKey = "assistant";
    else if (path.includes("admin")) activeKey = "admin";
    else if (path.includes("profile")) activeKey = "profile";

    const items: ShellNavItem[] = [
      {
        key: "departments",
        label: "Clinics",
        active: activeKey === "departments",
        onPress: () => router.push("/(tabs)"),
      },
      {
        key: "appointments",
        label: "Appointments",
        active: activeKey === "appointments",
        onPress: () => router.push("/(tabs)/appointments"),
      },
      {
        key: "assistant",
        label: "AI Assistant",
        active: activeKey === "assistant",
        onPress: () => router.push("/(tabs)/assistant"),
      },
    ];

    if (user?.role === "STAFF") {
      items.push({
        key: "admin",
        label: "Demand Admin",
        active: activeKey === "admin",
        onPress: () => router.push("/(tabs)/admin"),
      });
    }

    items.push({
      key: "profile",
      label: "Profile",
      active: activeKey === "profile",
      onPress: () => router.push("/(tabs)/profile"),
    });

    const bookAction: ShellPrimaryAction = {
      label: "Book Appointment",
      onPress: () => router.push("/book"),
    };

    return { items, activeKey, bookAction };
  }, [pathname, router, user?.role]);
}
