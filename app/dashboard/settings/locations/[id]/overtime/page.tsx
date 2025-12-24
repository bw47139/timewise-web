"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAuthToken } from "@/components/authToken";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function LocationOvertimePage() {
  const { id } = useParams();

  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const token = getAuthToken();

      const res = await fetch(`${API}/api/locations/${id}/overtime`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error(err);
      setMessage("Failed to load overtime settings.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  // -------------------------------------------
  // SAVE UPDATED SETTINGS
  // -------------------------------------------
  async function save() {
    try {
      setSaving(true);
      setMessage("");

      const token = getAuthToken();

      const res = await fetch(`${API}/api/locations/${id}/overtime`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Save failed");

      setMessage("Successfully saved!");
      setSaving(false);

      load();
    } catch (err) {
      console.error(err);
      setMessage("Error saving settings.");
      setSaving(false);
    }
  }

  if (!settings) return <p className="p-4">Loading…</p>;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Overtime Settings</h1>

      {/* SUCCESS / ERROR MESSAGE */}
      {message && (
        <div
          className={`p-3 mb-4 rounded ${
            message.includes("Success")
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="space-y-8">

        {/* -------------------- DAILY OT -------------------- */}
        <section>
          <h2 className="font-semibold text-lg mb-2">Daily Overtime</h2>

          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={settings.overtimeDailyEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  overtimeDailyEnabled: e.target.checked,
                })
              }
            />
            Enable Daily Overtime
          </label>

          <div>
            <label className="font-medium">Daily OT Threshold (hours):</label>
            <input
              type="number"
              min={0}
              className="border p-2 rounded ml-2"
              value={settings.overtimeDailyThresholdHours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  overtimeDailyThresholdHours: Number(e.target.value),
                })
              }
            />
          </div>
        </section>

        {/* -------------------- DOUBLE-TIME -------------------- */}
        <section>
          <h2 className="font-semibold text-lg mb-2">Double-Time</h2>

          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={settings.doubletimeDailyEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  doubletimeDailyEnabled: e.target.checked,
                })
              }
            />
            Enable Double-Time
          </label>

          <div>
            <label className="font-medium">Double-Time Threshold (hours):</label>
            <input
              type="number"
              min={0}
              className="border p-2 rounded ml-2"
              value={settings.doubletimeDailyThresholdHours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  doubletimeDailyThresholdHours: Number(e.target.value),
                })
              }
            />
          </div>
        </section>

        {/* -------------------- WEEKLY OT -------------------- */}
        <section>
          <h2 className="font-semibold text-lg mb-2">Weekly Overtime</h2>

          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={settings.overtimeWeeklyEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  overtimeWeeklyEnabled: e.target.checked,
                })
              }
            />
            Enable Weekly Overtime
          </label>

          <div>
            <label className="font-medium">Weekly OT Threshold (hours):</label>
            <input
              type="number"
              min={0}
              className="border p-2 rounded ml-2"
              value={settings.overtimeWeeklyThresholdHours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  overtimeWeeklyThresholdHours: Number(e.target.value),
                })
              }
            />
          </div>
        </section>

        {/* -------------------- OVERTIME RULE -------------------- */}
        <section>
          <h2 className="font-semibold text-lg mb-2">Overtime Rule Applied</h2>

          <select
            className="border rounded p-2"
            value={settings.overtimeRule}
            onChange={(e) =>
              setSettings({
                ...settings,
                overtimeRule: e.target.value,
              })
            }
          >
            <option value="DAILY">DAILY</option>
            <option value="WEEKLY">WEEKLY</option>
            <option value="BOTH">BOTH</option>
            <option value="NONE">NONE</option>
          </select>
        </section>
      </div>

      {/* SAVE BUTTON */}
      <button
        onClick={save}
        disabled={saving}
        className="mt-8 px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
