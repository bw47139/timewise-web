"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

/**
 * --------------------------------------------------
 * Types
 * --------------------------------------------------
 */

export type TimeCardPunch = {
  id: number;
  inTime: string;
  outTime: string | null;
  source?: string | null;
  locationName?: string | null;
};

export type TimeCardDay = {
  date: string;
  punches: TimeCardPunch[];

  regularHours: number;
  overtimeHours: number;
  doubletimeHours: number;
  ptoHours: number;

  approvedByEmployee: boolean;
  approvedBySupervisor: boolean;
};

export type TimeCardWeekSummary = {
  label: string;
  regularHours: number;
  overtimeHours: number;
  doubletimeHours: number;
  ptoHours: number;
  totalHours: number;
};

export type TimeCardSummary = {
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalDoubletimeHours: number;
  totalPtoHours: number;
  totalHours: number;

  weeks: TimeCardWeekSummary[];
};

export type TimeCardAuditEntry = {
  id: number;
  timestamp: string;
  action: "CREATED" | "UPDATED" | "DELETED";
  performedBy: string;
  details: string;
};

export type TimeCardResponse = {
  locked: boolean; // 🔒 NEW
  days: TimeCardDay[];
  summary: TimeCardSummary;
};

type Props = {
  employeeId: number;

  /**
   * Organization pay period type, e.g.:
   * "WEEKLY" | "BIWEEKLY" | "SEMI_MONTHLY" | "MONTHLY"
   * If omitted or unknown, falls back to 14-day window (your old behavior).
   */
  payPeriodType?: string;

  /**
   * 0 = Sunday, 1 = Monday, ... 6 = Saturday
   * Used for WEEKLY / BIWEEKLY alignment.
   * Defaults to 0 (Sunday) if not provided.
   */
  weekStartDay?: number;
};

/** ------------------ Helpers ------------------ **/

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeLabel(v: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHours(h: number) {
  return h.toFixed(2);
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStart(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function getMonthEnd(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + 1, 0); // last day of month
  return d.toISOString().slice(0, 10);
}

function getSemiMonthlyRangeForDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const day = d.getDate();

  if (day <= 15) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month, 15);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  } else {
    const start = new Date(year, month, 16);
    const end = new Date(year, month + 1, 0); // last of month
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }
}

