/**
 * Healthcare Booking design tokens — Munchkin discipline.
 * 90% neutral surface. Exactly one accent. Semantic colors for state only.
 */

export type ColorScheme = "light" | "dark";

export type ThemeColors = {
  canvas: string;
  canvasMid: string;
  surface: string;
  surfaceRaised: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  inkInverse: string;
  accent: string;
  accentSoft: string;
  hairline: string;
  hairlineStrong: string;
  success: string;
  warning: string;
  danger: string;
};

export const darkColors: ThemeColors = {
  canvas: "#0A0A0C",
  canvasMid: "#0D0D10",
  surface: "#121215",
  surfaceRaised: "#18181B",
  ink: "#FFFFFF",
  inkMuted: "rgba(255, 255, 255, 0.55)",
  inkFaint: "rgba(255, 255, 255, 0.35)",
  inkInverse: "#09090B",
  accent: "#0052FF",
  accentSoft: "rgba(0, 82, 255, 0.14)",
  hairline: "rgba(255, 255, 255, 0.08)",
  hairlineStrong: "rgba(255, 255, 255, 0.12)",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
};

export const lightColors: ThemeColors = {
  canvas: "#F4F4F5",
  canvasMid: "#ECECED",
  surface: "#FFFFFF",
  surfaceRaised: "#FAFAFA",
  ink: "#09090B",
  inkMuted: "rgba(9, 9, 11, 0.55)",
  inkFaint: "rgba(9, 9, 11, 0.35)",
  inkInverse: "#FFFFFF",
  accent: "#0052FF",
  accentSoft: "rgba(0, 82, 255, 0.10)",
  hairline: "rgba(0, 0, 0, 0.06)",
  hairlineStrong: "rgba(0, 0, 0, 0.08)",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
};

export function colorsFor(scheme: ColorScheme): ThemeColors {
  return scheme === "light" ? lightColors : darkColors;
}

export const color = darkColors;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** Display (hero/h1) → Fraunces; UI → Plus Jakarta Sans. Max 4 sizes/view. */
export const type = {
  hero: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "700" as const,
    letterSpacing: -0.6,
    display: true,
  },
  h1: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
    display: true,
  },
  h2: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600" as const,
    letterSpacing: -0.15,
    display: false,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400" as const,
    display: false,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500" as const,
    display: false,
  },
  label: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: "600" as const,
    letterSpacing: 0.6,
    textTransform: "uppercase" as const,
    display: false,
  },
} as const;

export const spring = {
  press: { damping: 15, stiffness: 250, mass: 0.5 },
  settle: { damping: 18, stiffness: 220, mass: 0.6 },
} as const;

export const pressScale = 0.97;

export function shadowFor(scheme: ColorScheme) {
  return {
    soft: {
      shadowColor: "#000",
      shadowOpacity: scheme === "light" ? 0.06 : 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
  } as const;
}

export const shadow = shadowFor("dark");
export const screenPad = space[5];

/** Responsive breakpoints — phone / tablet / desktop shells. */
export const breakpoints = {
  phone: 768,
  tablet: 1200,
} as const;

export type Breakpoint = "phone" | "tablet" | "desktop";

export function breakpointForWidth(width: number): Breakpoint {
  if (width < breakpoints.phone) return "phone";
  if (width < breakpoints.tablet) return "tablet";
  return "desktop";
}
