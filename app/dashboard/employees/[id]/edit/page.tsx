"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/components/authToken";

interface Location {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email?: string | null;
  pin: string;
  status: "ACTIVE" | "INACTIVE";
  locationId: number;
}

export default function EmployeeEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [emp, setEmp] = useState<Employee | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

  // ---------------------------------------------------
  // LOAD EMPLOYEE + LOCATIONS
  // ---------------------------------------------------
  async function load() {
    try {
      setLoading(true);
      const token = getAuthToken();

      // 1) Load employee
      const empRes = await fetch(`${API_BASE}/api/employees/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!empRes.ok) throw new Error("Failed to load employee");

      const empData = await empRes.json();

      setEmp({
        id: empData.id,
        firstName: empData.firstName,
        lastName: empData.lastName,
        email: empData.email || "",
        pin: empData.pin,
        status: empData.status ?? "ACTIVE",
        locationId: empData.location?.id ?? empData.locationId ?? 0,
      });

      // 2) Load locations
      const locRes = await fetch(`${API_BASE}/api/locations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const locData = await locRes.json();
      setLocations(locData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load employee");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ---------------------------------------------------
  // HANDLE SAVE
  // ---------------------------------------------------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!emp) return;

    try {
      setSaving(true);
      setError(null);

      const token = getAuthToken();

      const body = {
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        pin: emp.pin,
        status: emp.status,
        locationId: emp.locationId,
      };

      const res = await fetch(`${API_BASE}/api/employees/${emp.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to update employee");

      setSuccess("Employee updated successfully.");

      setTimeout(() => {
        router.push(`/dashboard/employees/${emp.id}`);
      }, 600);
    } catch (err: any) {
      setError(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------
  // UPDATE FIELD HELPER
  // ---------------------------------------------------
  function updateField(field: keyof Employee, value: any) {
    setEmp((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  // ---------------------------------------------------
  // UI
  // ---------------------------------------------------
  if (loading) return <p className="p-6 text-gray-500">Loading…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!emp) return <p>Employee not found</p>;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Edit Employee</h1>

        <Link
          href={`/dashboard/employees/${emp.id}`}
          className="px-3 py-2 border rounded-md hover:bg-gray-100"
        >
          ← Back
        </Link>
      </div>

      {success && (
        <p className="p-3 bg-green-100 text-green-700 rounded">{success}</p>
      )}

      {error && (
        <p className="p-3 bg-red-100 text-red-700 rounded">{error}</p>
      )}

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5 bg-white p-6 shadow rounded-xl"
      >
        {/* First / Last Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">First Name</label>
            <input
              type="text"
              value={emp.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Last Name</label>
            <input
              type="text"
              value={emp.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={emp.email || ""}
            onChange={(e) => updateField("email", e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>

        {/* PIN */}
        <div>
          <label className="text-sm font-medium">PIN</label>
          <input
            type="text"
            value={emp.pin}
            onChange={(e) => updateField("pin", e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>

        {/* LOCATION */}
        <div>
          <label className="text-sm font-medium">Location</label>
          <select
            value={emp.locationId}
            onChange={(e) => updateField("locationId", Number(e.target.value))}
            className="mt-1 w-full border rounded px-3 py-2"
          >
            <option value="">Select Location</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* STATUS */}
        <div>
          <label className="text-sm font-medium">Status</label>
          <select
            value={emp.status}
            onChange={(e) =>
              updateField("status", e.target.value as "ACTIVE" | "INACTIVE")
            }
            className="mt-1 w-full border rounded px-3 py-2"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* BUTTONS */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={() => router.push(`/dashboard/employees/${emp.id}`)}
            className="px-5 py-2 border rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
