import { useWindowDimensions } from "react-native";
import {
  breakpointForWidth,
  type Breakpoint,
  breakpoints,
} from "@/theme/tokens";

export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  const breakpoint: Breakpoint = breakpointForWidth(width);
  const isPhone = breakpoint === "phone";
  const isTablet = breakpoint === "tablet";
  const isDesktop = breakpoint === "desktop";
  /** Tablet + desktop — sidebar chrome, no bottom tabs. */
  const isWide = !isPhone;

  return {
    width,
    height,
    breakpoint,
    isPhone,
    isTablet,
    isDesktop,
    isWide,
    /** Content column max width on large screens. */
    contentMaxWidth: isDesktop ? 1120 : isTablet ? 840 : width,
    sidebarWidth: isDesktop ? 260 : 220,
  };
}

export { breakpoints };
