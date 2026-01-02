"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

/**
 * ----------------------------------------
 * Types
 * ----------------------------------------
 */
type PayPeriodSettings = {
  payPeriodType: "WEEKLY" | "BI_WEEKLY" | "SEMI_MONTHLY" | "MONTHLY";
  weekStartDay: "SUNDAY" | "MONDAY";
  cutoffTime: string; // HH:mm
  anchorDate: string; // YYYY-MM-DD
};

export default function PayPeriodSettingsPage() {
  const [settings, setSettings] = useState<PayPeriodSettings>({
    payPeriodType: "BI_WEEKLY",
    weekStartDay: "MONDAY",
    cutoffTime: "17:00",
    anchorDate: "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${API}/api/organization/pay-period`,
          { credentials: "include" }
        );

        if (!res.ok) return;

        const data = await res.json();
        setSettings(data);
      } catch (err) {
        console.error("Failed to load pay period settings", err);
      }
    }

    load();
  }, []);

  function update<K extends keyof PayPeriodSettings>(
    field: K,
    value: PayPeriodSettings[K]
  ) {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function save() {
    try {
      setSaving(true);

      const res = await fetch(
        `${API}/api/organization/pay-period`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settings),
        }
      );

      if (!res.ok) {
        throw new Error("Save failed");
      }

      alert("Pay period settings updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">
        Pay Period Settings
      </h1>

      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        {/* PAY PERIOD TYPE */}
        <div>
          <label className="text-sm font-semibold">
            Pay Period Type
          </label>

          <Select
            value={settings.payPeriodType}
            onChange={(e) =>
              update(
                "payPeriodType",
                e.target.value as PayPeriodSettings["payPeriodType"]
              )
            }
          >
            <option value="WEEKLY">Weekly</option>
            <option value="BI_WEEKLY">Bi-Weekly</option>
            <option value="SEMI_MONTHLY">Semi-Monthly</option>
            <option value="MONTHLY">Monthly</option>
          </Select>
        </div>

        {/* WEEK START DAY */}
        <div>
          <label className="text-sm font-semibold">
            Week Start Day
          </label>

          <Select
            value={settings.weekStartDay}
            onChange={(e) =>
              update(
                "weekStartDay",
                e.target.value as PayPeriodSettings["weekStartDay"]
              )
            }
          >
            <option value="SUNDAY">Sunday</option>
            <option value="MONDAY">Monday</option>
          </Select>
        </div>

        {/* CUTOFF TIME */}
        <div>
          <label className="text-sm font-semibold">
            Cutoff Time
          </label>

          <Input
            type="time"
            value={settings.cutoffTime}
            onChange={(e) =>
              update("cutoffTime", e.target.value)
            }
          />
        </div>

        {/* ANCHOR DATE */}
        <div>
          <label className="text-sm font-semibold">
            Anchor Date
          </label>

          <Input
            type="date"
            value={settings.anchorDate}
            onChange={(e) =>
              update("anchorDate", e.target.value)
            }
          />
        </div>
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}
