import { Linking, Platform } from "react-native";

/** Build a maps search URL for a place label. */
export function mapsUrl(query: string): string {
  const q = encodeURIComponent(query.trim());
  if (Platform.OS === "ios") {
    return `http://maps.apple.com/?q=${q}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Normalize a display phone into a tel: target. */
export function telUrl(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

export async function openExternalUrl(url: string): Promise<void> {
  const can = await Linking.canOpenURL(url);
  if (!can) return;
  await Linking.openURL(url);
}

export async function openMaps(query: string): Promise<void> {
  await openExternalUrl(mapsUrl(query));
}

export async function openPhone(phone: string): Promise<void> {
  await openExternalUrl(telUrl(phone));
}
