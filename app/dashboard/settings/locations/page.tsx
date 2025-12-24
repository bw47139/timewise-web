"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import RequireRole from "@/components/auth/RequireRole";
import { Loader2, Plus, Pencil, Power } from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

/* -------------------------------------------------------
   Types
------------------------------------------------------- */

interface Location {
  id: number;
  name: string;
  code?: string | null;
  timezone: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  isActive: boolean;
}

/* -------------------------------------------------------
   Page
------------------------------------------------------- */

export default function LocationsSettingsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);

  const [form, setForm] = useState<Partial<Location>>({
    name: "",
    code: "",
    timezone: "America/New_York",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
  });

  /* -------------------------------------------------------
     Load locations (cookie auth)
  ------------------------------------------------------- */

  async function loadLocations() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/locations`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to load locations");
      }

      setLocations(await res.json());
    } catch (err) {
      console.error(err);
      alert("Failed to load locations");
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
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zip: "",
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
     Save location
  ------------------------------------------------------- */

  async function saveLocation() {
    if (!form.name || !form.timezone) {
      alert("Location name and timezone are required.");
      return;
    }

    try {
      const res = await fetch(
        editing
          ? `${API}/api/locations/${editing.id}`
          : `${API}/api/locations`,
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      closeModal();
      loadLocations();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to save location");
    }
  }

  /* -------------------------------------------------------
     Enable / Disable location (soft)
  ------------------------------------------------------- */

  async function toggleLocation(loc: Location) {
    if (
      !window.confirm(
        `${loc.isActive ? "Disable" : "Enable"} this location?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${API}/api/locations/${loc.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !loc.isActive }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      loadLocations();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update location status");
    }
  }

  /* -------------------------------------------------------
     Render
  ------------------------------------------------------- */

  return (
    <RequireAuth>
      <RequireRole allow={["OWNER", "ADMIN"]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Locations</h1>
              <p className="text-sm text-muted-foreground">
                Manage physical locations for your organization
              </p>
            </div>

            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Location
            </button>
          </div>

          {/* Locations table */}
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
                    <th className="px-4 py-2 text-left">City</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc) => (
                    <tr
                      key={loc.id}
                      className={`border-b last:border-b-0 ${
                        !loc.isActive ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-4 py-2 font-medium">{loc.name}</td>
                      <td className="px-4 py-2">{loc.timezone}</td>
                      <td className="px-4 py-2">
                        {loc.city
                          ? `${loc.city}, ${loc.state ?? ""}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {loc.isActive ? "Active" : "Disabled"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(loc)}
                            className="rounded-md border p-1 hover:bg-muted"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleLocation(loc)}
                            className="rounded-md border p-1 hover:bg-muted"
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {locations.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        No locations created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Add / Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl">
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

                <input
                  placeholder="Code (optional)"
                  value={form.code || ""}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value })
                  }
                  className="rounded border px-3 py-2 text-sm"
                />

                <select
                  value={form.timezone}
                  onChange={(e) =>
                    setForm({ ...form, timezone: e.target.value })
                  }
                  className="rounded border px-3 py-2 text-sm"
                >
                  <option value="America/New_York">
                    America/New_York
                  </option>
                  <option value="America/Chicago">
                    America/Chicago
                  </option>
                  <option value="America/Denver">
                    America/Denver
                  </option>
                  <option value="America/Los_Angeles">
                    America/Los_Angeles
                  </option>
                </select>

                <input
                  placeholder="Address Line 1"
                  value={form.addressLine1 || ""}
                  onChange={(e) =>
                    setForm({ ...form, addressLine1: e.target.value })
                  }
                  className="col-span-2 rounded border px-3 py-2 text-sm"
                />

                <input
                  placeholder="City"
                  value={form.city || ""}
                  onChange={(e) =>
                    setForm({ ...form, city: e.target.value })
                  }
                  className="rounded border px-3 py-2 text-sm"
                />

                <input
                  placeholder="State"
                  value={form.state || ""}
                  onChange={(e) =>
                    setForm({ ...form, state: e.target.value })
                  }
                  className="rounded border px-3 py-2 text-sm"
                />

                <input
                  placeholder="ZIP"
                  value={form.zip || ""}
                  onChange={(e) =>
                    setForm({ ...form, zip: e.target.value })
                  }
                  className="rounded border px-3 py-2 text-sm"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={closeModal}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveLocation}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
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
