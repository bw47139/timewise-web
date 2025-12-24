"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type PayrollPeriodStatus = "OPEN" | "APPROVED" | "LOCKED";

type PayrollPeriod = {
  id: number;
  startDate: string;
  endDate: string;
  status: PayrollPeriodStatus;
  approvedAt: string | null;
  approvedByUserId: number | null;
  lockedAt: string | null;
  lockedByUserId: number | null;
  locationId: number;
};

type TimecardSummaryRow = {
  employeeId: number;
  employeeName: string;
  regular: number;
  overtime: number;
  doubletime: number;
  missingPunch: boolean;
};

type Punch = {
  id: number;
  timestamp: string;
  type: "IN" | "OUT";
};

type SortField = "startDate" | "endDate" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

/* ------------------------------------------------------------- */
/* Helpers */
/* ------------------------------------------------------------- */

function formatDate(d: string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString();
}

function formatDateTime(d: string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleString();
}

function StatusBadge({ status }: { status: PayrollPeriodStatus }) {
  let cls =
    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ";
  if (status === "OPEN") {
    cls += "bg-blue-50 text-blue-700 border border-blue-200";
  } else if (status === "APPROVED") {
    cls += "bg-orange-50 text-orange-700 border border-orange-200";
  } else {
    cls += "bg-green-50 text-green-700 border border-green-200";
  }
  return <span className={cls}>{status}</span>;
}

/* ------------------------------------------------------------- */
/* Main Component */
/* ------------------------------------------------------------- */

