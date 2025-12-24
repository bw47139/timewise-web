"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const ORG_ID = 1;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    autoLunchEnabled: false,
    autoLunchMinutes: 30,
    autoLunchMinimumShift: 6,
    autoLunchDeductOnce: true,
    autoLunchIgnoreIfBreak: true,
  });

  // -------------------------------------------------------
  // LOAD SETTINGS
  // -------------------------------------------------------
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await api.get(`/organizations/${ORG_ID}/auto-lunch`);
        setSettings(res.data);
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // -------------------------------------------------------
  // SAVE SETTINGS
  // -------------------------------------------------------
  async function saveSettings(e: any) {
    e.preventDefault();

    try {
      setSaving(true);

      await api.put(`/organizations/${ORG_ID}/auto-lunch`, {
        autoLunchEnabled: settings.autoLunchEnabled,
        autoLunchMinutes: Number(settings.autoLunchMinutes),
        autoLunchMinimumShift: Number(settings.autoLunchMinimumShift),
        autoLunchDeductOnce: settings.autoLunchDeductOnce,
        autoLunchIgnoreIfBreak: settings.autoLunchIgnoreIfBreak,
      });

      alert("Settings saved!");
    } catch (err) {
      console.error("Failed to save settings", err);
      alert("Error saving settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">Loading settings...</div>;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Organization Settings</h1>

      <form onSubmit={saveSettings} className="space-y-4">

        {/* Enable Auto-Lunch */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.autoLunchEnabled}
            onChange={(e) =>
              setSettings({ ...settings, autoLunchEnabled: e.target.checked })
            }
          />
          Enable Auto-Lunch Deduction
        </label>

        {/* Lunch Minutes */}
        <div>
          <label>Auto-Lunch Minutes</label>
          <input
            type="number"
            className="border px-3 py-2 w-full"
            value={settings.autoLunchMinutes}
            onChange={(e) =>
              setSettings({ ...settings, autoLunchMinutes: e.target.value })
            }
          />
        </div>

        {/* Minimum Shift Hours */}
        <div>
          <label>Minimum Shift Hours for Auto-Lunch</label>
          <input
            type="number"
            className="border px-3 py-2 w-full"
            value={settings.autoLunchMinimumShift}
            onChange={(e) =>
              setSettings({ ...settings, autoLunchMinimumShift: e.target.value })
            }
          />
        </div>

        {/* Deduct Once */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.autoLunchDeductOnce}
            onChange={(e) =>
              setSettings({ ...settings, autoLunchDeductOnce: e.target.checked })
            }
          />
          Deduct Lunch Only Once Per Shift
        </label>

        {/* Ignore If Break Exists */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.autoLunchIgnoreIfBreak}
            onChange={(e) =>
              setSettings({
                ...settings,
                autoLunchIgnoreIfBreak: e.target.checked,
              })
            }
          />
          Do Not Deduct If Employee Already Took a Break
        </label>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
