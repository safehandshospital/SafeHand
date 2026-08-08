/**
 * HealthBook type stack — distinct from Munchkin.
 * Display: Fraunces (warm soft-serif). UI: Plus Jakarta Sans. Mono: IBM Plex Mono.
 */
export const fonts = {
  display: {
    regular: "Fraunces_400Regular",
    medium: "Fraunces_600SemiBold",
    bold: "Fraunces_700Bold",
  },
  ui: {
    regular: "PlusJakartaSans_400Regular",
    medium: "PlusJakartaSans_500Medium",
    semibold: "PlusJakartaSans_600SemiBold",
    bold: "PlusJakartaSans_700Bold",
    extrabold: "PlusJakartaSans_800ExtraBold",
  },
  mono: {
    regular: "IBMPlexMono_400Regular",
    medium: "IBMPlexMono_500Medium",
  },
} as const;

export function jakartaForWeight(
  weight: "400" | "500" | "600" | "700",
): string {
  switch (weight) {
    case "500":
      return fonts.ui.medium;
    case "600":
      return fonts.ui.semibold;
    case "700":
      return fonts.ui.bold;
    default:
      return fonts.ui.regular;
  }
}

/** Display headlines use Fraunces. */
export function frauncesForWeight(
  weight: "400" | "500" | "600" | "700",
): string {
  if (weight === "700") return fonts.display.bold;
  if (weight === "400") return fonts.display.regular;
  return fonts.display.medium;
}

/** @deprecated Use jakartaForWeight */
export const manropeForWeight = jakartaForWeight;
/** @deprecated Use frauncesForWeight */
export const clashForWeight = frauncesForWeight;
