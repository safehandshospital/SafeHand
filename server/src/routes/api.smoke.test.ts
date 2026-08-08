import { describe, expect, it } from "vitest";

const API = process.env.API_URL || "http://localhost:4100";

describe("API smoke (requires running server)", () => {
  it("health check", async () => {
    const res = await fetch(`${API}/health`);
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("login and list departments", async () => {
    const login = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "patient@example.com",
        password: "password123",
      }),
    });
    expect(login.ok).toBe(true);
    const { token } = await login.json();
    const deps = await fetch(`${API}/api/departments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deps.ok).toBe(true);
    const body = await deps.json();
    expect(body.departments.length).toBeGreaterThan(0);
  });
});
