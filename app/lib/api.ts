import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "web" ? "http://localhost:4100" : "http://localhost:4100");

const TOKEN_KEY = "healthcare.auth.token";

async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null) {
  if (Platform.OS === "web") {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export type ApiUser = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  role: "PATIENT" | "STAFF";
  phone?: string | null;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : data?.error
          ? JSON.stringify(data.error)
          : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  register: (body: {
    email: string;
    password: string;
    fullName: string;
    avatarUrl: string;
    role?: "PATIENT" | "STAFF";
  }) =>
    request<{ user: ApiUser; token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ user: ApiUser; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => request<{ user: ApiUser | null }>("/api/auth/me"),
  departments: () =>
    request<{
      departments: Array<{
        id: string;
        name: string;
        description: string;
        hospital?: {
          id: string;
          name: string;
          description?: string;
          address?: string;
          city?: string;
          phone?: string | null;
          imageUrl?: string | null;
        };
        summary?: string;
        category?: string;
        treatment?: string;
        services?: string[];
        priceRange?: string;
        location?: string;
        wing?: string;
        hours?: string;
        phone?: string | null;
        imageUrl?: string | null;
        openSlots?: number;
        upcomingSlots?: number;
        totalPatients?: number;
        recentAppointments?: Array<{
          id: string;
          status: string;
          startsAt: string;
          patientLabel: string;
          visitLabel: string;
        }>;
        doctors?: Array<{
          id: string;
          fullName: string;
          specialty: string;
          avatarUrl: string;
        }>;
        _count?: {
          timeSlots: number;
          doctors: number;
          appointments?: number;
        };
      }>;
    }>("/api/departments"),
  slots: (departmentId: string) =>
    request<{
      slots: Array<{
        id: string;
        startsAt: string;
        endsAt: string;
        capacity: number;
        bookedCount: number;
        remaining: number;
        available: boolean;
        demandLevel: "LOW" | "MEDIUM" | "HIGH";
        demandScore: number;
        doctor?: {
          id: string;
          fullName: string;
          specialty: string;
          avatarUrl?: string | null;
        } | null;
      }>;
    }>(`/api/slots?departmentId=${encodeURIComponent(departmentId)}`),
  appointments: () =>
    request<{
      appointments: Array<{
        id: string;
        status: string;
        aiRecommended: boolean;
        title?: string | null;
        topic?: string | null;
        purpose?: string | null;
        description?: string | null;
        notes?: string | null;
        department: {
          id: string;
          name: string;
          description?: string;
          imageUrl?: string | null;
          hospital?: {
            id: string;
            name: string;
            city?: string;
          };
        };
        timeSlot: { startsAt: string; endsAt: string };
        doctor?: {
          id: string;
          fullName: string;
          specialty: string;
          avatarUrl?: string | null;
        } | null;
        user?: {
          id: string;
          fullName: string;
          email: string;
          phone?: string | null;
          avatarUrl?: string | null;
        } | null;
        healthFiles?: Array<{
          id: string;
          name: string;
          kind: string;
          sizeLabel?: string | null;
          note?: string | null;
          url?: string | null;
        }>;
      }>;
    }>("/api/appointments"),
  book: (body: {
    timeSlotId: string;
    topic?: string;
    purpose?: string;
    description?: string;
    notes?: string;
    aiRecommended?: boolean;
  }) =>
    request<{ appointment: unknown }>("/api/appointments", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  bookCustom: (body: {
    departmentId: string;
    startsAt: string;
    topic?: string;
    purpose?: string;
    description?: string;
    notes?: string;
  }) =>
    request<{ appointment: unknown }>("/api/appointments/custom", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  cancel: (id: string) =>
    request<{ appointment: unknown }>(`/api/appointments/${id}/cancel`, {
      method: "POST",
      body: "{}",
    }),
  recommendSlots: (body: {
    departmentId: string;
    preference?: string;
  }) =>
    request<{
      source: string;
      summary: string;
      recommendations: Array<{
        slotId: string;
        rank: number;
        demandLevel: string;
        reason: string;
      }>;
    }>("/api/ai/recommend-slots", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  assistant: (body: { message: string; departmentId?: string }) =>
    request<{ source: string; reply: string }>("/api/ai/assistant", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  demandOutlook: (departmentId: string) =>
    request<{
      source: string;
      outlook: string;
      periods: Array<{
        weekday: number;
        hour: number;
        level: string;
        score: number;
        fillRatio: number;
        slotCount: number;
      }>;
      department: { id: string; name: string };
      busyHoursSummary: string;
      busyHours: Array<{
        weekday: number;
        hour: number;
        level: "HIGH" | "MEDIUM" | "LOW";
        confidence: number;
        reason: string;
      }>;
    }>("/api/ai/demand-outlook", {
      method: "POST",
      body: JSON.stringify({ departmentId }),
    }),
  evaluationMetrics: () =>
    request<{ metrics: Record<string, unknown> }>("/api/metrics/evaluation"),
};

export { getToken, API_URL };
