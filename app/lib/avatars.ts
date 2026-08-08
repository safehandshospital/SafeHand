/**
 * Curated portrait URLs for registration presets and demo consistency.
 * Cropped square portraits from Unsplash.
 */
export const PROFILE_AVATAR_PRESETS = [
  {
    id: "a1",
    label: "Portrait A",
    url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80",
  },
  {
    id: "a2",
    label: "Portrait B",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
  },
  {
    id: "a3",
    label: "Portrait C",
    url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=256&h=256&q=80",
  },
  {
    id: "a4",
    label: "Portrait D",
    url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&h=256&q=80",
  },
  {
    id: "a5",
    label: "Portrait E",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
  },
  {
    id: "a6",
    label: "Portrait F",
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
  },
] as const;

export function isValidAvatarUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
