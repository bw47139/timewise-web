"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/components/authToken";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface Activity {
  id: number;
  type: string;
  description: string;
  createdAt: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  } | null;
}

export default function ActivityLogCard({
  employeeId,
}: {
  employeeId: number;
}) {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const token = getAuthToken();

      const res = await fetch(
        `${API}/api/employees/${employeeId}/activity`,
        {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
          credentials: "include",
        }
      );

      if (!res.ok) {
        throw new Error("Failed to load activity");
      }

      setItems(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [employeeId]);

  if (loading) return <p>Loading activity…</p>;
  if (!items.length) return <p>No activity recorded.</p>;

  return (
    <div className="bg-white shadow rounded p-4 space-y-3">
      <h2 className="text-lg font-semibold">Activity Log</h2>

      {items.map((a) => (
        <div
          key={a.id}
          className="border rounded p-3 text-sm"
        >
          <p className="font-medium">{a.type}</p>
          <p className="text-gray-600">
            {a.description}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(a.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
