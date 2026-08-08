import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

type HapticKind = "light" | "selection" | "medium" | "success" | "error";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

function ensureAudioReady() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    void ctx.resume().catch(() => undefined);
  }
  return ctx;
}

function playWebClick(kind: HapticKind) {
  const ctx = ensureAudioReady();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const preset: Record<HapticKind, { freq: number; dur: number; peak: number }> = {
    light: { freq: 180, dur: 0.018, peak: 0.045 },
    selection: { freq: 220, dur: 0.022, peak: 0.05 },
    medium: { freq: 160, dur: 0.032, peak: 0.06 },
    success: { freq: 320, dur: 0.05, peak: 0.055 },
    error: { freq: 110, dur: 0.06, peak: 0.07 },
  };
  const { freq, dur, peak } = preset[kind];
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.start(now);
  osc.stop(now + dur + 0.01);
}

export async function hapticLight() {
  if (Platform.OS === "web") {
    playWebClick("light");
    return;
  }
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export async function hapticSuccess() {
  if (Platform.OS === "web") {
    playWebClick("success");
    return;
  }
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export async function hapticError() {
  if (Platform.OS === "web") {
    playWebClick("error");
    return;
  }
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
