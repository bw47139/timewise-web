"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAuthToken } from "@/components/authToken";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function LocationSettingsPage() {
  const { id } = useParams();

  // We keep types as any to stay simple for now
  const [locationSettings, setLocationSettings] = useState<any>(null);
  const [overtimeSettings, setOvertimeSettings] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"" | "success" | "error">("");

  // ------------------------------------------------------------------
  // LOAD SETTINGS
  // ------------------------------------------------------------------
  async function load(clearMessage = false) {
    try {
      setLoading(true);
      if (clearMessage) {
        setMessage("");
        setMessageType("");
      }

      const token = getAuthToken();
      if (!token) {
        throw new Error("Missing auth token");
      }

      // FIXED: /api/locations/:id instead of /api/location/:id
      const [locRes, otRes] = await Promise.all([
        fetch(`${API}/api/locations/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/locations/${id}/overtime`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!locRes.ok) {
        console.error("Base settings load failed:", await locRes.text());
        throw new Error("Failed to load base settings");
      }
      if (!otRes.ok) {
        console.error("Overtime settings load failed:", await otRes.text());
        throw new Error("Failed to load overtime settings");
      }

      const locJson = await locRes.json();
      const otJson = await otRes.json();

      setLocationSettings(locJson);
      setOvertimeSettings(otJson);
    } catch (err) {
      console.error("LOAD ERROR:", err);
      setMessage("Error loading location settings.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  // Load on page mount
  useEffect(() => {
    load(true);
  }, []);

  // ------------------------------------------------------------------
  // SAVE ALL SETTINGS
  // ------------------------------------------------------------------
  async function saveAll() {
    if (!locationSettings || !overtimeSettings) return;

    try {
      setSaving(true);
      setMessage("");
      setMessageType("");

      const token = getAuthToken();
      if (!token) {
        throw new Error("Missing auth token");
      }

      // 1️⃣ FIXED — Correct PATCH route: /api/locations/:id
      const baseRes = await fetch(`${API}/api/locations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payPeriodType: locationSettings.payPeriodType,
          weekStartDay: locationSettings.weekStartDay,
          cutoffTime: locationSettings.cutoffTime,
          autoLunchEnabled: locationSettings.autoLunchEnabled,
          autoLunchMinutes: locationSettings.autoLunchMinutes,
          autoLunchMinimumShift: locationSettings.autoLunchMinimumShift,
          autoLunchDeductOnce: locationSettings.autoLunchDeductOnce,
          autoLunchIgnoreIfBreak: locationSettings.autoLunchIgnoreIfBreak,
        }),
      });

      if (!baseRes.ok) {
        console.error("Base save failed:", await baseRes.text());
        throw new Error("Failed to save base settings");
      }

      // 2️⃣ Save Overtime (this one was already correct)
      const otRes = await fetch(`${API}/api/locations/${id}/overtime`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(overtimeSettings),
      });

      if (!otRes.ok) {
        console.error("Overtime save failed:", await otRes.text());
        throw new Error("Failed to save overtime settings");
      }

      // Success UI
      setMessage("Settings saved successfully.");
      setMessageType("success");

      // Reload fresh values (keep banner)
      await load(false);
    } catch (err) {
      console.error("SAVE ERROR:", err);
      setMessage("Error saving location settings.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------
  if (loading || !locationSettings || !overtimeSettings) {
    return <p className="p-6">Loading…</p>;
  }

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold mb-2">Location Settings</h1>

      {message && (
        <div
          className={`p-3 rounded mb-4 ${
            messageType === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* PAY-PERIOD + AUTO LUNCH CARD */}
      <section className="bg-white shadow p-4 rounded-xl space-y-4">
        <h2 className="text-lg font-semibold">Pay-Period Settings</h2>

        <label className="block text-sm font-medium">
          Pay Period Type
          <select
            className="border p-2 rounded w-full mt-1"
            value={locationSettings.payPeriodType || "WEEKLY"}
            onChange={(e) =>
              setLocationSettings({
                ...locationSettings,
                payPeriodType: e.target.value,
              })
            }
          >
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Bi-Weekly</option>
            <option value="SEMIMONTHLY">Semi-Monthly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </label>

        <label className="block text-sm font-medium">
          Week Start Day
          <select
            className="border p-2 rounded w-full mt-1"
            value={locationSettings.weekStartDay ?? 1}
            onChange={(e) =>
              setLocationSettings({
                ...locationSettings,
                weekStartDay: Number(e.target.value),
              })
            }
          >
            <option value={1}>Monday</option>
            <option value={2}>Tuesday</option>
            <option value={3}>Wednesday</option>
            <option value={4}>Thursday</option>
            <option value={5}>Friday</option>
            <option value={6}>Saturday</option>
            <option value={0}>Sunday</option>
          </select>
        </label>

        <label className="block text-sm font-medium">
          Daily Payroll Cutoff Time
          <input
            type="time"
            className="border p-2 rounded w-full mt-1"
            value={locationSettings.cutoffTime || "17:00"}
            onChange={(e) =>
              setLocationSettings({
                ...locationSettings,
                cutoffTime: e.target.value,
              })
            }
          />
        </label>

        {/* AUTO LUNCH */}
        <h3 className="text-md font-semibold mt-4">Auto-Lunch</h3>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={locationSettings.autoLunchEnabled}
            onChange={(e) =>
              setLocationSettings({
                ...locationSettings,
                autoLunchEnabled: e.target.checked,
              })
            }
          />
          Enable Auto-Lunch Deduction
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          <label className="block text-sm font-medium">
            Deduct Minutes
            <input
              type="number"
              min={0}
              className="border p-2 rounded w-full mt-1"
              value={locationSettings.autoLunchMinutes}
              onChange={(e) =>
                setLocationSettings({
                  ...locationSettings,
                  autoLunchMinutes: Number(e.target.value),
                })
              }
            />
          </label>

          <label className="block text-sm font-medium">
            Minimum Shift (hrs)
            <input
              type="number"
              min={0}
              className="border p-2 rounded w-full mt-1"
              value={locationSettings.autoLunchMinimumShift}
              onChange={(e) =>
                setLocationSettings({
                  ...locationSettings,
                  autoLunchMinimumShift: Number(e.target.value),
                })
              }
            />
          </label>

          <div className="space-y-2 mt-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={locationSettings.autoLunchDeductOnce}
                onChange={(e) =>
                  setLocationSettings({
                    ...locationSettings,
                    autoLunchDeductOnce: e.target.checked,
                  })
                }
              />
              Deduct only once per shift
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={locationSettings.autoLunchIgnoreIfBreak}
                onChange={(e) =>
                  setLocationSettings({
                    ...locationSettings,
                    autoLunchIgnoreIfBreak: e.target.checked,
                  })
                }
              />
              Skip if unpaid break entered
            </label>
          </div>
        </div>
      </section>

      {/* OVERTIME CARD */}
      <section className="bg-white shadow p-4 rounded-xl space-y-4">
        <h2 className="text-lg font-semibold">Overtime Settings</h2>

        <label className="block text-sm font-medium">
          Overtime Rule
          <select
            className="border p-2 rounded w-full mt-1"
            value={overtimeSettings.overtimeRule}
            onChange={(e) =>
              setOvertimeSettings({
                ...overtimeSettings,
                overtimeRule: e.target.value,
              })
            }
          >
            <option value="DAILY">Daily only</option>
            <option value="WEEKLY">Weekly only</option>
            <option value="BOTH">Daily + Weekly</option>
            <option value="NONE">No overtime</option>
          </select>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={overtimeSettings.overtimeDailyEnabled}
                onChange={(e) =>
                  setOvertimeSettings({
                    ...overtimeSettings,
                    overtimeDailyEnabled: e.target.checked,
                  })
                }
              />
              Enable Daily OT
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={overtimeSettings.doubletimeDailyEnabled}
                onChange={(e) =>
                  setOvertimeSettings({
                    ...overtimeSettings,
                    doubletimeDailyEnabled: e.target.checked,
                  })
                }
              />
              Enable Double-Time
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={overtimeSettings.overtimeWeeklyEnabled}
                onChange={(e) =>
                  setOvertimeSettings({
                    ...overtimeSettings,
                    overtimeWeeklyEnabled: e.target.checked,
                  })
                }
              />
              Enable Weekly OT
            </label>
          </div>

          <label className="block text-sm font-medium">
            Daily OT Threshold (hrs)
            <input
              type="number"
              min={0}
              className="border p-2 rounded w-full mt-1"
              value={overtimeSettings.overtimeDailyThresholdHours}
              onChange={(e) =>
                setOvertimeSettings({
                  ...overtimeSettings,
                  overtimeDailyThresholdHours: Number(e.target.value),
                })
              }
            />
          </label>

          <label className="block text-sm font-medium">
            Weekly OT Threshold (hrs)
            <input
              type="number"
              min={0}
              className="border p-2 rounded w-full mt-1"
              value={overtimeSettings.overtimeWeeklyThresholdHours}
              onChange={(e) =>
                setOvertimeSettings({
                  ...overtimeSettings,
                  overtimeWeeklyThresholdHours: Number(e.target.value),
                })
              }
            />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Double-Time Threshold (hrs)
          <input
            type="number"
            min={0}
            className="border p-2 rounded w-full mt-1"
            value={overtimeSettings.doubletimeDailyThresholdHours}
            onChange={(e) =>
              setOvertimeSettings({
                ...overtimeSettings,
                doubletimeDailyThresholdHours: Number(e.target.value),
              })
            }
          />
        </label>
      </section>

      {/* SAVE BUTTON */}
      <button
        onClick={saveAll}
        disabled={saving}
        className="mt-2 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save All Settings"}
      </button>
    </div>
  );
}