export default function PayPeriodsPage() {
  const [locationId, setLocationId] = useState(1);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(false);

  const [sortBy, setSortBy] = useState<SortField>("startDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const expandedRef = useRef<HTMLTableRowElement | null>(null);

  const [showPanel, setShowPanel] = useState(false);
  const [panelPeriod, setPanelPeriod] = useState<PayrollPeriod | null>(null);
  const [employeeRows, setEmployeeRows] = useState<TimecardSummaryRow[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);

  const [missingByPeriod, setMissingByPeriod] = useState<
    Record<number, boolean>
  >({});

  const [punchesByEmployee, setPunchesByEmployee] = useState<
    Record<number, Punch[]>
  >({});
  const [punchLoadingFor, setPunchLoadingFor] = useState<number | null>(null);

  /* ------------------------------------------------------------- */
  /* Load periods */
  /* ------------------------------------------------------------- */

  async function load() {
    try {
      setLoading(true);
      setSelectedIds(new Set());
      setExpandedId(null);

      const res = await fetch(`${API}/api/payperiod`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("Failed to load payroll periods:", res.status);
        setPeriods([]);
        return;
      }

      const data = await res.json();
      const rows: PayrollPeriod[] = Array.isArray(data)
        ? data
        : Array.isArray((data as any).periods)
        ? (data as any).periods
        : [];

      const filtered = rows.filter((p) => p.locationId === locationId);
      setPeriods(filtered);
    } catch (err) {
      console.error("Error loading periods:", err);
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------------------------------------- */
  /* Generate periods */
  /* ------------------------------------------------------------- */

  async function generate() {
    const anchor = prompt("Enter anchor date (YYYY-MM-DD)", "2025-01-01");
    if (!anchor) return;

    await fetch(`${API}/api/payperiod/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ locationId, anchorDate: anchor }),
    });

    load();
  }

  /* ------------------------------------------------------------- */
  /* Single-period actions */
  /* ------------------------------------------------------------- */

  async function supervisorApprove(id: number) {
    await fetch(`${API}/api/payperiod/${id}/supervisor-approve`, {
      method: "POST",
      credentials: "include",
    });
    load();
  }

  async function adminLock(id: number) {
    await fetch(`${API}/api/payperiod/${id}/admin-lock`, {
      method: "POST",
      credentials: "include",
    });
    load();
  }

  async function unlock(id: number) {
    await fetch(`${API}/api/payperiod/${id}/unlock`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Unlocked from payroll page" }),
    });
    load();
  }

  /* ------------------------------------------------------------- */
  /* Batch actions */
  /* ------------------------------------------------------------- */

  async function batchSupervisorApprove() {
    if (selectedIds.size === 0) return;

    for (const id of selectedIds) {
      await fetch(`${API}/api/payperiod/${id}/supervisor-approve`, {
        method: "POST",
        credentials: "include",
      });
    }
    load();
  }

  async function batchAdminLock() {
    if (selectedIds.size === 0) return;

    for (const id of selectedIds) {
      await fetch(`${API}/api/payperiod/${id}/admin-lock`, {
        method: "POST",
        credentials: "include",
      });
    }
    load();
  }

  /* ------------------------------------------------------------- */
  /* Load employees for side panel */
  /* ------------------------------------------------------------- */

  async function openPeriodEmployees(period: PayrollPeriod) {
    try {
      setPanelPeriod(period);
      setShowPanel(true);
      setEmployeesLoading(true);
      setEmployeesError(null);

      const res = await fetch(
        `${API}/api/timecard/summary?locationId=${locationId}&start=${period.startDate}&end=${period.endDate}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!res.ok) {
        setEmployeesError(`Failed to load employees (status ${res.status})`);
        setEmployeeRows([]);
        return;
      }

      const data = await res.json();
      const rows: TimecardSummaryRow[] = Array.isArray(data)
        ? data
        : [];

      setEmployeeRows(rows);

      const hasMissing = rows.some((r) => r.missingPunch);
      setMissingByPeriod((prev) => ({ ...prev, [period.id]: hasMissing }));
    } catch (err) {
      console.error("Failed to load employees:", err);
      setEmployeesError("Failed to load employees.");
      setEmployeeRows([]);
    } finally {
      setEmployeesLoading(false);
    }
  }
  function closePanel() {
    setShowPanel(false);
    setPanelPeriod(null);
    setEmployeeRows([]);
    setPunchesByEmployee({});
    setPunchLoadingFor(null);
  }

  /* ------------------------------------------------------------- */
  /* Load punches for a single employee */
  /* ------------------------------------------------------------- */

  async function loadEmployeePunches(employeeId: number) {
    if (!panelPeriod) return;

    // If already loaded → toggle to hide them
    if (punchesByEmployee[employeeId]) {
      setPunchesByEmployee((prev) => {
        const copy = { ...prev };
        delete copy[employeeId];
        return copy;
      });
      return;
    }

    try {
      setPunchLoadingFor(employeeId);

      const res = await fetch(
        `${API}/api/payperiod/${panelPeriod.id}/employees/${employeeId}/punches`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!res.ok) {
        console.error("Failed to load punches for employee:", employeeId);
        return;
      }

      const data = await res.json();
      const punches: Punch[] = Array.isArray(data) ? data : [];

      setPunchesByEmployee((prev) => ({
        ...prev,
        [employeeId]: punches,
      }));
    } catch (err) {
      console.error("Error loading punches:", err);
    } finally {
      setPunchLoadingFor(null);
    }
  }

  /* ------------------------------------------------------------- */
  /* CSV export */
  /* ------------------------------------------------------------- */

  function exportCsvForCurrentPeriod() {
    if (!panelPeriod || employeeRows.length === 0) {
      alert("Open a period with employees first.");
      return;
    }

    const header = [
      "Employee",
      "RegularHours",
      "OvertimeHours",
      "DoubletimeHours",
      "MissingPunch",
    ];
    const lines = [header.join(",")];

    for (const r of employeeRows) {
      lines.push(
        [
          `"${r.employeeName.replace(/"/g, '""')}"`,
          r.regular.toFixed(2),
          r.overtime.toFixed(2),
          r.doubletime.toFixed(2),
          r.missingPunch ? "YES" : "NO",
        ].join(",")
      );
    }

    const csv = lines.join("\r\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-period-${panelPeriod.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ------------------------------------------------------------- */
  /* Existing PDF (summary) export */
  /* ------------------------------------------------------------- */

  async function exportPdfForPeriod(period: PayrollPeriod) {
    try {
      const res = await fetch(
        `${API}/api/payperiod/${period.id}/pdf-summary`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const msg = await res.text();
        alert(
          `Summary PDF not available.\nStatus: ${res.status}\n${msg || ""}`
        );
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-period-${period.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Summary PDF export failed:", err);
      alert("PDF export failed. Check console.");
    }
  }

  /* ------------------------------------------------------------- */
  /* 🔥 NEW — Punch Pairs Detailed PDF Export */
  /* ------------------------------------------------------------- */

  async function exportPunchPairsPdf(period: PayrollPeriod) {
    try {
      const res = await fetch(
        `${API}/api/payperiod/${period.id}/pdf-timesheet`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const msg = await res.text();
        alert(
          `Failed to export Punch Pairs PDF.\nStatus: ${res.status}\n${msg || ""}`
        );
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `punch_pairs_${period.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Punch Pairs PDF export failed:", err);
      alert("Punch Pairs PDF export failed. See console.");
    }
  }

  /* ------------------------------------------------------------- */
  /* Sorting / paging */
  /* ------------------------------------------------------------- */

  function toggleSort(field: SortField) {
    setPage(1);
    setSortBy((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return field;
    });
  }

  const sortedPeriods = useMemo(() => {
    const arr = [...periods];
    arr.sort((a, b) => {
      if (sortBy === "status") {
        const order = { OPEN: 1, APPROVED: 2, LOCKED: 3 } as const;
        const aVal = order[a.status];
        const bVal = order[b.status];
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const tA = new Date(a[sortBy]).getTime();
      const tB = new Date(b[sortBy]).getTime();
      return sortDir === "asc" ? tA - tB : tB - tA;
    });
    return arr;
  }, [periods, sortBy, sortDir]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedPeriods.length / PAGE_SIZE)
  );
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagePeriods = sortedPeriods.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  /* ------------------------------------------------------------- */
  /* Keyboard nav */
  /* ------------------------------------------------------------- */

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        setPage((p) => Math.max(1, p - 1));
      }
      if (e.key === "ArrowRight") {
        setPage((p) => Math.min(totalPages, p + 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [totalPages]);

  /* ------------------------------------------------------------- */
  /* Auto-scroll expanded */
  /* ------------------------------------------------------------- */

  useEffect(() => {
    if (expandedRef.current) {
      expandedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [expandedId]);

  /* ------------------------------------------------------------- */
  /* Load on mount / location change */
  /* ------------------------------------------------------------- */

  useEffect(() => {
    load();
  }, [locationId]);

  /* ------------------------------------------------------------- */
  /* Selection helpers */
  /* ------------------------------------------------------------- */

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllCurrentPage() {
    const idsOnPage = pagePeriods.map((p) => p.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = idsOnPage.every((id) => next.has(id));
      if (allSelected) {
        idsOnPage.forEach((id) => next.delete(id));
      } else {
        idsOnPage.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  /* ------------------------------------------------------------- */
  /* Totals in panel */
  /* ------------------------------------------------------------- */

  const employeeTotals = useMemo(
    () =>
      employeeRows.reduce(
        (acc, r) => {
          acc.regular += r.regular;
          acc.overtime += r.overtime;
          acc.doubletime += r.doubletime;
          return acc;
        },
        { regular: 0, overtime: 0, doubletime: 0 }
      ),
    [employeeRows]
  );

  /* ------------------------------------------------------------- */
  /* Render starts */
  /* ------------------------------------------------------------- */

  return (
    <div className="relative p-6">
      {/* Header / toolbar */}
      <div className="sticky top-0 z-20 bg-white pb-4 border-b mb-4">
        <h1 className="text-2xl font-semibold mb-3">Payroll Periods</h1>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">
              Location ID
            </label>
            <input
              type="number"
              value={locationId}
              onChange={(e) => setLocationId(Number(e.target.value))}
              className="border rounded px-2 py-1 w-24"
            />
          </div>

          <button
            onClick={generate}
            className="bg-indigo-600 text-white px-4 py-2 rounded text-sm"
          >
            Generate Periods
          </button>

          <div className="flex-1" />

          <div className="flex flex-wrap gap-2 text-xs">
            <button
              disabled={selectedIds.size === 0}
              onClick={batchSupervisorApprove}
              className="px-3 py-1 rounded border text-xs disabled:opacity-40 bg-orange-50 border-orange-200 text-orange-700"
            >
              Supervisor Approve Selected
            </button>

            <button
              disabled={selectedIds.size === 0}
              onClick={batchAdminLock}
              className="px-3 py-1 rounded border text-xs disabled:opacity-40 bg-red-50 border-red-200 text-red-700"
            >
              Admin Lock Selected
            </button>
          </div>
        </div>
      </div>

      {/* Main table */}
      {loading ? (
        <div>Loading periods...</div>
      ) : periods.length === 0 ? (
        <div className="text-sm text-gray-500">
          No payroll periods for this location.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border p-2 w-8 text-center">
                    <input
                      type="checkbox"
                      onChange={toggleSelectAllCurrentPage}
                      checked={
                        pagePeriods.length > 0 &&
                        pagePeriods.every((p) => selectedIds.has(p.id))
                      }
                    />
                  </th>
                  <th className="border p-2 w-8"></th>
                  <th className="border p-2">
                    <button
                      onClick={() => toggleSort("startDate")}
                      className="flex items-center gap-1"
                    >
                      Start
                      {sortBy === "startDate" && (
                        <span>{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  </th>
                  <th className="border p-2">
                    <button
                      onClick={() => toggleSort("endDate")}
                      className="flex items-center gap-1"
                    >
                      End
                      {sortBy === "endDate" && (
                        <span>{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  </th>
                  <th className="border p-2">
                    <button
                      onClick={() => toggleSort("status")}
                      className="flex items-center gap-1"
                    >
                      Status
                      {sortBy === "status" && (
                        <span>{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  </th>
                  <th className="border p-2 text-center">Missing?</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagePeriods.map((p) => {
                  const isExpanded = expandedId === p.id;
                  const hasMissing = missingByPeriod[p.id] ?? null;

                  return (
                    <>
                      <tr
                        key={p.id}
                        ref={isExpanded ? expandedRef : null}
                        className={isExpanded ? "bg-gray-50" : ""}
                      >
                        <td className="border p-2 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                          />
                        </td>

                        <td className="border p-2 text-center align-middle">
                          <button
                            onClick={() =>
                              setExpandedId((prev) =>
                                prev === p.id ? null : p.id
                              )
                            }
                            className="px-1 py-0.5 border rounded text-xs"
                          >
                            {isExpanded ? "▾" : "▸"}
                          </button>
                        </td>

                        <td className="border p-2">{formatDate(p.startDate)}</td>
                        <td className="border p-2">{formatDate(p.endDate)}</td>

                        <td className="border p-2">
                          <StatusBadge status={p.status} />
                        </td>

                        <td className="border p-2 text-center text-xs">
                          {hasMissing === null ? (
                            <span className="text-gray-400">(load details)</span>
                          ) : hasMissing ? (
                            <span className="text-red-600 font-semibold">🔴 YES</span>
                          ) : (
                            <span className="text-green-700 font-semibold">✓ OK</span>
                          )}
                        </td>

                        <td className="border p-2">
                          <div className="flex flex-wrap gap-2 text-xs">

                            {/* View Employees Button */}
                            <button
                              onClick={() => openPeriodEmployees(p)}
                              className="px-2 py-1 rounded bg-blue-600 text-white"
                            >
                              View Employees
                            </button>

                            {/* Summary PDF */}
                            <button
                              onClick={() => exportPdfForPeriod(p)}
                              className="px-2 py-1 rounded border text-xs"
                            >
                              Export PDF
                            </button>

                            {/* 🔥 Punch Pairs PDF – NEW */}
                            <button
                              onClick={() => exportPunchPairsPdf(p)}
                              className="px-2 py-1 rounded border text-xs"
                            >
                              Punch Pairs PDF
                            </button>

                            {/* Status Action Buttons */}
                            {p.status === "OPEN" && (
                              <>
                                <button
                                  onClick={() => supervisorApprove(p.id)}
                                  className="px-2 py-1 rounded bg-orange-500 text-white"
                                >
                                  Supervisor Approve
                                </button>

                                <button
                                  onClick={() => adminLock(p.id)}
                                  className="px-2 py-1 rounded bg-red-600 text-white"
                                >
                                  Admin Lock
                                </button>
                              </>
                            )}

                            {p.status === "APPROVED" && (
                              <button
                                onClick={() => adminLock(p.id)}
                                className="px-2 py-1 rounded bg-red-600 text-white"
                              >
                                Admin Lock
                              </button>
                            )}

                            {p.status === "LOCKED" && (
                              <button
                                onClick={() => unlock(p.id)}
                                className="px-2 py-1 rounded bg-gray-600 text-white"
                              >
                                Unlock
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Info Row */}
                      {isExpanded && (
                        <tr key={`${p.id}-details`} className="bg-gray-50">
                          <td className="border p-2" colSpan={7}>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>
                                <span className="font-semibold">Period ID:</span> {p.id}
                              </div>
                              <div>
                                <span className="font-semibold">Range:</span>{" "}
                                {formatDateTime(p.startDate)} – {formatDateTime(p.endDate)}
                              </div>
                              <div>
                                <span className="font-semibold">Approved:</span>{" "}
                                {formatDateTime(p.approvedAt)}{" "}
                                <span className="font-semibold ml-3">Locked:</span>{" "}
                                {formatDateTime(p.lockedAt)}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
            <div>
              Showing{" "}
              <span className="font-semibold">
                {sortedPeriods.length === 0 ? 0 : startIndex + 1}
              </span>{" "}
              –{" "}
              <span className="font-semibold">
                {Math.min(startIndex + PAGE_SIZE, sortedPeriods.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold">{sortedPeriods.length}</span>{" "}
              periods
            </div>

            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 border rounded disabled:opacity-40"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>

              <span>
                Page <span className="font-semibold">{currentPage}</span> of{" "}
                <span className="font-semibold">{totalPages}</span>
              </span>

              <button
                className="px-2 py-1 border rounded disabled:opacity-40"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* SIDE PANEL */}
      {showPanel && panelPeriod && (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/30">
          <div className="h-full w-full max-w-md bg-white shadow-xl flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h2 className="text-lg font-semibold">
                  Period {formatDate(panelPeriod.startDate)} –{" "}
                  {formatDate(panelPeriod.endDate)} <StatusBadge status={panelPeriod.status} />
                </h2>
                <p className="text-xs text-gray-500">
                  Employees & hours for this period
                </p>
              </div>

              <button
                onClick={closePanel}
                className="text-gray-500 hover:text-gray-800 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Totals */}
            <div className="px-4 py-2 border-b flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold">Totals: </span>
                Reg {employeeTotals.regular.toFixed(2)} • OT{" "}
                {employeeTotals.overtime.toFixed(2)} • DT{" "}
                {employeeTotals.doubletime.toFixed(2)}
              </div>

              <button
                onClick={exportCsvForCurrentPeriod}
                disabled={employeeRows.length === 0}
                className="px-2 py-1 border rounded text-xs disabled:opacity-40"
              >
                Export CSV
              </button>
            </div>

            {/* Employee list */}
            <div className="flex-1 overflow-y-auto p-4">
              {employeesLoading ? (
                <div className="text-sm">Loading employees...</div>
              ) : employeesError ? (
                <div className="text-sm text-red-600">{employeesError}</div>
              ) : employeeRows.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No employees found for this period.
                </div>
              ) : (
                <table className="w-full text-xs border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border p-1 text-left">Employee</th>
                      <th className="border p-1 text-right">Reg</th>
                      <th className="border p-1 text-right">OT</th>
                      <th className="border p-1 text-right">DT</th>
                      <th className="border p-1 text-center">Missing?</th>
                      <th className="border p-1 text-center">Timeline</th>
                    </tr>
                  </thead>

                  <tbody>
                    {employeeRows.map((r) => {
                      const punches = punchesByEmployee[r.employeeId];
                      const isLoading = punchLoadingFor === r.employeeId;

                      return (
                        <>
                          <tr key={r.employeeId}>
                            <td className="border p-1">{r.employeeName}</td>

                            <td className="border p-1 text-right">
                              {r.regular.toFixed(2)}
                            </td>
                            <td className="border p-1 text-right">
                              {r.overtime.toFixed(2)}
                            </td>
                            <td className="border p-1 text-right">
                              {r.doubletime.toFixed(2)}
                            </td>

                            <td className="border p-1 text-center">
                              {r.missingPunch ? (
                                <span className="text-red-600 font-semibold">YES</span>
                              ) : (
                                <span className="text-gray-500">No</span>
                              )}
                            </td>

                            <td className="border p-1 text-center">
                              <button
                                onClick={() => loadEmployeePunches(r.employeeId)}
                                className="px-2 py-0.5 border rounded text-[11px]"
                              >
                                {isLoading
                                  ? "Loading..."
                                  : punches
                                  ? "Hide"
                                  : "View"}
                              </button>
                            </td>
                          </tr>

                          {/* Punch timeline */}
                          {punches && (
                            <tr key={`${r.employeeId}-timeline`}>
                              <td
                                className="border p-2 bg-gray-50 text-[11px]"
                                colSpan={6}
                              >
                                {punches.length === 0 ? (
                                  <span className="text-gray-500">
                                    No punches found.
                                  </span>
                                ) : (
                                  <div className="space-y-1">
                                    {punches.map((punch) => (
                                      <div key={punch.id}>
                                        {punch.type === "IN" ? "IN  " : "OUT "}
                                        {formatDateTime(punch.timestamp)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-4 py-2 text-xs text-gray-500">
              Timeline view is for review only.  
              Use employee Timecards page to edit punches.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
