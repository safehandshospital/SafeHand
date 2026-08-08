import type { ThemeColors } from "@/theme/tokens";

export const ON_ACCENT = "#FFFFFF";

export type SelectionChipColors = {
  backgroundColor: string;
  borderColor: string;
  labelColor: string;
  iconColor: string;
};

export function selectionChipColors(
  selected: boolean,
  colors: ThemeColors,
  idleBackground: string,
): SelectionChipColors {
  if (selected) {
    return {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
      labelColor: ON_ACCENT,
      iconColor: ON_ACCENT,
    };
  }
  return {
    backgroundColor: idleBackground,
    borderColor: "transparent",
    labelColor: colors.ink,
    iconColor: colors.inkMuted,
  };
}
