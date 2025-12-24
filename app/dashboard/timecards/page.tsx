"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface SummaryRow {
  employeeId: number;
  employeeName: string;
  employeeNumber?: string | number;
  totalTime?: number;
  totalWages?: number;
  regular: number;
  overtime: number;
  doubletime: number;
  missingPunch: boolean;
  approved?: boolean;
  departmentName?: string | null;
  /** Optional status from API: ACTIVE, INACTIVE, TERMINATED, etc. */
  status?: string | null;
}

interface DailySession {
  date: string; // YYYY-MM-DD

  in1: string | null;
  out1: string | null;
  in2: string | null;
  out2: string | null;

  in1Id: number | null;
  out1Id: number | null;
  in2Id: number | null;
  out2Id: number | null;

  /** Hours for just this row's pair(s) */
  totalHours: number;

  /** Total hours for the whole date (all pairs) – only used on the first row for that date */
  dateTotalHours?: number;

  /** True for the first row for a given date */
  isFirstRowForDate?: boolean;

  shiftName?: string | null;
  departmentName?: string | null;
  hasException: boolean;
}

interface DetailState {
  employee: any | null;
  sessions: DailySession[];
  rawRows: any[];
}

type PresetKey = "this-week" | "last-week" | "this-period";
type EditField = "in1" | "out1" | "in2" | "out2";

interface EditModalState {
  open: boolean;
  sessionIndex: number | null;
  field: EditField | null;
}

/** NEW: which punch cell is “selected” for keyboard Delete */
interface SelectedPunchCell {
  sessionIndex: number;
  field: EditField;
}

type EmployeeFilter = "ALL" | "ACTIVE" | "INACTIVE" | "TERMINATED";

/* -------------------------------------------------------------
   Formatting helpers
------------------------------------------------------------- */