function getWeekAlignedStart(dateStr: string, weekStartDay: number) {
  const d = new Date(dateStr + "T00:00:00");
  const currentDow = d.getDay(); // 0..6, Sunday=0
  const diff = (currentDow - weekStartDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Old behavior: rolling 14-day window ending today
 */
function defaultRange14() {
  const end = todayStr();
  const start = addDays(end, -13);
  return { start, end };
}

/**
 * Compute initial pay period range based on organization payPeriodType.
 * If unknown, falls back to previous 14-day behavior.
 */
function computeInitialRange(payPeriodType?: string, weekStartDay?: number) {
  const today = todayStr();
  const ws = typeof weekStartDay === "number" ? weekStartDay : 0;

  switch (payPeriodType) {
    case "WEEKLY": {
      const start = getWeekAlignedStart(today, ws);
      const end = addDays(start, 6);
      return { start, end };
    }
    case "BIWEEKLY": {
      const start = getWeekAlignedStart(today, ws);
      const end = addDays(start, 13);
      return { start, end };
    }
    case "MONTHLY": {
      return {
        start: getMonthStart(today),
        end: getMonthEnd(today),
      };
    }
    case "SEMI_MONTHLY": {
      return getSemiMonthlyRangeForDate(today);
    }
    default:
      return defaultRange14();
  }
}

/**
 * Shift an existing range according to pay period type.
 * direction: "prev" | "next" | "today"
 */
function shiftRange(
  range: { start: string; end: string },
  direction: "prev" | "next" | "today",
  payPeriodType?: string,
  weekStartDay?: number
): { start: string; end: string } {
  if (direction === "today") {
    return computeInitialRange(payPeriodType, weekStartDay);
  }

  const ws = typeof weekStartDay === "number" ? weekStartDay : 0;

  switch (payPeriodType) {
    case "WEEKLY": {
      const len = 7;
      if (direction === "prev") {
        const newEnd = addDays(range.start, -1);
        const newStart = addDays(newEnd, -(len - 1));
        return { start: newStart, end: newEnd };
      } else {
        const newStart = addDays(range.end, 1);
        const newEnd = addDays(newStart, len - 1);
        return { start: newStart, end: newEnd };
      }
    }

    case "BIWEEKLY": {
      const len = 14;
      if (direction === "prev") {
        const newEnd = addDays(range.start, -1);
        const newStart = addDays(newEnd, -(len - 1));
        return { start: newStart, end: newEnd };
      } else {
        const newStart = addDays(range.end, 1);
        const newEnd = addDays(newStart, len - 1);
        return { start: newStart, end: newEnd };
      }
    }

    case "MONTHLY": {
      const ref = direction === "prev" ? range.start : range.end;
      const d = new Date(ref + "T00:00:00");
      d.setDate(1);
      d.setMonth(d.getMonth() + (direction === "prev" ? -1 : 1));
      const start = d.toISOString().slice(0, 10);
      const end = getMonthEnd(start);
      return { start, end };
    }

    case "SEMI_MONTHLY": {
      const startDate = new Date(range.start + "T00:00:00");
      const day = startDate.getDate();
      const year = startDate.getFullYear();
      const month = startDate.getMonth();

      if (direction === "prev") {
        if (day === 1) {
          // currently 1–15 => previous is 16–end of previous month
          const prevMonth = new Date(year, month - 1, 1);
          const prevYear = prevMonth.getFullYear();
          const prevMon = prevMonth.getMonth();
          const start = new Date(prevYear, prevMon, 16);
          const end = new Date(prevYear, prevMon + 1, 0);
          return {
            start: start.toISOString().slice(0, 10),
            end: end.toISOString().slice(0, 10),
          };
        } else {
          // currently 16–end => previous is 1–15 same month
          const start = new Date(year, month, 1);
          const end = new Date(year, month, 15);
          return {
            start: start.toISOString().slice(0, 10),
            end: end.toISOString().slice(0, 10),
          };
        }
      } else {
        // next
        if (day === 1) {
          // currently 1–15 => next is 16–end same month
          const start = new Date(year, month, 16);
          const end = new Date(year, month + 1, 0);
          return {
            start: start.toISOString().slice(0, 10),
            end: end.toISOString().slice(0, 10),
          };
        } else {
          // currently 16–end => next is 1–15 next month
          const next = new Date(year, month + 1, 1);
          const start = new Date(next.getFullYear(), next.getMonth(), 1);
          const end = new Date(next.getFullYear(), next.getMonth(), 15);
          return {
            start: start.toISOString().slice(0, 10),
            end: end.toISOString().slice(0, 10),
          };
        }
      }
    }

    default: {
      // fallback to old 14-day rolling behavior
      const len = 14;
      if (direction === "prev") {
        const newEnd = addDays(range.start, -1);
        const newStart = addDays(newEnd, -(len - 1));
        return { start: newStart, end: newEnd };
      } else {
        const newStart = addDays(range.end, 1);
        const newEnd = addDays(newStart, len - 1);
        return { start: newStart, end: newEnd };
      }
    }
  }
}

/**
 * ------------------------------
 * Punch Validation
 * ------------------------------
 */

function validatePunchTimes(
  date: string,
  inTime: string,
  outTime: string | null,
  existingPunches: TimeCardPunch[],
  editingPunchId?: number
): string | null {
  if (!date) return "Date is required.";
  if (!inTime) return "IN time is required.";

  const inTs = new Date(inTime);
  if (isNaN(inTs.getTime())) return "Invalid IN time.";

  let outTs: Date | null = null;
  if (outTime) {
    outTs = new Date(outTime);
    if (isNaN(outTs.getTime())) return "Invalid OUT time.";

    if (outTs <= inTs) return "OUT time must be after IN time.";
  }

  const now = new Date();
  if (inTs > now) return "IN time cannot be in the future.";
  if (outTs && outTs > now) return "OUT time cannot be in the future.";

  // Overlap detection
  if (outTs) {
    const newStart = inTs.getTime();
    const newEnd = outTs.getTime();

    for (const p of existingPunches) {
      if (p.id === editingPunchId) continue;
      if (!p.inTime || !p.outTime) continue;

      const pStart = new Date(p.inTime).getTime();
      const pEnd = new Date(p.outTime).getTime();
      if (isNaN(pStart) || isNaN(pEnd)) continue;

      const overlap = newStart < pEnd && pStart < newEnd;
      if (overlap) return "Punch overlaps another punch.";
    }
  }

  return null;
}

/**
 * --------------------------------------------------
 * Employee Time Card Component
 * (Pay-period aware / Option B style)
 * --------------------------------------------------
 */
export default function EmployeeTimeCardTab({
  employeeId,
  payPeriodType,
  weekStartDay,
}: Props) {
  /** ---------------- State ---------------- **/
  const [range, setRange] = useState(() =>
    computeInitialRange(payPeriodType, weekStartDay)
  );
  const { start, end } = range;

  const [data, setData] = useState<TimeCardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing modal
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingPunch, setEditingPunch] = useState<TimeCardPunch | null>(null);
  const [inTime, setInTime] = useState("");
  const [outTime, setOutTime] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Audit modal
  const [auditPunch, setAuditPunch] = useState<TimeCardPunch | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<TimeCardAuditEntry[] | null>(null);

  const hasData = !!data && data.days.length > 0;
  const isLocked = !!data?.locked; // 🔒 NEW

  /** ---------------- Fetch timecard ---------------- **/
  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const url = `${API_BASE}/api/employee/${employeeId}/timecard?startDate=${start}&endDate=${end}`;

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to load timecard");
      }

      const json = (await res.json()) as TimeCardResponse;
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load timecard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, start, end]);

  /** ---------------- Date Navigation ---------------- **/
  function goPrev() {
    setRange((prev) =>
      shiftRange(prev, "prev", payPeriodType, weekStartDay)
    );
  }

  function goNext() {
    setRange((prev) =>
      shiftRange(prev, "next", payPeriodType, weekStartDay)
    );
  }

  function goToday() {
    setRange(shiftRange(range, "today", payPeriodType, weekStartDay));
  }

  /** ---------------- Add/Edit Punch Modal ---------------- **/
  function openAddPunch(day: TimeCardDay) {
    if (isLocked) return; // extra guard, button is disabled anyway
    setEditingDay(day.date);
    setEditingPunch(null);
    setInTime(`${day.date}T09:00:00`);
    setOutTime(`${day.date}T17:00:00`);
    setEditError(null);
  }

  function openEditPunch(day: TimeCardDay, punch: TimeCardPunch) {
    if (isLocked) return;
    setEditingDay(day.date);
    setEditingPunch(punch);
    setInTime(punch.inTime);
    setOutTime(punch.outTime || "");
    setEditError(null);
  }

  function closeEdit() {
    setEditingDay(null);
    setEditingPunch(null);
    setInTime("");
    setOutTime("");
    setSaving(false);
    setDeleting(false);
    setEditError(null);
  }

  const currentDay = useMemo(() => {
    return data?.days.find((d) => d.date === editingDay) || null;
  }, [data, editingDay]);

  /** ---------------- Save Punch ---------------- **/
  async function savePunch() {
    if (!editingDay) return;
    if (isLocked) {
      setEditError("This pay period is locked. Changes are not allowed.");
      return;
    }

    const validation = validatePunchTimes(
      editingDay,
      inTime,
      outTime || null,
      currentDay?.punches || [],
      editingPunch?.id
    );

    if (validation) {
      setEditError(validation);
      return;
    }

    setSaving(true);
    setEditError(null);

    try {
      const body = {
        date: editingDay,
        inTime,
        outTime: outTime || null,
      };

      let url = `${API_BASE}/api/employee/${employeeId}/timecard/punch`;
      let method: "POST" | "PUT" = "POST";

      if (editingPunch) {
        url = `${url}/${editingPunch.id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to save punch");
      }

      closeEdit();
      await loadData();
    } catch (err: any) {
      console.error(err);
      setEditError(err.message || "Failed to save");
      setSaving(false);
    }
  }

  /** ---------------- Delete Punch ---------------- **/
  async function deletePunch() {
    if (!editingPunch) return;
    if (isLocked) {
      setEditError("This pay period is locked. Changes are not allowed.");
      return;
    }

    if (!window.confirm("Delete this punch pair?")) return;

    setDeleting(true);

    try {
      const url = `${API_BASE}/api/employee/${employeeId}/timecard/punch/${editingPunch.id}`;
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete punch");
      }

      closeEdit();
      await loadData();
    } catch (err: any) {
      console.error(err);
      setEditError(err.message || "Failed to delete");
      setDeleting(false);
    }
  }

  /** ---------------- Audit Modal ---------------- **/
  async function openAudit(p: TimeCardPunch) {
    try {
      setAuditPunch(p);
      setAuditLoading(true);
      setAuditLogs(null);

      const url = `${API_BASE}/api/employee/${employeeId}/timecard/punch/${p.id}/audit`;

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to load audit log");

      const payload = (await res.json()) as TimeCardAuditEntry[];
      setAuditLogs(payload);
    } catch (err) {
      console.error(err);
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }

  function closeAudit() {
    setAuditPunch(null);
    setAuditLogs(null);
    setAuditLoading(false);
  }

  /** ---------------- Save Approvals ---------------- **/
  async function saveApprovals() {
    if (!data) return;
    if (data.locked) {
      alert("This pay period is locked. Approvals cannot be changed.");
      return;
    }

    try {
      const payload = {
        days: data.days.map((d) => ({
          date: d.date,
          approvedByEmployee: d.approvedByEmployee,
          approvedBySupervisor: d.approvedBySupervisor,
        })),
      };

      const url = `${API_BASE}/api/employee/${employeeId}/timecard/approvals`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        throw new Error(p.error || "Failed to save approvals");
      }

      alert("Approvals saved.");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to save approvals");
    }
  }

  /** ---------------- Toggle approval ---------------- **/
  function toggleApproval(date: string, type: "employee" | "supervisor") {
    if (!data || isLocked) return;
    const updated = data.days.map((d) => {
      if (d.date !== date) return d;
      if (type === "employee") {
        return { ...d, approvedByEmployee: !d.approvedByEmployee };
      } else {
        return { ...d, approvedBySupervisor: !d.approvedBySupervisor };
      }
    });
    setData({ ...data, days: updated });
  }

  /** ---------------- PDF Download ---------------- **/
  function downloadPdf() {
    const url = `${API_BASE}/api/reports/timesheet?employeeId=${employeeId}&startDate=${start}&endDate=${end}`;
    window.open(url, "_blank");
  }

  /** ---------------- Render UI ---------------- **/
  const periodLabel = (() => {
    if (!payPeriodType) return "Custom date range (14-day default)";
    switch (payPeriodType) {
      case "WEEKLY":
        return "Weekly timesheet (based on org week start)";
      case "BIWEEKLY":
        return "Bi-weekly timesheet (current pay period)";
      case "MONTHLY":
        return "Monthly timesheet (current month)";
      case "SEMI_MONTHLY":
        return "Semi-monthly timesheet (1–15 / 16–end)";
      default:
        return "Timecard (organization pay period)";
    }
  })();

  return (
    <div className="space-y-4">
      {/* Header + Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Time Card</h2>
          <p className="text-sm text-gray-500">{periodLabel}</p>
          <p className="text-[11px] text-gray-400">
            Showing {start} to {end}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={start}
              onChange={(e) =>
                setRange({ start: e.target.value || start, end })
              }
              className="border rounded px-2 py-1 text-sm"
            />
            <span className="text-xs text-gray-500">to</span>
            <input
              type="date"
              value={end}
              onChange={(e) =>
                setRange({ start, end: e.target.value || end })
              }
              className="border rounded px-2 py-1 text-sm"
            />
          </div>

          <button
            className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
            onClick={goPrev}
          >
            ⬅ Prev period
          </button>
          <button
            className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
            onClick={goToday}
          >
            Current period
          </button>
          <button
            className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
            onClick={goNext}
          >
            Next period ➡
          </button>

          <button
            className="px-3 py-1.5 text-xs md:text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={downloadPdf}
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Lock banner */}
      {isLocked && (
        <div className="flex items-start gap-2 rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-xs md:text-sm text-amber-800">
          <span>🔒</span>
          <span>
            This pay period is <span className="font-semibold">locked</span>.
            Punch edits and approvals are disabled.
          </span>
        </div>
      )}

      {/* Summary */}
      {data && (
        <div className="border rounded-lg p-3 bg-gray-50 text-sm flex flex-wrap gap-4">
          <div>
            <div className="font-semibold text-gray-700">Totals</div>
            <div className="flex flex-wrap gap-3 mt-1">
              <div>Reg: {formatHours(data.summary.totalRegularHours)}</div>
              <div>OT: {formatHours(data.summary.totalOvertimeHours)}</div>
              <div>DT: {formatHours(data.summary.totalDoubletimeHours)}</div>
              <div>PTO: {formatHours(data.summary.totalPtoHours)}</div>
              <div className="font-semibold">
                Total: {formatHours(data.summary.totalHours)}
              </div>
            </div>
          </div>

          {data.summary.weeks.length > 0 && (
            <div>
              <div className="font-semibold text-gray-700">Weeks</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {data.summary.weeks.map((wk) => (
                  <div
                    key={wk.label}
                    className="px-2 py-1 rounded border bg-white text-xs"
                  >
                    <div className="text-gray-500">{wk.label}</div>
                    <div>
                      {formatHours(wk.totalHours)} hrs (Reg{" "}
                      {formatHours(wk.regularHours)}, OT{" "}
                      {formatHours(wk.overtimeHours)})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="text-sm text-gray-500">Loading timecard…</div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Days Table (Option B style: per-day totals + punches) */}
      {hasData && (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-gray-100">
              <tr className="text-left">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Punches</th>
                <th className="px-3 py-2 text-right">Reg</th>
                <th className="px-3 py-2 text-right">OT</th>
                <th className="px-3 py-2 text-right">DT</th>
                <th className="px-3 py-2 text-right">PTO</th>
                <th className="px-3 py-2 text-center">Emp</th>
                <th className="px-3 py-2 text-center">Sup</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data!.days.map((day) => (
                <tr key={day.date} className="border-t align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {formatDateLabel(day.date)}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Reg {formatHours(day.regularHours)} • OT{" "}
                      {formatHours(day.overtimeHours)} • DT{" "}
                      {formatHours(day.doubletimeHours)} • PTO{" "}
                      {formatHours(day.ptoHours)}
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    {day.punches.length === 0 && (
                      <div className="text-xs text-gray-400">No punches</div>
                    )}
                    <div className="space-y-1">
                      {day.punches.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between border rounded px-2 py-1 bg-white"
                        >
                          <div>
                            <div className="text-xs">
                              {formatTimeLabel(p.inTime)} –{" "}
                              {formatTimeLabel(p.outTime) || "—"}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {p.source || "CLOCK"}
                              {p.locationName ? ` • ${p.locationName}` : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className={
                                isLocked
                                  ? "text-[11px] text-gray-400 cursor-not-allowed"
                                  : "text-[11px] text-blue-600 hover:underline"
                              }
                              onClick={() => openEditPunch(day, p)}
                              disabled={isLocked}
                            >
                              Edit
                            </button>
                            <button
                              className="text-[11px] text-gray-500 hover:underline"
                              onClick={() => openAudit(p)}
                            >
                              Audit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="px-3 py-2 text-right">
                    {formatHours(day.regularHours)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatHours(day.overtimeHours)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatHours(day.doubletimeHours)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatHours(day.ptoHours)}
                  </td>

                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={day.approvedByEmployee}
                      onChange={() => toggleApproval(day.date, "employee")}
                      disabled={isLocked}
                    />
                  </td>

                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={day.approvedBySupervisor}
                      onChange={() => toggleApproval(day.date, "supervisor")}
                      disabled={isLocked}
                    />
                  </td>

                  <td className="px-3 py-2 text-right">
                    <button
                      className={
                        isLocked
                          ? "px-2 py-1 text-[11px] border rounded bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "px-2 py-1 text-[11px] border rounded hover:bg-gray-50"
                      }
                      onClick={() => openAddPunch(day)}
                      disabled={isLocked}
                    >
                      + Punch
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t px-3 py-2 flex items-center justify-between text-xs bg-gray-50">
            <span>Check approvals above, then click Save Approvals.</span>
            <button
              className={
                isLocked
                  ? "px-3 py-1 border rounded bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "px-3 py-1 border rounded hover:bg-gray-100"
              }
              onClick={saveApprovals}
              disabled={isLocked}
            >
              Save Approvals
            </button>
          </div>
        </div>
      )}

      {!loading && !hasData && !error && (
        <div className="text-sm text-gray-500">
          No entries for this pay period.
        </div>
      )}

      {/* ---------------- Add/Edit Punch Modal ---------------- */}
      {editingDay && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow-lg w-full max-w-md space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold">
                {editingPunch ? "Edit Punch" : "Add Punch"}
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={closeEdit}
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-gray-500">
              {formatDateLabel(editingDay)}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium">
                IN Time
                <input
                  type="datetime-local"
                  value={inTime}
                  onChange={(e) => setInTime(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1 text-sm"
                  disabled={isLocked}
                />
              </label>

              <label className="block text-xs font-medium">
                OUT Time (optional)
                <input
                  type="datetime-local"
                  value={outTime}
                  onChange={(e) => setOutTime(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1 text-sm"
                  disabled={isLocked}
                />
              </label>

              {editError && (
                <div className="text-xs text-red-600">{editError}</div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              {editingPunch && (
                <button
                  className={
                    isLocked
                      ? "px-2 py-1 text-xs border border-red-200 text-red-300 cursor-not-allowed rounded"
                      : "px-2 py-1 text-xs text-red-700 border border-red-300 rounded"
                  }
                  disabled={saving || deleting || isLocked}
                  onClick={deletePunch}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 border rounded text-xs"
                  onClick={closeEdit}
                  disabled={saving || deleting}
                >
                  Cancel
                </button>
                <button
                  className={
                    isLocked
                      ? "px-3 py-1 bg-gray-200 text-gray-400 rounded text-xs cursor-not-allowed"
                      : "px-3 py-1 bg-blue-600 text-white rounded text-xs"
                  }
                  onClick={savePunch}
                  disabled={saving || deleting || isLocked}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Audit Modal ---------------- */}
      {auditPunch && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow-lg w-full max-w-lg space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold">Punch Audit Log</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={closeAudit}
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-gray-600">
              Punch #{auditPunch.id}: {formatTimeLabel(auditPunch.inTime)} –{" "}
              {formatTimeLabel(auditPunch.outTime)}
            </div>

            {auditLoading && (
              <div className="text-xs text-gray-500">Loading...</div>
            )}

            {!auditLoading && auditLogs && auditLogs.length === 0 && (
              <div className="text-xs text-gray-500">
                No audit entries found.
              </div>
            )}

            {!auditLoading && auditLogs && auditLogs.length > 0 && (
              <div className="max-h-64 overflow-auto border rounded bg-gray-50 p-2">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1 text-left">When</th>
                      <th className="px-2 py-1 text-left">Action</th>
                      <th className="px-2 py-1 text-left">By</th>
                      <th className="px-2 py-1 text-left">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-t">
                        <td className="px-2 py-1">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-2 py-1">{log.action}</td>
                        <td className="px-2 py-1">{log.performedBy}</td>
                        <td className="px-2 py-1 whitespace-pre-wrap">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                className="px-3 py-1 border rounded text-xs"
                onClick={closeAudit}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
