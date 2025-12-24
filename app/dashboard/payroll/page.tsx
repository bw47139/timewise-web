"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { AlertTriangle } from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

/**
 * TODO: Wire this to the user’s selected location
 * For now we use locationId = 1
 */
const DEFAULT_LOCATION_ID = 1;

type Employee = {
  id: number;
  firstName: string;
  lastName: string;
  number?: string | null;
  department?: string | null;
  locationName?: string | null;
};

type SummaryRow = {
  employeeId: number;
  employeeName: string;
  regular: number;
  overtime: number;
  doubletime: number;
  missingPunch: boolean;
};

type EmployeeRow = SummaryRow & {
  employeeNumber?: string | null;
  department?: string | null;
};

type PayPeriod = {
  id: number;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  status: string;
  label: string;
  locationId: number | null;
  type?: string;
};

type DetailSummary = {
  sessions: { in: string; out: string | null; hours: number }[];
  regular: number;
  overtime: number;
  doubletime: number;
  missingPunch: boolean;
};

type Punch = {
  id: number;
  timestamp: string;
};

type DayRow = {
  dateKey: string; // YYYY-MM-DD
  displayDate: string; // e.g. 10/19/25 Sun
  firstIn: string;
  lastOut: string;
  total: string; // HH:MM
  exception?: string | null;
};

type GroupBy = "none" | "department";

