"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface SummaryRow {
  employeeId: number;
  employeeName: string;
  regular: number;
  overtime: number;
  doubletime: number;
  missingPunch: boolean;
}

interface TimecardSession {
  in: string;
  out: string | null;
  hours: number;
}

interface TimecardDetailSummary {
  sessions: TimecardSession[];
  regular: number;
  overtime: number;
  doubletime: number;
  missingPunch: boolean;
}

interface EmployeeDetail {
  id: number;
  firstName: string;
  lastName: string;
  [key: string]: any;
}

interface TimecardDetailResponse {
  employee: EmployeeDetail;
  rows: any[];
  summary: TimecardDetailSummary;
}

type SortKey = "employeeName" | "regular" | "overtime" | "doubletime";
type SortDir = "asc" | "desc";

function formatDate(value: string | Date) {
  return dayjs(value).format("MM/DD/YYYY");
}

function formatTime(value: string | Date | null) {
  if (!value) return "--";
  return dayjs(value).format("hh:mm A");
}

export default function TimecardsSummaryPage() {
  const router = useRouter();

  const [locationId, setLocationId] = useState(1);
  const [start, setStart] = useState(
    dayjs().startOf("week").format("YYYY-MM-DD")
  );
  const [end, setEnd] = useState(dayjs().endOf("week").format("YYYY-MM-DD"));
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("employeeName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRow, setDrawerRow] = useState<SummaryRow | null>(null);
  const [detail, setDetail] = useState<TimecardDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const detailSummary = detail?.summary;
  const detailSessions = detailSummary?.sessions ?? [];

  /**
   * --------------------------------------------------
   * Data Loading
   * --------------------------------------------------
   */
  async function loadSummary(opts?: {
    locationId?: number;
    start?: string;
    end?: string;
  }) {
    const loc = opts?.locationId ?? locationId;
    const s = opts?.start ?? start;
    const e = opts?.end ?? end;

    setLoading(true);
    setError(null);

    try {
      const url = `${API}/api/timecard/summary?locationId=${loc}&start=${s}&end=${e}`;

      const res = await fetch(url, {
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("SUMMARY FAILED", body);
        setError(body.error || "Failed to load summary");
        setRows([]);
        return;
      }

      const data = await res.json();

      if (Array.isArray(data)) {
        setRows(data);
      } else {
        setRows([]);
      }
    } catch (err) {
      console.error("LOAD SUMMARY ERROR", err);
      setError("Network error loading summary");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * --------------------------------------------------
   * Presets
   * --------------------------------------------------
   */
  function applyTodayPreset() {
    const today = dayjs().format("YYYY-MM-DD");
    setStart(today);
    setEnd(today);
    loadSummary({ start: today, end: today });
  }

  function applyThisWeekPreset() {
    const s = dayjs().startOf("week").format("YYYY-MM-DD");
    const e = dayjs().endOf("week").format("YYYY-MM-DD");
    setStart(s);
    setEnd(e);
    loadSummary({ start: s, end: e });
  }

  function applyLastWeekPreset() {
    const s = dayjs().subtract(1, "week").startOf("week").format("YYYY-MM-DD");
    const e = dayjs().subtract(1, "week").endOf("week").format("YYYY-MM-DD");
    setStart(s);
    setEnd(e);
    loadSummary({ start: s, end: e });
  }

  async function applyCurrentPayPeriodPreset() {
    try {
      const res = await fetch(
        `${API}/api/payperiod/current-range?locationId=${locationId}`,
        { credentials: "include" }
      );

      if (res.ok) {
        const data = await res.json();
        // Try a couple of common shapes
        const rawStart =
          data.startDate || data.start || data.periodStart || data.start_date;
        const rawEnd =
          data.endDate || data.end || data.periodEnd || data.end_date;

        if (rawStart && rawEnd) {
          const s = dayjs(rawStart).format("YYYY-MM-DD");
          const e = dayjs(rawEnd).format("YYYY-MM-DD");
          setStart(s);
          setEnd(e);
          await loadSummary({ start: s, end: e });
          return;
        }
      }

      console.warn(
        "Current pay period endpoint missing or invalid, falling back to This Week."
      );
      applyThisWeekPreset();
    } catch (err) {
      console.error("Current pay period preset failed", err);
      applyThisWeekPreset();
    }
  }

  /**
   * --------------------------------------------------
   * Sorting & Filtering
   * --------------------------------------------------
   */
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.employeeName.toLowerCase().includes(q));
  }, [rows, search]);

  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;

      if (sortKey === "employeeName") {
        return a.employeeName.localeCompare(b.employeeName) * dir;
      }

      const av = a[sortKey];
      const bv = b[sortKey];
      return (av - bv) * dir;
    });
    return copy;
  }, [filteredRows, sortKey, sortDir]);

  /**
   * --------------------------------------------------
   * Totals (for filtered rows)
   * --------------------------------------------------
   */
  const totals = useMemo(() => {
    return sortedRows.reduce(
      (acc, row) => {
        acc.regular += row.regular;
        acc.overtime += row.overtime;
        acc.doubletime += row.doubletime;
        return acc;
      },
      { regular: 0, overtime: 0, doubletime: 0 }
    );
  }, [sortedRows]);

  /**
   * --------------------------------------------------
   * Drill-down Drawer
   * --------------------------------------------------
   */
  async function openDrilldown(row: SummaryRow) {
    setDrawerRow(row);
    setDrawerOpen(true);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const url = `${API}/api/timecard/detail?employeeId=${row.employeeId}&start=${start}&end=${end}`;
      const res = await fetch(url, { credentials: "include" });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("DETAIL FAILED", body);
        setDetailError(body.error || "Failed to load timecard detail");
        return;
      }

      const data = (await res.json()) as TimecardDetailResponse;
      setDetail(data);
    } catch (err) {
      console.error("DETAIL LOAD ERROR", err);
      setDetailError("Network error loading timecard detail");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setDrawerRow(null);
    setDetail(null);
    setDetailError(null);
  }

  function openEmployeeProfile(row: SummaryRow) {
    router.push(`/dashboard/employees/${row.employeeId}`);
  }

  function openFixMissing(row: SummaryRow) {
    const params = new URLSearchParams({
      employeeId: String(row.employeeId),
      start,
      end,
    });
    router.push(`/dashboard/timecards/fix-missing-punch?${params.toString()}`);
  }

  /**
   * --------------------------------------------------
   * Export CSV (current filtered + sorted rows)
   * --------------------------------------------------
   */
  function exportCsv() {
    if (!sortedRows.length) return;

    const header = [
      "Employee Id",
      "Employee Name",
      "Regular",
      "Overtime",
      "Doubletime",
      "Missing Punch",
    ];

    const lines = [
      header.join(","),
      ...sortedRows.map((r) =>
        [
          r.employeeId,
          `"${r.employeeName.replace(/"/g, '""')}"`,
          r.regular.toFixed(2),
          r.overtime.toFixed(2),
          r.doubletime.toFixed(2),
          r.missingPunch ? "YES" : "NO",
        ].join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const startLabel = formatDate(start);
    const endLabel = formatDate(end);

    link.href = url;
    link.download = `timecards-summary-${startLabel}-to-${endLabel}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function goToPayrollPeriods() {
    router.push("/dashboard/timecards/payperiods");
  }

  /**
   * --------------------------------------------------
   * Render
   * --------------------------------------------------
   */
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Timecards Summary</h1>
          <p className="text-sm text-gray-500">
            Filter by date range and location. Missing punches are highlighted
            for easy cleanup.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => loadSummary()}
            className="px-4 py-2 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={exportCsv}
            className="px-4 py-2 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button
            onClick={goToPayrollPeriods}
            className="px-4 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Go to Payroll Periods
          </button>
        </div>
      </div>

      {/* Totals Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase">
            Regular (filtered employees)
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {totals.regular.toFixed(2)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase">
            Overtime
          </div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">
            {totals.overtime.toFixed(2)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase">
            Doubletime
          </div>
          <div className="mt-1 text-2xl font-semibold text-rose-600">
            {totals.doubletime.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Location ID
            </label>
            <input
              type="number"
              value={locationId}
              onChange={(e) => setLocationId(Number(e.target.value) || 1)}
              className="border border-gray-300 rounded px-3 py-2 w-24 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Start
            </label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              End
            </label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          {/* Presets */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-gray-600">Presets</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={applyTodayPreset}
                className="px-3 py-1 text-xs rounded-full border border-gray-300 bg-white hover:bg-gray-50"
              >
                Today
              </button>
              <button
                onClick={applyThisWeekPreset}
                className="px-3 py-1 text-xs rounded-full border border-gray-300 bg-white hover:bg-gray-50"
              >
                This Week
              </button>
              <button
                onClick={applyLastWeekPreset}
                className="px-3 py-1 text-xs rounded-full border border-gray-300 bg-white hover:bg-gray-50"
              >
                Last Week
              </button>
              <button
                onClick={applyCurrentPayPeriodPreset}
                className="px-3 py-1 text-xs rounded-full border border-indigo-500 text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
              >
                Current Pay Period
              </button>
            </div>
          </div>

          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Search Employee
            </label>
            <input
              type="text"
              placeholder="Type name (e.g. John)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
            />
          </div>

          <button
            onClick={() => loadSummary()}
            className="px-5 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Apply
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600 font-medium">{error}</div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-2 text-left text-xs font-semibold text-gray-600">
                  Employee
                </th>
                <th
                  className="p-2 text-right text-xs font-semibold text-gray-600 cursor-pointer select-none"
                  onClick={() => toggleSort("regular")}
                >
                  Regular{" "}
                  {sortKey === "regular" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="p-2 text-right text-xs font-semibold text-gray-600 cursor-pointer select-none"
                  onClick={() => toggleSort("overtime")}
                >
                  Overtime{" "}
                  {sortKey === "overtime" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="p-2 text-right text-xs font-semibold text-gray-600 cursor-pointer select-none"
                  onClick={() => toggleSort("doubletime")}
                >
                  Doubletime{" "}
                  {sortKey === "doubletime" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="p-2 text-center text-xs font-semibold text-gray-600">
                  Missing
                </th>
                <th className="p-2 text-right text-xs font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedRows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-6 text-center text-gray-500 text-sm"
                  >
                    {loading ? "Loading..." : "No records found."}
                  </td>
                </tr>
              )}

              {sortedRows.map((row, idx) => {
                const baseColor = row.missingPunch
                  ? "bg-red-50"
                  : idx % 2 === 0
                  ? "bg-white"
                  : "bg-gray-50";

                return (
                  <tr
                    key={row.employeeId}
                    className={`border-t border-gray-100 cursor-pointer hover:bg-blue-50 ${baseColor}`}
                    onClick={() => openDrilldown(row)}
                    onDoubleClick={() => openEmployeeProfile(row)}
                  >
                    <td className="p-2">{row.employeeName}</td>
                    <td className="p-2 text-right">
                      {row.regular.toFixed(2)}
                    </td>
                    <td className="p-2 text-right">
                      {row.overtime.toFixed(2)}
                    </td>
                    <td className="p-2 text-right">
                      {row.doubletime.toFixed(2)}
                    </td>
                    <td className="p-2 text-center">
                      {row.missingPunch && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700">
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-right space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDrilldown(row);
                        }}
                        className="inline-flex items-center px-2.5 py-1 rounded text-xs border border-gray-300 bg-white hover:bg-gray-50"
                      >
                        View
                      </button>
                      {row.missingPunch && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openFixMissing(row);
                          }}
                          className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-amber-500 text-white hover:bg-amber-600"
                        >
                          Fix Missing
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totals bottom row */}
            {sortedRows.length > 0 && (
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td className="p-2 text-right text-xs font-semibold text-gray-700">
                    Totals:
                  </td>
                  <td className="p-2 text-right text-xs font-semibold text-gray-700">
                    {totals.regular.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-xs font-semibold text-gray-700">
                    {totals.overtime.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-xs font-semibold text-gray-700">
                    {totals.doubletime.toFixed(2)}
                  </td>
                  <td className="p-2" />
                  <td className="p-2" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      {/* Drill-down Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/30"
            onClick={closeDrawer}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="w-full max-w-xl bg-yellow-50 shadow-xl border-l border-yellow-200 flex flex-col">
            <div className="px-4 py-3 border-b border-yellow-200 bg-yellow-100 sticky top-0 z-10 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase text-gray-400">
                  Mini Timesheet
                </div>
                <div className="font-semibold text-gray-800">
                  {drawerRow?.employeeName || "Employee"}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(start)} – {formatDate(end)}
                </div>
              </div>

              <button
                onClick={closeDrawer}
                className="rounded-full w-8 h-8 flex items-center justify-center border border-gray-300 hover:bg-gray-100 text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="px-4 py-3 border-b border-yellow-200 bg-yellow-50 grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-gray-500 uppercase font-semibold">
                  Regular
                </div>
                <div className="text-lg font-semibold">
                  {detailSummary ? detailSummary.regular.toFixed(2) : "--"}
                </div>
              </div>
              <div>
                <div className="text-gray-500 uppercase font-semibold">
                  Overtime
                </div>
                <div className="text-lg font-semibold text-amber-600">
                  {detailSummary ? detailSummary.overtime.toFixed(2) : "--"}
                </div>
              </div>
              <div>
                <div className="text-gray-500 uppercase font-semibold">
                  Doubletime
                </div>
                <div className="text-lg font-semibold text-rose-600">
                  {detailSummary ? detailSummary.doubletime.toFixed(2) : "--"}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 bg-yellow-50">
              {detailLoading && (
                <div className="text-center text-gray-500 text-sm mt-6">
                  Loading timesheet…
                </div>
              )}

              {detailError && (
                <div className="text-center text-red-600 text-sm mt-6">
                  {detailError}
                </div>
              )}

              {!detailLoading &&
                !detailError &&
                detailSessions.length === 0 && (
                  <div className="text-center text-gray-500 text-sm mt-6">
                    No sessions in this range.
                  </div>
                )}

              {!detailLoading && !detailError && detailSessions.length > 0 && (
                <table className="w-full text-xs">
                  <thead className="border-b border-yellow-200 bg-yellow-100">
                    <tr>
                      <th className="p-2 text-left font-semibold text-gray-600">
                        Date
                      </th>
                      <th className="p-2 text-left font-semibold text-gray-600">
                        In
                      </th>
                      <th className="p-2 text-left font-semibold text-gray-600">
                        Out
                      </th>
                      <th className="p-2 text-right font-semibold text-gray-600">
                        Hours
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailSessions.map((s, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-gray-100 ${
                          !s.out ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="p-2">{s.in ? formatDate(s.in) : "--"}</td>
                        <td className="p-2">{formatTime(s.in)}</td>
                        <td className="p-2">{formatTime(s.out)}</td>
                        <td className="p-2 text-right">
                          {s.out ? s.hours.toFixed(2) : "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-4 py-3 border-t border-yellow-200 bg-yellow-100 flex flex-col md:flex-row md:justify-between md:items-center gap-2 text-xs">
              <div className="text-gray-500">
                Click a row to view details. Rows with missing punches are
                highlighted.
              </div>
              {drawerRow && (
                <div className="flex items-center gap-2">
                  {detailSummary?.missingPunch && (
                    <button
                      onClick={() => openFixMissing(drawerRow)}
                      className="px-3 py-1 rounded bg-amber-500 text-white hover:bg-amber-600"
                    >
                      Fix Missing Punch
                    </button>
                  )}
                  <button
                    onClick={() => openEmployeeProfile(drawerRow)}
                    className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Open Full Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
