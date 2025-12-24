"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";

export default function PayPeriodSettings() {
  const [settings, setSettings] = useState({
    payPeriodType: "biweekly",
    weekStartDay: "monday",
    cutoffTime: "17:00",
    anchorDate: "",
  });

  useEffect(() => {
    fetch("/api/organization/pay-period")
      .then((res) => res.json())
      .then((data) => setSettings(data));
  }, []);

  function update(field: string, value: string) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    await fetch("/api/organization/pay-period", {
      method: "PUT",
      body: JSON.stringify(settings),
      headers: { "Content-Type": "application/json" },
    });
    alert("Pay period settings updated!");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Pay Period Settings</h1>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold">Pay Period Type</label>
          <Select
            value={settings.payPeriodType}
            onValueChange={(v) => update("payPeriodType", v)}
          >
            <SelectTrigger className="w-full" />
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-Weekly</SelectItem>
              <SelectItem value="semimonthly">Semi-Monthly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-semibold">Week Start Day</label>
          <Select
            value={settings.weekStartDay}
            onValueChange={(v) => update("weekStartDay", v)}
          >
            <SelectTrigger className="w-full" />
            <SelectContent>
              <SelectItem value="sunday">Sunday</SelectItem>
              <SelectItem value="monday">Monday</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-semibold">Cutoff Time</label>
          <Input
            type="time"
            value={settings.cutoffTime}
            onChange={(e) => update("cutoffTime", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Anchor Date</label>
          <Input
            type="date"
            value={settings.anchorDate}
            onChange={(e) => update("anchorDate", e.target.value)}
          />
        </div>
      </div>

      <Button onClick={save}>Save Changes</Button>
    </div>
  );
}
