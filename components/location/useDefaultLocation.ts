"use client";

import { useEffect, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const STORAGE_KEY = "tw_location_id";

export function useDefaultLocation() {
  const [locationId, setLocationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveLocation() {
      // 1️⃣ If already stored, use it
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setLocationId(Number(saved));
        setLoading(false);
        return;
      }

      // 2️⃣ Otherwise fetch locations
      try {
        const res = await fetch(`${API}/api/locations`, {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Failed to load locations");

        const locations = await res.json();

        // Only active locations
        const active = locations.filter((l: any) => l.isActive);

        if (active.length > 0) {
          const defaultId = active[0].id;
          localStorage.setItem(STORAGE_KEY, String(defaultId));
          setLocationId(defaultId);
        }
      } catch (err) {
        console.error("Failed to resolve default location", err);
      } finally {
        setLoading(false);
      }
    }

    resolveLocation();
  }, []);

  function changeLocation(id: number) {
    localStorage.setItem(STORAGE_KEY, String(id));
    setLocationId(id);
  }

  return {
    locationId,
    setLocationId: changeLocation,
    loading,
  };
}
