import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import {
  colorsFor,
  shadowFor,
  type ColorScheme,
  type ThemeColors,
} from "@/theme/tokens";

const STORAGE_KEY = "healthcare.theme.preference";

export type ThemePreference = "system" | "light" | "dark";

type ThemeContextValue = {
  scheme: ColorScheme;
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  colors: ThemeColors;
  shadow: ReturnType<typeof shadowFor>;
  isDark: boolean;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useSystemColorScheme();
  const systemScheme: ColorScheme = system === "light" ? "light" : "dark";
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (
          !cancelled &&
          (stored === "light" || stored === "dark" || stored === "system")
        ) {
          setPreferenceState(stored);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const scheme: ColorScheme =
    preference === "system" ? systemScheme : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      preference,
      setPreference,
      colors: colorsFor(scheme),
      shadow: shadowFor(scheme),
      isDark: scheme === "dark",
      ready,
    }),
    [scheme, preference, setPreference, ready],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
