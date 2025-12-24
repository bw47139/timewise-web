"use client";

import { useEffect, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export type Role = "ADMIN" | "MANAGER" | "SUPERVISOR";

export type AuthUser = {
  userId: number;
  email: string;
  organizationId: number;
  role: Role;
};

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const res = await fetch(`${API}/api/auth/current`, {
          method: "GET",
          credentials: "include", // 🔒 REQUIRED for httpOnly cookie
          headers: {
            Accept: "application/json",
          },
          cache: "no-store", // 🚫 prevent stale auth state
        });

        if (!res.ok) {
          if (!cancelled) setUser(null);
          return;
        }

        const data = await res.json();

        if (!cancelled) {
          setUser(data.user ?? null);
        }
      } catch (error) {
        console.error("❌ useAuthUser failed:", error);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}
