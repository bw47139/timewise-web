"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import RequireRole from "@/components/auth/RequireRole";
import { Loader2, Plus, Pencil, Power } from "lucide-react";

/**
 * ⚠️ CANONICAL RULE
 * Frontend MUST call /api/*
 * NEXT_PUBLIC_API_BASE_URL = origin only
 * Next.js rewrites handle backend routing
 */

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
];

const PAY_PERIOD_TYPES = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Bi-Weekly" },
  { value: "SEMIMONTHLY", label: "Semi-Monthly" },
  { value: "MONTHLY", label: "Monthly" },
];

interface Location {
  id: number;
  name: string;
  code?: string | null;
  timezone: string;
  industry?: string | null;
  payPeriodType?: string | null;
  isActive: boolean;
}

export default function LocationsSettingsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);

  const [form, setForm] = useState<Partial<Location>>({
    name: "",
    code: "",
    timezone: "America/New_York",
    industry: "General",
    payPeriodType: "WEEKLY",
    isActive: true,
  });

  /* -------------------------------------------------------
     Load locations
  ------------------------------------------------------- */
  async function loadLocations() {
    setLoading(true);
    try {
      const res = await fetch("/api/location", {
        credentials: "include",
      });

      if (res.status === 401) {
        // 🔒 DO NOT LOG OUT — auth still valid
        console.warn("Unauthorized loading locations");
        return;
      }

      if (!res.ok) throw new Error("Failed to load locations");

      const data = await res.json();
      setLocations(data);
    } catch (err) {
      console.error("Load locations failed:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLocations();
  }, []);

  /* -------------------------------------------------------
     Modal helpers
  ------------------------------------------------------- */
  function openAdd() {
    setEditing(null);
    setForm({
      name: "",
      code: "",
      timezone: "America/New_York",
      industry: "General",
      payPeriodType: "WEEKLY",
      isActive: true,
    });
    setModalOpen(true);
  }

  function openEdit(loc: Location) {
    setEditing(loc);
    setForm({ ...loc });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  /* -------------------------------------------------------
     Save location (PATCH — CANONICAL)
  ------------------------------------------------------- */
  async function saveLocation() {
    if (!form.name || !form.timezone) {
      alert("Location name and timezone are required.");
      return;
    }

    try {
      const res = await fetch(
        editing ? `/api/location/${editing.id}` : "/api/location",
        {
          method: editing ? "PATCH" : "POST", // ✅ FIXED
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        }
      );

      if (res.status === 401) {
        alert("You are not authorized to modify locations.");
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      closeModal();
      loadLocations();
    } catch (err: any) {
      console.error("Save location failed:", err);
      alert(err.message || "Failed to save location");
    }
  }

  /* -------------------------------------------------------
     Enable / Disable location
  ------------------------------------------------------- */
  async function toggleLocation(loc: Location) {
    if (!confirm(`${loc.isActive ? "Disable" : "Enable"} this location?`))
      return;

    try {
      const res = await fetch(`/api/location/${loc.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !loc.isActive }),
      });

      if (res.status === 401) {
        alert("You are not authorized to change status.");
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      loadLocations();
    } catch (err: any) {
      console.error("Toggle location failed:", err);
      alert(err.message || "Failed to update status");
    }
  }

  /* -------------------------------------------------------
     Render
  ------------------------------------------------------- */
  return (
    <RequireAuth>
      <RequireRole allow={["ADMIN"]}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Locations</h1>
              <p className="text-sm text-muted-foreground">
                Manage locations for your organization
              </p>
            </div>

            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Add Location
            </button>
          </div>

          <div className="rounded-xl border bg-card">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading locations…
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Timezone</th>
                    <th className="px-4 py-2 text-left">Pay Period</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc) => (
                    <tr
                      key={loc.id}
                      className={!loc.isActive ? "opacity-50" : ""}
                    >
                      <td className="px-4 py-2 font-medium">{loc.name}</td>
                      <td className="px-4 py-2">{loc.timezone}</td>
                      <td className="px-4 py-2">
                        {loc.payPeriodType || "—"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {loc.isActive ? "Active" : "Disabled"}
                      </td>
                      <td className="px-4 py-2 flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(loc)}
                          className="rounded-md border p-1"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleLocation(loc)}
                          className="rounded-md border p-1"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg rounded-xl bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold">
                {editing ? "Edit Location" : "Add Location"}
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Location Name"
                  value={form.name || ""}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="col-span-2 rounded border px-3 py-2 text-sm"
                />

                <select
                  value={form.timezone}
                  onChange={(e) =>
                    setForm({ ...form, timezone: e.target.value })
                  }
                  className="rounded border px-3 py-2 text-sm"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>

                <select
                  value={form.payPeriodType || "WEEKLY"}
                  onChange={(e) =>
                    setForm({ ...form, payPeriodType: e.target.value })
                  }
                  className="rounded border px-3 py-2 text-sm"
                >
                  {PAY_PERIOD_TYPES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={closeModal}
                  className="rounded border px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={saveLocation}
                  className="rounded bg-primary px-4 py-2 text-primary-foreground"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </RequireRole>
    </RequireAuth>
  );
}
