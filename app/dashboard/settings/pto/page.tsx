"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function PTOSettings() {
  const [settings, setSettings] = useState({
    ptoEnabled: true,
    accrualRatePerPeriod: 4,
    maxBalance: 120,
    carryoverEnabled: true,
    carryoverLimit: 40,
  });

  useEffect(() => {
    fetch("/api/organization/pto")
      .then((res) => res.json())
      .then((data) => setSettings(data));
  }, []);

  function update(field: string, value: any) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    await fetch("/api/organization/pto", {
      method: "PUT",
      body: JSON.stringify(settings),
      headers: { "Content-Type": "application/json" },
    });

    alert("PTO settings updated!");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">PTO / Accrual Settings</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Enable PTO</label>
          <Switch
            checked={settings.ptoEnabled}
            onCheckedChange={(v) => update("ptoEnabled", v)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Accrual Per Pay Period (Hours)</label>
          <Input
            type="number"
            value={settings.accrualRatePerPeriod}
            onChange={(e) =>
              update("accrualRatePerPeriod", Number(e.target.value))
            }
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Maximum PTO Balance (Hours)</label>
          <Input
            type="number"
            value={settings.maxBalance}
            onChange={(e) => update("maxBalance", Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Enable Carryover</label>
          <Switch
            checked={settings.carryoverEnabled}
            onCheckedChange={(v) => update("carryoverEnabled", v)}
          />
        </div>

        {settings.carryoverEnabled && (
          <div className="space-y-2">
            <label className="text-sm font-semibold">Carryover Limit (Hours)</label>
            <Input
              type="number"
              value={settings.carryoverLimit}
              onChange={(e) => update("carryoverLimit", Number(e.target.value))}
            />
          </div>
        )}
      </div>

      <Button onClick={save}>Save Changes</Button>
    </div>
  );
}
