"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

/* ======================================================
   ENUMS & CONSTANTS
====================================================== */

enum PayPeriodType {
  WEEKLY = "WEEKLY",
  BIWEEKLY = "BIWEEKLY",
  SEMIMONTHLY = "SEMIMONTHLY",
  MONTHLY = "MONTHLY",
}

const PAY_PERIOD_TYPES = [
  { value: PayPeriodType.WEEKLY, label: "Weekly" },
  { value: PayPeriodType.BIWEEKLY, label: "Bi-Weekly" },
  { value: PayPeriodType.SEMIMONTHLY, label: "Semi-Monthly" },
  { value: PayPeriodType.MONTHLY, label: "Monthly" },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
];

const WEEK_START_DAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

/* ======================================================
   TYPES
====================================================== */

interface Props {
  initialData?: any;
  onSaved?: () => void;
}

interface Industry {
  id: number;
  name: string;
}

/* ======================================================
   COMPONENT
====================================================== */

export default function LocationForm({ initialData, onSaved }: Props) {
  const [industries, setIndustries] = useState<Industry[]>([]);

  const isDefaultLocation = Boolean(initialData?.isDefault);

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    timezone: initialData?.timezone ?? "America/New_York",
    isActive: initialData?.isActive ?? true,

    industryId: initialData?.industryId ?? "",

    payPeriodType:
      initialData?.payPeriodType ?? PayPeriodType.WEEKLY,

    weekStartDay: initialData?.weekStartDay ?? 1,
    biweeklyAnchorDate: initialData?.biweeklyAnchorDate ?? "",
    semiMonthCut1: initialData?.semiMonthCut1 ?? 1,
    semiMonthCut2: initialData?.semiMonthCut2 ?? 16,
    monthlyCutDay: initialData?.monthlyCutDay ?? 1,
    cutoffTime: initialData?.cutoffTime ?? "17:00",
  });

  function update(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /* ======================================================
     AUTO-ADJUST PAYROLL FIELDS
  ====================================================== */
  function handlePayPeriodChange(type: PayPeriodType) {
    setForm((prev) => {
      const base = {
        ...prev,
        payPeriodType: type,
        weekStartDay: 1,
        biweeklyAnchorDate: "",
        semiMonthCut1: 1,
        semiMonthCut2: 16,
        monthlyCutDay: 1,
      };

      switch (type) {
        case PayPeriodType.WEEKLY:
          return { ...base, weekStartDay: prev.weekStartDay ?? 1 };
        case PayPeriodType.BIWEEKLY:
          return {
            ...base,
            biweeklyAnchorDate: prev.biweeklyAnchorDate || "",
          };
        case PayPeriodType.SEMIMONTHLY:
          return { ...base, semiMonthCut1: 1, semiMonthCut2: 16 };
        case PayPeriodType.MONTHLY:
          return { ...base, monthlyCutDay: 1 };
        default:
          return base;
      }
    });
  }

  /* ======================================================
     LOAD INDUSTRIES
  ====================================================== */
  useEffect(() => {
    fetch("/api/industry", { credentials: "include" })
      .then((r) => r.json())
      .then(setIndustries)
      .catch(() => setIndustries([]));
  }, []);

  async function save() {
    const res = await fetch(
      initialData ? `/api/location/${initialData.id}` : "/api/location",
      {
        method: initialData ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          industryId: form.industryId || null,
        }),
        credentials: "include",
      }
    );

    if (!res.ok) {
      alert("Failed to save location");
      return;
    }

    onSaved?.();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold">
        {initialData ? "Edit Location" : "Create Location"}
      </h2>

      {/* Location Name */}
      <div>
        <label className="block text-sm font-medium">Location Name</label>
        <Input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-sm font-medium">Timezone</label>
        <Select
          value={form.timezone}
          onChange={(e) => update("timezone", e.target.value)}
          options={TIMEZONES.map((tz) => ({
            value: tz,
            label: tz,
          }))}
        />
      </div>

      {/* Industry */}
      <div>
        <label className="block text-sm font-medium">Industry</label>
        <Select
          value={String(form.industryId)}
          onChange={(e) =>
            update("industryId", e.target.value ? Number(e.target.value) : "")
          }
          options={[
            { value: "", label: "— Select Industry —" },
            ...industries.map((i) => ({
              value: String(i.id),
              label: i.name,
            })),
          ]}
        />
      </div>

      {/* Active (LOCKED FOR DEFAULT LOCATION) */}
      <div className="flex items-center gap-3">
        <Switch
          checked={form.isActive}
          disabled={isDefaultLocation}
          onCheckedChange={(v) => update("isActive", v)}
        />
        <span>
          Location Active
          {isDefaultLocation && (
            <span className="ml-2 text-xs text-muted-foreground">
              (Default location cannot be disabled)
            </span>
          )}
        </span>
      </div>

      {/* Pay Period Type */}
      <div>
        <label className="block text-sm font-medium">
          Pay Period Type
        </label>
        <Select
          value={form.payPeriodType}
          onChange={(e) =>
            handlePayPeriodChange(e.target.value as PayPeriodType)
          }
          options={PAY_PERIOD_TYPES}
        />
      </div>

      {/* Weekly */}
      {form.payPeriodType === PayPeriodType.WEEKLY && (
        <div>
          <label className="block text-sm font-medium">
            Week Starts On
          </label>
          <Select
            value={String(form.weekStartDay)}
            onChange={(e) =>
              update("weekStartDay", Number(e.target.value))
            }
            options={WEEK_START_DAYS}
          />
        </div>
      )}

      {/* Bi-Weekly */}
      {form.payPeriodType === PayPeriodType.BIWEEKLY && (
        <div>
          <label className="block text-sm font-medium">
            Anchor Date
          </label>
          <Input
            type="date"
            value={form.biweeklyAnchorDate}
            onChange={(e) =>
              update("biweeklyAnchorDate", e.target.value)
            }
          />
        </div>
      )}

      {/* Semi-Monthly */}
      {form.payPeriodType === PayPeriodType.SEMIMONTHLY && (
        <div className="flex gap-4">
          <div>
            <label>Cutoff 1</label>
            <Input
              type="number"
              value={form.semiMonthCut1}
              onChange={(e) =>
                update("semiMonthCut1", Number(e.target.value))
              }
            />
          </div>
          <div>
            <label>Cutoff 2</label>
            <Input
              type="number"
              value={form.semiMonthCut2}
              onChange={(e) =>
                update("semiMonthCut2", Number(e.target.value))
              }
            />
          </div>
        </div>
      )}

      {/* Monthly */}
      {form.payPeriodType === PayPeriodType.MONTHLY && (
        <div>
          <label>Monthly Cut Day</label>
          <Input
            type="number"
            value={form.monthlyCutDay}
            onChange={(e) =>
              update("monthlyCutDay", Number(e.target.value))
            }
          />
        </div>
      )}

      {/* Cutoff Time */}
      <div>
        <label>Daily Cutoff Time</label>
        <Input
          type="time"
          value={form.cutoffTime}
          onChange={(e) =>
            update("cutoffTime", e.target.value)
          }
        />
      </div>

      <Button onClick={save}>
        {initialData ? "Save Changes" : "Create Location"}
      </Button>
    </div>
  );
}
