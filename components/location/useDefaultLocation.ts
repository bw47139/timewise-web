"use client";

import { useEffect, useState } from "react";

/**
 * Frontend must ALWAYS use /api/*
 * Next.js rewrites handle backend routing
 */

export function useDefaultLocation() {
  const [locationId, setLocationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function resolveLocation() {
      try {
        // 1️⃣ Load stored location (if any)
        const stored = localStorage.getItem("tw_location_id");
        const storedId =
          stored && !isNaN(Number(stored)) ? Number(stored) : null;

        // 2️⃣ Fetch locations from API
        const res = await fetch("/api/location", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch locations");
        }

        const locations: any[] = await res.json();

        // 3️⃣ Try to reuse stored location IF still active
        if (storedId) {
          const match = locations.find(
            (l) => l.id === storedId && l.isActive !== false
          );

          if (match) {
            if (!cancelled) {
              setLocationId(match.id);
              setLoading(false);
            }
            return;
          }
        }

        // 4️⃣ Fallback to first active location
        const active = locations.find((l) => l.isActive !== false);

        if (!active) {
          if (!cancelled) {
            setLocationId(null);
            setLoading(false);
          }
          return;
        }

        // 5️⃣ Persist & set
        localStorage.setItem("tw_location_id", String(active.id));

        if (!cancelled) {
          setLocationId(active.id);
          setLoading(false);
        }
      } catch (err) {
        console.error("❌ Failed to resolve default location", err);
        if (!cancelled) {
          setLocationId(null);
          setLoading(false);
        }
      }
    }

    resolveLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateLocation(id: number) {
    localStorage.setItem("tw_location_id", String(id));
    setLocationId(id);
  }

  return {
    locationId,
    setLocationId: updateLocation,
    loading,
  };
}