function formatCurrency(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return "$0.00";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatHours(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return "0.00";
  return value.toFixed(2);
}

function formatTimeString(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateString(value: string | null | undefined): string {
  if (!value) return "";
  const d = dayjs(value);
  if (!d.isValid()) return value;
  return d.format("MM/DD/YY ddd");
}

function diffHours(startTs: string | null, endTs: string | null): number {
  if (!startTs || !endTs) return 0;
  const start = new Date(startTs).getTime();
  const end = new Date(endTs).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }
  const ms = end - start;
  const hours = ms / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

/**
 * Build ISO timestamp from date (YYYY-MM-DD) + time input ("1:07 PM" or "13:07").
 */
function buildIsoFromDateAndTime(
  dateStr: string,
  timeInput: string
): string | null {
  if (!timeInput) return null;

  let time = timeInput.trim().toUpperCase();
  const ampmMatch = time.match(/\s*(AM|PM)$/);
  let ampm: "AM" | "PM" | null = null;

  if (ampmMatch) {
    ampm = ampmMatch[1] as "AM" | "PM";
    time = time.replace(/\s*(AM|PM)$/, "");
  }

  const parts = time.split(":");
  if (parts.length < 1 || parts.length > 2) return null;

  let hour = parseInt(parts[0], 10);
  let minute = parts.length === 2 ? parseInt(parts[1], 10) : 0;

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  if (ampm) {
    if (hour === 12) {
      hour = ampm === "AM" ? 0 : 12;
    } else if (ampm === "PM") {
      hour += 12;
    }
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const hh = hour.toString().padStart(2, "0");
  const mm = minute.toString().padStart(2, "0");

  return `${dateStr}T${hh}:${mm}:00`;
}

/**
 * Build per-day sessions with up to 2 IN/OUT pairs per row.
 * If there are more than 2 pairs on a date, extra pairs become
 * additional rows for that same date (3rd+4th → next row, etc.).
 *
 * Supports:
 *  1) rows with { in, out, hours }
 *  2) raw punches with { id, type: "IN"|"OUT", timestamp }
 */
function buildDailySessions(raw: any[]): DailySession[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const first = raw[0] ?? {};
  const hasInOut = "in" in first || "out" in first;
  const hasTypeTimestamp = "type" in first && "timestamp" in first;

  type Pair = {
    in: string | null;
    out: string | null;
    inId: number | null;
    outId: number | null;
    hours: number;
    rawIn: any | null;
    rawOut: any | null;
  };

  const perDayPairs: Record<string, Pair[]> = {};

  if (hasInOut && !hasTypeTimestamp) {
    // Already aggregated sessions, no IDs
    raw.forEach((r) => {
      const inTs =
        r.in ||
        r.start ||
        r.inTime ||
        r.clockIn ||
        r.timestamp ||
        r.punchedAt ||
        null;
      const outTs =
        r.out ||
        r.end ||
        r.outTime ||
        r.clockOut ||
        r.timestampOut ||
        null;
      const dateSource = inTs || outTs;
      if (!dateSource) return;

      const dateKey = dayjs(dateSource).format("YYYY-MM-DD");
      if (!perDayPairs[dateKey]) perDayPairs[dateKey] = [];

      const hours =
        typeof r.hours === "number" ? r.hours : diffHours(inTs, outTs);

      perDayPairs[dateKey].push({
        in: inTs,
        out: outTs,
        inId: null,
        outId: null,
        hours,
        rawIn: r,
        rawOut: r,
      });
    });
  } else if (hasTypeTimestamp) {
    // Raw punches: IN/OUT events with ids that need pairing
    const byDate: Record<string, any[]> = {};

    raw.forEach((p) => {
      const ts = p.timestamp || p.time || p.punchedAt;
      if (!ts) return;
      const dateKey = dayjs(ts).format("YYYY-MM-DD");
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(p);
    });

    Object.entries(byDate).forEach(([dateKey, punches]) => {
      punches.sort(
        (a: any, b: any) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      let currentIn: { ts: string; id: number | null; raw: any } | null = null;
      perDayPairs[dateKey] = [];

      punches.forEach((p: any) => {
        const ts: string = p.timestamp;
        const type: string = p.type;
        const id: number | null =
          typeof p.id === "number" ? p.id : p.punchId ?? null;

        if (type === "IN") {
          if (!currentIn) {
            currentIn = { ts, id, raw: p };
          } else {
            // Two INs in a row -> previous IN missing OUT
            perDayPairs[dateKey].push({
              in: currentIn.ts,
              out: null,
              inId: currentIn.id,
              outId: null,
              hours: 0,
              rawIn: currentIn.raw,
              rawOut: null,
            });
            currentIn = { ts, id, raw: p };
          }
        } else if (type === "OUT") {
          if (currentIn) {
            const hours = diffHours(currentIn.ts, ts);
            perDayPairs[dateKey].push({
              in: currentIn.ts,
              out: ts,
              inId: currentIn.id,
              outId: id,
              hours,
              rawIn: currentIn.raw,
              rawOut: p,
            });
            currentIn = null;
          } else {
            // OUT with no preceding IN
            perDayPairs[dateKey].push({
              in: null,
              out: ts,
              inId: null,
              outId: id,
              hours: 0,
              rawIn: null,
              rawOut: p,
            });
          }
        }
      });

      if (currentIn) {
        // trailing IN with no OUT
        perDayPairs[dateKey].push({
          in: currentIn.ts,
          out: null,
          inId: currentIn.id,
          outId: null,
          hours: 0,
          rawIn: currentIn.raw,
          rawOut: null,
        });
      }
    });
  } else {
    // Fallback: treat each row as a single pair, no IDs
    raw.forEach((r) => {
      const inTs =
        r.in ||
        r.start ||
        r.inTime ||
        r.clockIn ||
        r.timestamp ||
        r.punchedAt ||
        null;
      const outTs =
        r.out ||
        r.end ||
        r.outTime ||
        r.clockOut ||
        r.timestampOut ||
        null;
      const dateSource = inTs || outTs;
      if (!dateSource) return;
      const dateKey = dayjs(dateSource).format("YYYY-MM-DD");
      if (!perDayPairs[dateKey]) perDayPairs[dateKey] = [];
      const hours =
        typeof r.hours === "number" ? r.hours : diffHours(inTs, outTs);

      perDayPairs[dateKey].push({
        in: inTs,
        out: outTs,
        inId: null,
        outId: null,
        hours,
        rawIn: r,
        rawOut: r,
      });
    });
  }

  const dateKeys = Object.keys(perDayPairs).sort();

  const sessions: DailySession[] = [];

  // For each date, chunk pairs into groups of 2 → multiple rows per date if needed
  dateKeys.forEach((dateKey) => {
    const pairs = perDayPairs[dateKey].sort((a, b) => {
      const aTs = a.in || a.out;
      const bTs = b.in || b.out;
      return new Date(aTs ?? 0).getTime() - new Date(bTs ?? 0).getTime();
    });

    const dateTotalHours = pairs.reduce(
      (sum, p) => sum + (typeof p.hours === "number" ? p.hours : 0),
      0
    );

    const hasException = pairs.some(
      (p) => !p.out || (!p.in && p.out) // either open punch or orphan OUT
    );

    const sampleRaw = pairs[0]?.rawIn ?? pairs[0]?.rawOut ?? null;

    for (let i = 0; i < pairs.length; i += 2) {
      const p1 = pairs[i];
      const p2 = pairs[i + 1];

      const rowHours =
        (p1?.hours ?? 0) + (p2?.hours ?? 0);

      sessions.push({
        date: dateKey,

        in1: p1?.in ?? null,
        out1: p1?.out ?? null,
        in2: p2?.in ?? null,
        out2: p2?.out ?? null,

        in1Id: p1?.inId ?? null,
        out1Id: p1?.outId ?? null,
        in2Id: p2?.inId ?? null,
        out2Id: p2?.outId ?? null,

        totalHours: rowHours,
        dateTotalHours,
        shiftName: sampleRaw?.shiftName ?? sampleRaw?.shift ?? null,
        departmentName: sampleRaw?.departmentName ?? null,
        hasException,
        isFirstRowForDate: i === 0,
      });
    }
  });

  return sessions;
}

/* -------------------------------------------------------------
   Component
------------------------------------------------------------- */

export default function TimecardsSummaryPage() {
  const router = useRouter();

  const [locationId, setLocationId] = useState<number>(1);

  const [start, setStart] = useState<string>(
    dayjs().startOf("week").format("YYYY-MM-DD")
  );
  const [end, setEnd] = useState<string>(
    dayjs().endOf("week").format("YYYY-MM-DD")
  );

  const [preset, setPreset] = useState<PresetKey>("this-week");

  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [rows, setRows] = useState<SummaryRow[]>([]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    null
  );
  const [selectedSummaryRow, setSelectedSummaryRow] =
    useState<SummaryRow | null>(null);

  const [detail, setDetail] = useState<DetailState>({
    employee: null,
    sessions: [],
    rawRows: [],
  });
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Edit modal state
  const [editModal, setEditModal] = useState<EditModalState>({
    open: false,
    sessionIndex: null,
    field: null,
  });
  const [editTime, setEditTime] = useState<string>("");
  const [editAmPm, setEditAmPm] = useState<"AM" | "PM">("AM"); // NEW
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState<boolean>(false);

  // NEW: currently selected punch cell (for keyboard Delete)
  const [selectedPunch, setSelectedPunch] =
    useState<SelectedPunchCell | null>(null);

  // NEW: employee status filter
  const [employeeFilter, setEmployeeFilter] =
    useState<EmployeeFilter>("ALL");

  const periodLabel = (() => {
    const s = dayjs(start);
    const e = dayjs(end);
    if (!s.isValid() || !e.isValid()) return "";
    return `${s.format("dddd, MMMM DD, YYYY")} thru ${e.format(
      "dddd, MMMM DD, YYYY"
    )}`;
  })();

  function applyPreset(nextPreset: PresetKey) {
    const today = dayjs();
    if (nextPreset === "this-week") {
      const s = today.startOf("week");
      const e = today.endOf("week");
      setStart(s.format("YYYY-MM-DD"));
      setEnd(e.format("YYYY-MM-DD"));
    } else if (nextPreset === "last-week") {
      const lastWeek = today.subtract(1, "week");
      const s = lastWeek.startOf("week");
      const e = lastWeek.endOf("week");
      setStart(s.format("YYYY-MM-DD"));
      setEnd(e.format("YYYY-MM-DD"));
    } else if (nextPreset === "this-period") {
      const s = today.startOf("week");
      const e = today.endOf("week");
      setStart(s.format("YYYY-MM-DD"));
      setEnd(e.format("YYYY-MM-DD"));
    }
    setPreset(nextPreset);
  }

  function shiftPeriod(direction: -1 | 1) {
    const s = dayjs(start);
    const e = dayjs(end);
    if (!s.isValid() || !e.isValid()) return;

    const lengthDays = e.diff(s, "day") + 1;
    const nextStart = s.add(direction * lengthDays, "day");
    const nextEnd = e.add(direction * lengthDays, "day");

    setStart(nextStart.format("YYYY-MM-DD"));
    setEnd(nextEnd.format("YYYY-MM-DD"));
  }

  /* -------------------------------------------------------------
     Load summary (left panel)
  ------------------------------------------------------------- */
  async function loadSummary() {
    try {
      setSummaryLoading(true);
      setSummaryError(null);

      const params = new URLSearchParams({
        locationId: String(locationId),
        start,
        end,
      });

      // 1) Load summary rows for this period
      const res = await fetch(`${API}/api/timecard/summary?${params}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed with status ${res.status}`);
      }

      const data = await res.json();
      const summaryList: SummaryRow[] = Array.isArray(data)
        ? data
        : data.rows || [];

      // 2) Load employees so we can show ACTIVE employees even with 0 punches
      let finalRows: SummaryRow[] = summaryList;
      try {
        const empRes = await fetch(`${API}/api/employee`, {
          credentials: "include",
        });
        if (empRes.ok) {
          const empData = await empRes.json();
          const employees: any[] = Array.isArray(empData)
            ? empData
            : empData.rows || [];

          const employeesById = new Map<number, any>();
          employees.forEach((e: any) => {
            if (typeof e.id === "number") {
              employeesById.set(e.id, e);
            }
          });

          // Map of existing summary rows
          const mergedById = new Map<number, SummaryRow>();
          summaryList.forEach((row) => {
            const emp = employeesById.get(row.employeeId);
            if (emp) {
              const statusRaw =
                emp.status ||
                emp.employeeStatus ||
                emp.employmentStatus ||
                emp.employee_status ||
                null;

              mergedById.set(row.employeeId, {
                ...row,
                status: statusRaw,
                employeeName:
                  row.employeeName ||
                  `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim(),
                departmentName:
                  row.departmentName ??
                  emp.departmentName ??
                  emp.department?.name ??
                  null,
              });
            } else {
              mergedById.set(row.employeeId, row);
            }
          });

          // Add ACTIVE employees that don't have any punches yet
          employees.forEach((emp: any) => {
            const id = emp.id;
            if (typeof id !== "number") return;

            // Optional: limit to same location if employee has locationId
            if (
              typeof emp.locationId === "number" &&
              emp.locationId !== locationId
            ) {
              return;
            }

            const statusRaw =
              emp.status ||
              emp.employeeStatus ||
              emp.employmentStatus ||
              emp.employee_status ||
              "";

            const statusValue = String(statusRaw || "ACTIVE").toUpperCase();
            const isActive =
              !statusValue.includes("INACTIVE") &&
              !statusValue.includes("TERM");

            if (!isActive) {
              // Non-active employees will still be shown if they have punches (already in mergedById)
              return;
            }

            if (!mergedById.has(id)) {
              const name =
                `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() ||
                emp.displayName ||
                `Employee ${id}`;

              mergedById.set(id, {
                employeeId: id,
                employeeName: name,
                employeeNumber:
                  emp.employeeNumber ??
                  emp.badgeNumber ??
                  emp.employeeNo ??
                  undefined,
                totalTime: 0,
                totalWages: 0,
                regular: 0,
                overtime: 0,
                doubletime: 0,
                missingPunch: false,
                approved: false,
                departmentName:
                  emp.departmentName ?? emp.department?.name ?? null,
                status: statusRaw,
              });
            }
          });

          finalRows = Array.from(mergedById.values()).sort((a, b) =>
            (a.employeeName || "").localeCompare(b.employeeName || "")
          );
        }
      } catch (empErr) {
        // If employee fetch fails, just fall back to summary-only rows
        console.warn("Failed to load employees for summary merge", empErr);
      }

      setRows(finalRows);

      if (selectedEmployeeId != null) {
        const found = finalRows.find(
          (r) => r.employeeId === selectedEmployeeId
        );
        if (!found) {
          setSelectedEmployeeId(null);
          setSelectedSummaryRow(null);
          setDetail({ employee: null, sessions: [], rawRows: [] });
          setSelectedPunch(null);
        } else {
          setSelectedSummaryRow(found);
        }
      }
    } catch (err: any) {
      console.error("Failed to load summary", err);
      setSummaryError(
        err?.message || "Failed to load timecard summary for this period."
      );
      setRows([]);
    } finally {
      setSummaryLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, start, end]);

  /* -------------------------------------------------------------
     Load detail (right panel) when a row is selected
  ------------------------------------------------------------- */
  async function loadDetail(employeeId: number) {
    try {
      setDetailLoading(true);
      setDetailError(null);

      const params = new URLSearchParams({
        employeeId: String(employeeId),
        start,
        end,
      });

      const res = await fetch(`${API}/api/timecard/detail?${params}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed with status ${res.status}`);
      }

      const data = await res.json();

      const baseRows =
        (Array.isArray(data.sessions) && data.sessions) ||
        (Array.isArray(data.rows) && data.rows) ||
        (Array.isArray(data.punches) && data.punches) ||
        [];

      const daily = buildDailySessions(baseRows);

      setDetail({
        employee: data.employee ?? null,
        sessions: daily,
        rawRows: baseRows,
      });

      // clear selected punch when employee or range changes
      setSelectedPunch(null);
    } catch (err: any) {
      console.error("Failed to load detail", err);
      setDetailError(
        err?.message || "Failed to load detailed timecard for this employee."
      );
      setDetail({ employee: null, sessions: [], rawRows: [] });
      setSelectedPunch(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function handleSelectRow(row: SummaryRow) {
    setSelectedEmployeeId(row.employeeId);
    setSelectedSummaryRow(row);
    setSelectedPunch(null);
    loadDetail(row.employeeId);
  }

  function handleRowDoubleClick(row: SummaryRow) {
    router.push(`/dashboard/employees/${row.employeeId}`);
  }

  const activeEmployeeName =
    selectedSummaryRow?.employeeName ||
    (detail.employee &&
      `${detail.employee.firstName ?? ""} ${
        detail.employee.lastName ?? ""
      }`.trim()) ||
    "";

  /* -------------------------------------------------------------
     Filtered rows + counts
  ------------------------------------------------------------- */

  const filteredRows: SummaryRow[] = rows.filter((row) => {
    if (employeeFilter === "ALL") return true;

    const raw: any = row as any;
    const statusRaw =
      raw.status ||
      raw.employeeStatus ||
      raw.employmentStatus ||
      raw.employee_status ||
      "";
    const statusValue = String(statusRaw).toUpperCase();

    if (!statusValue) {
      // If no status and filter is ACTIVE, treat as active; otherwise hide.
      return employeeFilter === "ACTIVE";
    }

    if (employeeFilter === "ACTIVE") {
      return (
        !statusValue.includes("INACTIVE") &&
        !statusValue.includes("TERM") &&
        !statusValue.includes("TERMINATED")
      );
    }
    if (employeeFilter === "INACTIVE") {
      return statusValue.includes("INACTIVE");
    }
    if (employeeFilter === "TERMINATED") {
      return (
        statusValue.includes("TERM") || statusValue.includes("TERMINATED")
      );
    }
    return true;
  });

  const totalEmployees = filteredRows.length;
  const approvedCount = filteredRows.filter((r) => r.approved).length;
  const employeesWithIssues = filteredRows.filter(
    (r) => r.missingPunch
  ).length;

  /* -------------------------------------------------------------
     Edit + Delete helpers
  ------------------------------------------------------------- */

  function getPunchIdForField(
    session: DailySession,
    field: EditField
  ): number | null {
    switch (field) {
      case "in1":
        return session.in1Id;
      case "out1":
        return session.out1Id;
      case "in2":
        return session.in2Id;
      case "out2":
        return session.out2Id;
      default:
        return null;
    }
  }

  function openEditModal(index: number, field: EditField) {
    const session = detail.sessions[index];
    if (!session) return;

    // mark this cell as selected for keyboard Delete
    setSelectedPunch({ sessionIndex: index, field });

    // prefill existing time if present
    let existingTime: string | null = null;
    if (field === "in1" && session.in1) existingTime = session.in1;
    if (field === "out1" && session.out1) existingTime = session.out1;
    if (field === "in2" && session.in2) existingTime = session.in2;
    if (field === "out2" && session.out2) existingTime = session.out2;

    let displayTime = "";
    let displayAmPm: "AM" | "PM" = "AM";

    if (existingTime) {
      const pretty = formatTimeString(existingTime); // e.g. "01:30 PM"
      const match = pretty.match(/\b(AM|PM)\b/i);
      if (match) {
        displayAmPm = match[1].toUpperCase() as "AM" | "PM";
        displayTime = pretty.replace(/\s*(AM|PM)\s*$/i, "").trim();
      } else {
        displayTime = pretty;
      }
    }

    setEditModal({ open: true, sessionIndex: index, field });
    setEditTime(displayTime);
    setEditAmPm(displayAmPm);
    setEditError(null);
  }

  function closeEditModal() {
    setEditModal({ open: false, sessionIndex: null, field: null });
    setEditTime("");
    setEditError(null);
    // keep selectedPunch so user can still hit Delete for that cell if desired
  }

  async function handleSaveEdit() {
    if (
      !editModal.open ||
      editModal.sessionIndex == null ||
      !editModal.field
    ) {
      return;
    }

    const session = detail.sessions[editModal.sessionIndex];
    if (!session) return;

    const employeeId = detail.employee?.id || selectedEmployeeId;
    if (!employeeId) {
      setEditError("Missing employee id.");
      return;
    }

    const locId = detail.employee?.locationId || locationId;

    const combinedTime = editTime ? `${editTime} ${editAmPm}` : "";
    const iso = buildIsoFromDateAndTime(session.date, combinedTime);
    if (!iso) {
      setEditError("Enter a valid time like 1:30 with AM/PM selected.");
      return;
    }

    const field = editModal.field;
    const isIn = field === "in1" || field === "in2";
    const type = isIn ? "IN" : "OUT";

    // pick existing punch id for this field
    const existingId = getPunchIdForField(session, field);

    setEditSaving(true);
    setEditError(null);

    try {
      if (existingId != null) {
        // EDIT existing punch
        const res = await fetch(`${API}/api/punches/edit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            punchId: existingId,
            timestamp: iso,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Failed with status ${res.status}`);
        }
      } else {
        // ADD new punch
        const res = await fetch(`${API}/api/punches/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            employeeId,
            locationId: locId,
            type,
            timestamp: iso,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Failed with status ${res.status}`);
        }
      }

      await loadDetail(employeeId);
      await loadSummary();
      closeEditModal();
    } catch (err: any) {
      console.error("Failed to save punch", err);
      setEditError(err?.message || "Failed to save punch.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteSelectedPunch() {
    if (!selectedPunch) {
      alert("No punch cell selected to delete.");
      return;
    }

    const session = detail.sessions[selectedPunch.sessionIndex];
    if (!session) {
      alert("Unable to find selected day.");
      return;
    }

    const punchId = getPunchIdForField(session, selectedPunch.field);
    if (!punchId) {
      alert("This cell does not have a punch to delete.");
      return;
    }

    if (!window.confirm("Delete this punch?")) return;

    try {
      const res = await fetch(`${API}/api/punches/${punchId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed with status ${res.status}`);
      }

      const employeeId = detail.employee?.id || selectedEmployeeId;
      if (employeeId) {
        await loadDetail(employeeId);
      }
      await loadSummary();
      setSelectedPunch(null);
      closeEditModal();
    } catch (err: any) {
      console.error("Failed to delete punch", err);
      alert(err?.message || "Failed to delete punch.");
    }
  }

  const editFieldLabel: Record<EditField, string> = {
    in1: "In",
    out1: "Out",
    in2: "In 2",
    out2: "Out 2",
  };

  const currentEditingSession =
    editModal.open && editModal.sessionIndex != null
      ? detail.sessions[editModal.sessionIndex]
      : null;

  // Keyboard Delete / Backspace support for selected punch
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedPunch) {
          e.preventDefault();
          handleDeleteSelectedPunch();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPunch, detail.sessions, selectedEmployeeId, start, end, locationId]);

  /* -------------------------------------------------------------
     Week running totals for detail grid
     (only increment once per date, on the first row for that date)
  ------------------------------------------------------------- */

  const sessionsWithWeekTotals = (() => {
    const weekAcc: Record<string, number> = {};
    return detail.sessions.map((session) => {
      const weekKey = dayjs(session.date)
        .startOf("week")
        .format("YYYY-MM-DD");

      const prev = weekAcc[weekKey] ?? 0;
      const increment =
        session.isFirstRowForDate
          ? session.dateTotalHours ?? session.totalHours ?? 0
          : 0;
      const next = prev + increment;
      weekAcc[weekKey] = next;

      return { session, weekRunningTotal: next };
    });
  })();

  return (
    <>
      <div className="flex h-full flex-col gap-4">
        {/* ----------------------------------------------------------
            Header / Toolbar
           ---------------------------------------------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Timecards Overview
            </h1>
            <p className="text-sm text-muted-foreground">
              Review hours, exceptions, and approvals for this pay period.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Pay period navigation */}
            <div className="flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs shadow-sm">
              <button
                type="button"
                onClick={() => shiftPeriod(-1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="mx-2 min-w-[160px] text-center text-[11px] font-medium">
                {periodLabel || "Select pay period"}
              </div>
              <button
                type="button"
                onClick={() => shiftPeriod(1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1 rounded-full border bg-card px-2 py-1 text-[11px] shadow-sm">
              <span className="px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                Range
              </span>
              <button
                type="button"
                onClick={() => applyPreset("this-week")}
                className={`rounded-full px-2 py-1 ${
                  preset === "this-week"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                This week
              </button>
              <button
                type="button"
                onClick={() => applyPreset("last-week")}
                className={`rounded-full px-2 py-1 ${
                  preset === "last-week"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                Last week
              </button>
              <button
                type="button"
                onClick={() => applyPreset("this-period")}
                className={`rounded-full px-2 py-1 ${
                  preset === "this-period"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                This period
              </button>
            </div>

            {/* Raw date inputs */}
            <div className="flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-[11px] shadow-sm">
              <label className="flex items-center gap-1">
                <span className="text-muted-foreground">Start</span>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="rounded border bg-background px-1 py-0.5 text-[11px]"
                />
              </label>
              <span className="px-1 text-muted-foreground">–</span>
              <label className="flex items-center gap-1">
                <span className="text-muted-foreground">End</span>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="rounded border bg-background px-1 py-0.5 text-[11px]"
                />
              </label>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------
            Main two-panel layout
           ---------------------------------------------------------- */}
        <div className="flex min-h-[540px] flex-1 gap-4">
          {/* LEFT: Employees summary */}
          <div className="flex w-[46%] flex-col rounded-2xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <div className="flex flex-col">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Employees
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {totalEmployees} employees · {approvedCount} approved ·{" "}
                  {employeesWithIssues} with exceptions
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Employee status filter dropdown */}
                <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span>Status</span>
                  <select
                    value={employeeFilter}
                    onChange={(e) =>
                      setEmployeeFilter(e.target.value as EmployeeFilter)
                    }
                    className="rounded-full border bg-background px-2 py-1 text-[11px]"
                  >
                    <option value="ALL">All</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </label>
                {summaryLoading && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading…
                  </div>
                )}
              </div>
            </div>

            {summaryError && (
              <div className="border-b border-destructive/40 bg-destructive/5 px-4 py-2 text-[11px] text-destructive">
                {summaryError}
              </div>
            )}

            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-auto">
                <table className="min-w-full border-separate border-spacing-0 text-xs">
                  <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
                    <tr>
                      <th className="w-8 border-b px-2 py-1 text-left text-[11px] font-semibold text-muted-foreground">
                        Appr
                      </th>
                      <th className="border-b px-2 py-1 text-left text-[11px] font-semibold text-muted-foreground">
                        Name
                      </th>
                      <th className="w-16 border-b px-2 py-1 text-right text-[11px] font-semibold text-muted-foreground">
                        #
                      </th>
                      <th className="w-16 border-b px-2 py-1 text-right text-[11px] font-semibold text-muted-foreground">
                        Total
                      </th>
                      <th className="w-20 border-b px-2 py-1 text-right text-[11px] font-semibold text-muted-foreground">
                        Wages
                      </th>
                      <th className="w-16 border-b px-2 py-1 text-right text-[11px] font-semibold text-muted-foreground">
                        Reg
                      </th>
                      <th className="w-16 border-b px-2 py-1 text-right text-[11px] font-semibold text-muted-foreground">
                        OT
                      </th>
                      <th className="w-8 border-b px-2 py-1 text-center text-[11px] font-semibold text-muted-foreground">
                        !
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((row) => {
                      const isSelected = row.employeeId === selectedEmployeeId;
                      const hasIssue = row.missingPunch;
                      const totalHours =
                        (row.regular || 0) +
                        (row.overtime || 0) +
                        (row.doubletime || 0);

                      return (
                        <tr
                          key={row.employeeId}
                          onClick={() => handleSelectRow(row)}
                          onDoubleClick={() => handleRowDoubleClick(row)}
                          className={`cursor-pointer border-b last:border-b-0 transition-colors ${
                            isSelected
                              ? "bg-primary/10 border-l-4 border-l-primary"
                              : "hover:bg-muted/60"
                          }`}
                        >
                          <td className="border-r px-2 py-1 align-middle">
                            <input
                              type="checkbox"
                              checked={!!row.approved}
                              onChange={() => {
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.employeeId === row.employeeId
                                      ? { ...r, approved: !r.approved }
                                      : r
                                  )
                                );
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-3.5 w-3.5 rounded border"
                            />
                          </td>
                          <td className="px-2 py-1 align-middle">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-medium">
                                {row.employeeName}
                              </span>
                              {row.departmentName && (
                                <span className="text-[10px] text-muted-foreground">
                                  {row.departmentName}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1 text-right align-middle text-[11px] text-muted-foreground">
                            {row.employeeNumber ?? ""}
                          </td>
                          <td className="px-2 py-1 text-right align-middle text-[11px]">
                            {formatHours(totalHours)}
                          </td>
                          <td className="px-2 py-1 text-right align-middle text-[11px]">
                            {formatCurrency(row.totalWages ?? 0)}
                          </td>
                          <td className="px-2 py-1 text-right align-middle text-[11px]">
                            {formatHours(row.regular)}
                          </td>
                          <td className="px-2 py-1 text-right align-middle text-[11px]">
                            {formatHours(row.overtime + (row.doubletime || 0))}
                          </td>
                          <td className="px-2 py-1 text-center align-middle">
                            {hasIssue ? (
                              <AlertTriangle className="mx-auto h-3.5 w-3.5 text-amber-500" />
                            ) : row.approved ? (
                              <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-emerald-500" />
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}

                    {!summaryLoading &&
                      filteredRows.length === 0 &&
                      !summaryError && (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-8 text-center text-[11px] text-muted-foreground"
                          >
                            No employees found for this filter and period.
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT: Timecard detail */}
          <div className="flex flex-1 flex-col rounded-2xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <div className="flex flex-col">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Timecard Detail
                </span>
                {activeEmployeeName ? (
                  <span className="text-[11px] font-medium">
                    {activeEmployeeName}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    Select an employee from the left to view their timecard.
                  </span>
                )}
              </div>

              {activeEmployeeName && selectedSummaryRow && (
                <div className="flex flex-col items-end gap-0.5 text-[11px]">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold">
                      {formatHours(
                        (selectedSummaryRow.regular || 0) +
                          (selectedSummaryRow.overtime || 0) +
                          (selectedSummaryRow.doubletime || 0)
                      )}{" "}
                      hrs
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Gross</span>
                    <span className="font-semibold">
                      {formatCurrency(selectedSummaryRow.totalWages ?? 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {detailError && (
              <div className="border-b border-destructive/40 bg-destructive/5 px-4 py-2 text-[11px] text-destructive">
                {detailError}
              </div>
            )}

            <div className="flex-1 overflow-hidden">
              {detailLoading && (
                <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading timecard…
                </div>
              )}

              {!detailLoading && !activeEmployeeName && (
                <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
                  Choose an employee in the summary table to view their daily
                  timecard here.
                </div>
              )}

              {!detailLoading && activeEmployeeName && (
                <div className="flex h-full flex-col">
                  {/* Employee info strip */}
                  <div className="grid grid-cols-3 gap-3 border-b bg-muted/40 px-4 py-2 text-[11px]">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Employee</span>
                      <span className="font-medium">
                        {activeEmployeeName}
                        {detail.employee?.employeeNumber
                          ? ` · #${detail.employee.employeeNumber}`
                          : ""}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Period</span>
                      <span>
                        {dayjs(start).format("MM/DD/YY")} –{" "}
                        {dayjs(end).format("MM/DD/YY")}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      {detail.employee?.hourlyRate && (
                        <>
                          <span className="text-muted-foreground">Rate</span>
                          <span className="font-medium">
                            {formatCurrency(detail.employee.hourlyRate)} / hr
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Timesheet grid */}
                  <div className="flex-1 overflow-auto px-4 py-2">
                    <table className="min-w-full border-separate border-spacing-0 text-[11px]">
                      <thead className="sticky top-0 z-10 bg-card">
                        <tr>
                          <th className="border-b px-2 py-1 text-left font-semibold text-muted-foreground">
                            Date
                          </th>
                          <th className="border-b px-2 py-1 text-center font-semibold text-muted-foreground">
                            In
                          </th>
                          <th className="border-b px-2 py-1 text-center font-semibold text-muted-foreground">
                            Out
                          </th>
                          <th className="border-b px-2 py-1 text-center font-semibold text-muted-foreground">
                            In 2
                          </th>
                          <th className="border-b px-2 py-1 text-center font-semibold text-muted-foreground">
                            Out 2
                          </th>
                          <th className="border-b px-2 py-1 text-right font-semibold text-muted-foreground">
                            Day Total
                          </th>
                          <th className="border-b px-2 py-1 text-right font-semibold text-muted-foreground">
                            Week Total
                          </th>
                          <th className="border-b px-2 py-1 text-left font-semibold text-muted-foreground">
                            Shift
                          </th>
                          <th className="border-b px-2 py-1 text-left font-semibold text-muted-foreground">
                            Dept
                          </th>
                          <th className="border-b px-2 py-1 text-center font-semibold text-muted-foreground">
                            !
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {sessionsWithWeekTotals.length === 0 && (
                          <tr>
                            <td
                              colSpan={10}
                              className="px-3 py-6 text-center text-[11px] text-muted-foreground"
                            >
                              No punches found for this period.
                            </td>
                          </tr>
                        )}

                        {sessionsWithWeekTotals.map(
                          ({ session, weekRunningTotal }, idx) => {
                            const hasException = session.hasException;

                            const isSelectedRow =
                              selectedPunch &&
                              selectedPunch.sessionIndex === idx;

                            const isSelected = (field: EditField) =>
                              selectedPunch &&
                              selectedPunch.sessionIndex === idx &&
                              selectedPunch.field === field;

                            const cellClass = (field: EditField) =>
                              "border-r px-2 py-1 text-center cursor-pointer text-blue-600 hover:underline" +
                              (isSelected(field)
                                ? " bg-blue-50 ring-1 ring-blue-400"
                                : "");

                            return (
                              <tr
                                key={idx}
                                className={`border-b last:border-b-0 ${
                                  hasException ? "bg-amber-50" : ""
                                } ${
                                  isSelectedRow
                                    ? "bg-blue-50/60"
                                    : ""
                                }`}
                              >
                                <td className="whitespace-nowrap border-r px-2 py-1">
                                  {formatDateString(session.date)}
                                </td>

                                {/* In 1 */}
                                <td
                                  className={cellClass("in1")}
                                  onClick={() => openEditModal(idx, "in1")}
                                >
                                  {session.in1
                                    ? formatTimeString(session.in1)
                                    : "Add"}
                                </td>

                                {/* Out 1 */}
                                <td
                                  className={cellClass("out1")}
                                  onClick={() => openEditModal(idx, "out1")}
                                >
                                  {session.out1
                                    ? formatTimeString(session.out1)
                                    : "Add"}
                                </td>

                                {/* In 2 */}
                                <td
                                  className={cellClass("in2")}
                                  onClick={() => openEditModal(idx, "in2")}
                                >
                                  {session.in2
                                    ? formatTimeString(session.in2)
                                    : "Add"}
                                </td>

                                {/* Out 2 */}
                                <td
                                  className={cellClass("out2")}
                                  onClick={() => openEditModal(idx, "out2")}
                                >
                                  {session.out2
                                    ? formatTimeString(session.out2)
                                    : "Add"}
                                </td>

                                {/* Day total – only show once per date (first row) */}
                                <td className="border-r px-2 py-1 text-right">
                                  {session.isFirstRowForDate
                                    ? formatHours(
                                        session.dateTotalHours ??
                                          session.totalHours
                                      )
                                    : ""}
                                </td>

                                {/* Week running total – only moves forward on first row for date */}
                                <td className="border-r px-2 py-1 text-right font-semibold">
                                  {formatHours(weekRunningTotal)}
                                </td>

                                <td className="border-r px-2 py-1">
                                  {session.shiftName || ""}
                                </td>
                                <td className="border-r px-2 py-1">
                                  {session.departmentName || ""}
                                </td>

                                <td className="px-2 py-1 text-center">
                                  {hasException && (
                                    <AlertTriangle className="mx-auto h-3.5 w-3.5 text-amber-500" />
                                  )}
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT PUNCH MODAL */}
      {editModal.open && currentEditingSession && editModal.field && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-[320px] rounded-xl border bg-card p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Edit Punch
                </div>
                <div className="text-[11px]">
                  {formatDateString(currentEditingSession.date)} ·{" "}
                  {editFieldLabel[editModal.field]}
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-full p-1 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground">
                  Time
                </label>
                <div className="flex items-center gap-2">
                  {/* Auto-colon time input */}
                  <input
                    type="text"
                    value={editTime}
                    onChange={(e) => {
                      let v = e.target.value.replace(/[^0-9]/g, "");
                      if (v.length >= 3) {
                        v = v.slice(0, v.length - 2) + ":" + v.slice(-2);
                      }
                      setEditTime(v);
                    }}
                    placeholder="1:30"
                    className="w-full rounded border bg-background px-2 py-1 text-[11px]"
                    maxLength={5}
                  />
                  {/* AM/PM selector */}
                  <select
                    value={editAmPm}
                    onChange={(e) =>
                      setEditAmPm(e.target.value as "AM" | "PM")
                    }
                    className="rounded border bg-background px-2 py-1 text-[11px]"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Type digits like 130 → 1:30, then choose AM or PM.
                </p>
              </div>

              {editError && (
                <div className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                  {editError}
                </div>
              )}

              <div className="flex justify-between gap-2 pt-1">
                {/* Delete button (only if existing punch) */}
                {(() => {
                  if (!editModal.field || editModal.sessionIndex == null) {
                    return null;
                  }
                  const session =
                    detail.sessions[editModal.sessionIndex];
                  if (!session) return null;
                  const punchId = getPunchIdForField(
                    session,
                    editModal.field
                  );
                  if (!punchId) return null;
                  return (
                    <button
                      type="button"
                      onClick={handleDeleteSelectedPunch}
                      className="rounded-full border border-destructive/60 bg-destructive/10 px-3 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/20"
                      disabled={editSaving}
                    >
                      Delete punch (Del key)
                    </button>
                  );
                })()}

                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-full border px-3 py-1 text-[11px] hover:bg-muted"
                    disabled={editSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    disabled={editSaving}
                  >
                    {editSaving && (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    )}
                    Save punch
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