export default function PayrollDashboardPage() {
  const router = useRouter();

  // Layout: resizable left panel
  const [leftWidth, setLeftWidth] = useState(45); // percent
  const [isResizing, setIsResizing] = useState(false);

  // Core data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeRows, setEmployeeRows] = useState<EmployeeRow[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    null
  );

  const [period, setPeriod] = useState<PayPeriod | null>(null);
  const [detailSummary, setDetailSummary] = useState<DetailSummary | null>(
    null
  );
  const [dayRows, setDayRows] = useState<DayRow[]>([]);

  // Filters / grouping
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [missingOnly, setMissingOnly] = useState(false);

  // Loading states & errors
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [periodError, setPeriodError] = useState<string | null>(null);

  // Inline editing – local only (no backend yet)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editIn, setEditIn] = useState("");
  const [editOut, setEditOut] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // ---------------------------------------------------------------------------
  // Resizable left panel events
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isResizing) return;
      const newPercent = (e.clientX / window.innerWidth) * 100;
      const clamped = Math.min(70, Math.max(25, newPercent));
      setLeftWidth(clamped);
    }

    function onMouseUp() {
      setIsResizing(false);
    }

    if (isResizing) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing]);

  // ---------------------------------------------------------------------------
  // Initial load: employees + current pay period
  // ---------------------------------------------------------------------------
  useEffect(() => {
    loadEmployees();
    loadCurrentPeriod();
  }, []);

  async function loadEmployees() {
    try {
      const res = await fetch(`${API}/api/employee`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error("Failed to load employees", err);
    }
  }

  async function loadCurrentPeriod() {
    try {
      setLoadingPeriod(true);
      setPeriodError(null);

      const res = await fetch(
        `${API}/api/payperiod/current?locationId=${DEFAULT_LOCATION_ID}`,
        { credentials: "include" }
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setPeriodError(
          errBody.error ||
            "No current pay period found. Run /api/payperiod/generate."
        );
        setPeriod(null);
        return;
      }

      const data = await res.json();
      const p: PayPeriod = {
        id: data.id,
        start: data.start,
        end: data.end,
        label: data.label,
        status: data.status,
        locationId: data.locationId ?? DEFAULT_LOCATION_ID,
        type: data.type,
      };

      setPeriod(p);
      await loadSummaryForPeriod(p, null);
    } catch (err) {
      console.error("Failed to load current pay period", err);
      setPeriodError("Failed to load current pay period");
    } finally {
      setLoadingPeriod(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Period navigation (next/previous)
  // ---------------------------------------------------------------------------
  async function changePeriod(direction: "next" | "previous") {
    if (!period) return;

    const endpoint = direction === "next" ? "next" : "previous";

    try {
      setLoadingPeriod(true);
      setPeriodError(null);

      const res = await fetch(
        `${API}/api/payperiod/${endpoint}?locationId=${DEFAULT_LOCATION_ID}&start=${period.start}`,
        { credentials: "include" }
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setPeriodError(
          errBody.error || `No ${direction} pay period available`
        );
        return;
      }

      const data = await res.json();
      const newPeriod: PayPeriod = {
        id: data.id,
        start: data.start,
        end: data.end,
        label: data.label,
        status: data.status,
        locationId: period.locationId,
        type: period.type,
      };

      setPeriod(newPeriod);
      await loadSummaryForPeriod(newPeriod, selectedEmployeeId);
    } catch (err) {
      console.error("changePeriod error", err);
      setPeriodError(`Failed to load ${direction} pay period`);
    } finally {
      setLoadingPeriod(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Load summary for a period (left panel)
  // ---------------------------------------------------------------------------
  async function loadSummaryForPeriod(
    payPeriod: PayPeriod,
    employeeIdToKeep: number | null
  ) {
    try {
      setLoadingSummary(true);
      setEmployeeRows([]);
      setDetailSummary(null);
      setDayRows([]);

      const url = `${API}/api/timecard/summary?locationId=${DEFAULT_LOCATION_ID}&start=${payPeriod.start}&end=${payPeriod.end}`;
      const res = await fetch(url, { credentials: "include" });

      if (!res.ok) {
        console.error("Summary load failed", await res.text());
        return;
      }

      const summary: SummaryRow[] = await res.json();

      // Merge with employees data so we can show department & number
      const merged: EmployeeRow[] = summary.map((row) => {
        const emp = employees.find((e) => e.id === row.employeeId);
        return {
          ...row,
          employeeNumber: (emp as any)?.number ?? (emp as any)?.employeeNumber,
          department: emp?.department ?? null,
        };
      });

      setEmployeeRows(merged);

      // Decide which employee to show detail for
      let toSelect: number | null = employeeIdToKeep;
      if (!toSelect || !merged.some((m) => m.employeeId === toSelect)) {
        toSelect = merged.length ? merged[0].employeeId : null;
      }

      setSelectedEmployeeId(toSelect);

      if (toSelect) {
        await loadDetail(toSelect, payPeriod);
      }
    } catch (err) {
      console.error("loadSummaryForPeriod error", err);
    } finally {
      setLoadingSummary(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Load detail for one employee (right panel)
  // ---------------------------------------------------------------------------
  async function loadDetail(employeeId: number, payPeriod: PayPeriod) {
    try {
      setLoadingDetail(true);
      setDetailSummary(null);
      setDayRows([]);

      const url = `${API}/api/timecard/detail?employeeId=${employeeId}&start=${payPeriod.start}&end=${payPeriod.end}`;
      const res = await fetch(url, { credentials: "include" });

      if (!res.ok) {
        console.error("Detail load failed", await res.text());
        return;
      }

      const data = await res.json();
      const summary: DetailSummary = data.summary;
      const punches: Punch[] = data.rows;

      setDetailSummary(summary);
      setDayRows(buildDayRowsFromPunches(punches, summary));
    } catch (err) {
      console.error("loadDetail error", err);
    } finally {
      setLoadingDetail(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Build daily rows from punch list
  // ---------------------------------------------------------------------------
  function buildDayRowsFromPunches(
    punches: Punch[],
    summary: DetailSummary
  ): DayRow[] {
    if (!punches || !punches.length) return [];

    // Group punches by date (based on timestamp)
    const byDate: Record<string, Punch[]> = {};
    for (const p of punches) {
      const key = dayjs(p.timestamp).format("YYYY-MM-DD");
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(p);
    }

    const rows: DayRow[] = [];

    Object.keys(byDate)
      .sort()
      .forEach((key) => {
        const group = byDate[key].sort((a, b) =>
          a.timestamp.localeCompare(b.timestamp)
        );

        let totalMinutes = 0;
        let firstIn: string | null = null;
        let lastOut: string | null = null;
        let missing = false;

        for (let i = 0; i < group.length; i += 2) {
          const inPunch = group[i];
          const outPunch = group[i + 1];

          if (!inPunch || !outPunch) {
            missing = true;
            break;
          }

          if (!firstIn) {
            firstIn = inPunch.timestamp;
          }
          lastOut = outPunch.timestamp;

          const diffMinutes = dayjs(outPunch.timestamp).diff(
            dayjs(inPunch.timestamp),
            "minute"
          );
          totalMinutes += diffMinutes;
        }

        const displayDate = dayjs(key).format("MM/DD/YY ddd");
        const totalStr = formatMinutesAsHHMM(totalMinutes);

        rows.push({
          dateKey: key,
          displayDate,
          firstIn: firstIn ? dayjs(firstIn).format("hh:mm A") : "",
          lastOut: lastOut ? dayjs(lastOut).format("hh:mm A") : "",
          total: totalStr,
          exception: missing
            ? "Missing punch on this day"
            : summary.missingPunch
            ? "Possible missing punch in this period"
            : null,
        });
      });

    return rows;
  }

  function formatMinutesAsHHMM(totalMinutes: number): string {
    if (!totalMinutes || totalMinutes <= 0) return "00:00";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const h = hours.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  // ---------------------------------------------------------------------------
  // Inline editing – local only (no backend yet)
  // ---------------------------------------------------------------------------
  function startEditRow(index: number) {
    const row = dayRows[index];
    setEditingIndex(index);
    setEditIn(row.firstIn);
    setEditOut(row.lastOut);
    setEditNotes(""); // no notes in backend yet
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditIn("");
    setEditOut("");
    setEditNotes("");
  }

  function saveEditRow(index: number) {
    const updated = [...dayRows];
    updated[index] = {
      ...updated[index],
      firstIn: editIn,
      lastOut: editOut,
    };
    setDayRows(updated);
    cancelEdit();
  }

  // ---------------------------------------------------------------------------
  // Employee row click / double-click
  // ---------------------------------------------------------------------------
  async function handleSelectEmployee(id: number) {
    setSelectedEmployeeId(id);
    if (period) {
      await loadDetail(id, period);
    }
  }

  function openProfile(id: number) {
    router.push(`/dashboard/employees/${id}`);
  }

  // ---------------------------------------------------------------------------
  // Filtering & grouping on left panel
  // ---------------------------------------------------------------------------
  const filtered = employeeRows.filter((row) => {
    if (missingOnly && !row.missingPunch) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return row.employeeName.toLowerCase().includes(q);
  });

  const grouped =
    groupBy === "none"
      ? { All: filtered }
      : filtered.reduce<Record<string, EmployeeRow[]>>((acc, row) => {
          const emp = employees.find((e) => e.id === row.employeeId);
          const key =
            groupBy === "department"
              ? emp?.department || "No Department"
              : "Unknown";
          if (!acc[key]) acc[key] = [];
          acc[key].push(row);
          return acc;
        }, {});

  const selectedEmployee = employees.find(
    (e) => e.id === selectedEmployeeId
  );

  // Approximate gross pay using first pay rate if available
  let hourlyRate: number | null = null;
  let estimatedGross: string | null = null;
  if (selectedEmployee && detailSummary) {
    const anyEmp: any = selectedEmployee;
    const payRate = anyEmp.payRates?.[0]?.rate;
    if (typeof payRate === "number") {
      hourlyRate = payRate;
      const reg = detailSummary.regular || 0;
      const ot = detailSummary.overtime || 0;
      const dt = detailSummary.doubletime || 0;
      const gross =
        reg * payRate + ot * payRate * 1.5 + dt * payRate * 2;
      estimatedGross = gross.toFixed(2);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* LEFT PANEL */}
      <div
        className="h-full border-r bg-gray-50 flex flex-col"
        style={{ width: `${leftWidth}%` }}
      >
        <div className="p-3 border-b bg-white shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-lg font-semibold">Employees</h2>
            {period && (
              <span className="text-xs text-gray-500">
                {period.label}
              </span>
            )}
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="w-full p-2 border rounded text-sm"
          />

          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <select
              className="border p-2 rounded text-sm"
              value={groupBy}
              onChange={(e) =>
                setGroupBy(e.target.value as GroupBy)
              }
            >
              <option value="none">No Group</option>
              <option value="department">Group by Dept</option>
            </select>

            <label className="flex items-center gap-1 text-xs text-gray-700">
              <input
                type="checkbox"
                className="accent-blue-600"
                checked={missingOnly}
                onChange={(e) => setMissingOnly(e.target.checked)}
              />
              Show only missing punches
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {Object.entries(grouped).map(([group, list]) => (
            <div key={group}>
              {groupBy !== "none" && (
                <div className="bg-gray-200 px-3 py-1 text-xs font-semibold uppercase text-gray-700">
                  {group}
                </div>
              )}

              <table className="w-full text-sm">
                <tbody>
                  {list.map((row) => {
                    const selected =
                      selectedEmployeeId === row.employeeId;
                    const totalHours =
                      row.regular + row.overtime + row.doubletime;

                    return (
                      <tr
                        key={row.employeeId}
                        onClick={() =>
                          handleSelectEmployee(row.employeeId)
                        }
                        onDoubleClick={() =>
                          openProfile(row.employeeId)
                        }
                        className={`cursor-pointer border-b hover:bg-gray-100 ${
                          selected ? "bg-blue-100" : "bg-white"
                        }`}
                      >
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <span>{row.employeeName}</span>
                            {row.missingPunch && (
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                          {row.department && (
                            <div className="text-xs text-gray-500">
                              {row.department}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-right text-xs text-gray-600">
                          {totalHours.toFixed(2)} hrs
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {!loadingSummary && employeeRows.length === 0 && (
            <div className="p-4 text-sm text-gray-500">
              No timecard activity in this period.
            </div>
          )}
        </div>
      </div>

      {/* Drag handle */}
      <div
        className="w-1 bg-gray-300 hover:bg-blue-400 cursor-col-resize"
        onMouseDown={() => setIsResizing(true)}
      />

      {/* RIGHT PANEL */}
      <div className="flex-1 h-full p-4 overflow-auto bg-white">
        {loadingPeriod && <div>Loading pay period…</div>}
        {periodError && (
          <div className="mb-3 text-sm text-red-600">
            {periodError}
          </div>
        )}

        {!period && !loadingPeriod && (
          <div className="text-gray-500">
            No pay period found. Make sure you have generated
            payroll periods.
          </div>
        )}

        {period && (
          <>
            {/* Header + period navigation */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-xl font-semibold mb-1">
                  {selectedEmployee
                    ? `${selectedEmployee.lastName}, ${selectedEmployee.firstName}`
                    : "Select an employee"}
                </h2>
                <div className="text-sm text-gray-700">
                  {period.label}
                </div>
                {detailSummary && (
                  <div className="mt-1 text-xs text-gray-600">
                    Missing Punches:{" "}
                    {detailSummary.missingPunch ? "Yes" : "No"}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => changePeriod("previous")}
                  className="px-3 py-1.5 border rounded bg-gray-50 hover:bg-gray-100 text-sm"
                >
                  ◀ Previous Period
                </button>
                <button
                  onClick={() => changePeriod("next")}
                  className="px-3 py-1.5 border rounded bg-gray-50 hover:bg-gray-100 text-sm"
                >
                  Next Period ▶
                </button>
              </div>
            </div>

            {loadingDetail && (
              <div className="mb-2 text-sm">Loading timecard…</div>
            )}

            {/* Summary cards */}
            {detailSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                <div className="border rounded p-2 bg-gray-50">
                  <div className="text-xs text-gray-500">
                    Regular Hours
                  </div>
                  <div className="font-semibold">
                    {detailSummary.regular.toFixed(2)}
                  </div>
                </div>
                <div className="border rounded p-2 bg-gray-50">
                  <div className="text-xs text-gray-500">
                    Overtime Hours
                  </div>
                  <div className="font-semibold">
                    {detailSummary.overtime.toFixed(2)}
                  </div>
                </div>
                <div className="border rounded p-2 bg-gray-50">
                  <div className="text-xs text-gray-500">
                    Doubletime Hours
                  </div>
                  <div className="font-semibold">
                    {detailSummary.doubletime.toFixed(2)}
                  </div>
                </div>
                <div className="border rounded p-2 bg-gray-50">
                  <div className="text-xs text-gray-500">
                    Estimated Gross
                  </div>
                  <div className="font-semibold">
                    {estimatedGross && hourlyRate
                      ? `$${estimatedGross} (rate $${hourlyRate.toFixed(
                          2
                        )})`
                      : "—"}
                  </div>
                </div>
              </div>
            )}

            {/* Timesheet grid */}
            {dayRows.length > 0 ? (
              <div className="border border-gray-300 rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border-b border-gray-300 p-1 text-left">
                        Date
                      </th>
                      <th className="border-b border-gray-300 p-1 text-left">
                        In
                      </th>
                      <th className="border-b border-gray-300 p-1 text-left">
                        Out
                      </th>
                      <th className="border-b border-gray-300 p-1 text-right">
                        Day Total
                      </th>
                      <th className="border-b border-gray-300 p-1 text-left">
                        Notes
                      </th>
                      <th className="border-b border-gray-300 p-1 text-center">
                        Ex
                      </th>
                      <th className="border-b border-gray-300 p-1 text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {dayRows.map((day, idx) => {
                      const isEditing = editingIndex === idx;

                      return (
                        <tr
                          key={day.dateKey}
                          className={
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          <td className="border-t border-gray-200 p-1">
                            {day.displayDate}
                          </td>

                          <td className="border-t border-gray-200 p-1">
                            {isEditing ? (
                              <input
                                className="w-full border rounded px-1 py-0.5 text-xs"
                                value={editIn}
                                onChange={(e) =>
                                  setEditIn(e.target.value)
                                }
                              />
                            ) : (
                              day.firstIn
                            )}
                          </td>

                          <td className="border-t border-gray-200 p-1">
                            {isEditing ? (
                              <input
                                className="w-full border rounded px-1 py-0.5 text-xs"
                                value={editOut}
                                onChange={(e) =>
                                  setEditOut(e.target.value)
                                }
                              />
                            ) : (
                              day.lastOut
                            )}
                          </td>

                          <td className="border-t border-gray-200 p-1 text-right">
                            {day.total}
                          </td>

                          <td className="border-t border-gray-200 p-1">
                            {isEditing ? (
                              <input
                                className="w-full border rounded px-1 py-0.5 text-xs"
                                value={editNotes}
                                onChange={(e) =>
                                  setEditNotes(e.target.value)
                                }
                              />
                            ) : (
                              <span className="text-xs text-gray-600">
                                {/* placeholder for future notes */}
                              </span>
                            )}
                          </td>

                          <td className="border-t border-gray-200 p-1 text-center">
                            {day.exception && (
                              <span
                                title={day.exception}
                                className="inline-flex items-center justify-center"
                              >
                                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                              </span>
                            )}
                          </td>

                          <td className="border-t border-gray-200 p-1 text-center">
                            {isEditing ? (
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => saveEditRow(idx)}
                                  className="px-2 py-0.5 text-xs rounded bg-blue-600 text-white"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-2 py-0.5 text-xs rounded bg-gray-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditRow(idx)}
                                className="px-2 py-0.5 text-xs rounded border bg-gray-50 hover:bg-gray-100"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              !loadingDetail && (
                <div className="text-sm text-gray-500">
                  No punches for this employee in this period.
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
