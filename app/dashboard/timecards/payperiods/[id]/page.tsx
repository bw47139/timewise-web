"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/components/authToken";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type PayrollPeriodStatus = "OPEN" | "APPROVED" | "LOCKED";

type PayrollPeriod = {
  id: number;
  organizationId: number;
  locationId: number | null;
  startDate: string;
  endDate: string;
  status: PayrollPeriodStatus;
  lockedAt: string | null;
  lockedByUserId: number | null;
  approvedAt: string | null;
  approvedByUserId: number | null;
};

type PunchPair = {
  in: string;
  out: string | null;
  hours: number | null;
};

type EmployeeRow = {
  employeeId: number;
  employeeName: string;
  regular: number;
  overtime: number;
  doubletime: number;
  missingPunch: boolean;
  punchPairs: PunchPair[];
};

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

/* -------------------------------------------------------------
   Helper: Get Previous / Next Adjacent Periods
   (expects already-sorted list)
------------------------------------------------------------- */
function getAdjacentPeriods(sorted: PayrollPeriod[], currentId: number) {
  if (!sorted || sorted.length === 0) return { prev: null as PayrollPeriod | null, next: null as PayrollPeriod | null };

  const index = sorted.findIndex((p) => p.id === currentId);

  return {
    prev: index > 0 ? sorted[index - 1] : null,
    next: index >= 0 && index < sorted.length - 1 ? sorted[index + 1] : null,
  };
}

export default function PayPeriodDetailPage() {
  const params = useParams();
  const idParam = params?.id;
  const payPeriodId = Number(Array.isArray(idParam) ? idParam[0] : idParam);

  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [empLoading, setEmpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedEmployeeId, setExpandedEmployeeId] =
    useState<number | null>(null);

  // All periods for navigation + dropdown
  const [allPeriods, setAllPeriods] = useState<PayrollPeriod[]>([]);

  async function loadAllPeriods() {
    try {
      const token = getAuthToken();

      // You can later swap locationId=1 with a selected/current location
      const res = await fetch(`${API}/api/payroll-period?locationId=1`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const data = await res.json();

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.periods)
        ? data.periods
        : [];

      setAllPeriods(list);
    } catch (err) {
      console.error("Failed to load all payroll periods:", err);
    }
  }

  async function loadPeriod() {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();

      const res = await fetch(`${API}/api/payroll-period/${payPeriodId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!res.ok) {
        setError(`Failed to load payroll period (status ${res.status})`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setPeriod(data);
    } catch (err) {
      console.error("Failed to load payroll period:", err);
      setError("Failed to load payroll period");
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    try {
      setEmpLoading(true);
      setError(null);
      const token = getAuthToken();

      const res = await fetch(
        `${API}/api/payroll-period/${payPeriodId}/employees`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      if (!res.ok) {
        setError(
          `Failed to load employees for this period (status ${res.status})`
        );
        setEmployees([]);
        setEmpLoading(false);
        return;
      }

      const data = await res.json();
      const rows: EmployeeRow[] = Array.isArray(data)
        ? data
        : Array.isArray(data.employees)
        ? data.employees
        : [];

      setEmployees(rows);
    } catch (err) {
      console.error("Failed to load employees for period:", err);
      setError("Failed to load employees for this period");
      setEmployees([]);
    } finally {
      setEmpLoading(false);
    }
  }

  async function reloadAll() {
    await loadPeriod();
    await loadEmployees();
  }

  async function supervisorApprove() {
    if (!period) return;
    const token = getAuthToken();

    await fetch(
      `${API}/api/payroll-period/${period.id}/supervisor-approve`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    reloadAll();
  }

  async function adminLock() {
    if (!period) return;
    const token = getAuthToken();

    await fetch(`${API}/api/payroll-period/${period.id}/admin-lock`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    reloadAll();
  }

  async function unlock() {
    if (!period) return;
    const token = getAuthToken();

    await fetch(`${API}/api/payroll-period/${period.id}/unlock`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    reloadAll();
  }

  async function exportPdf() {
    if (!period) return;
    const token = getAuthToken();

    const res = await fetch(
      `${API}/api/payroll-period/${period.id}/pdf-summary`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      alert(
        `PDF export not available yet (status ${res.status}). We'll wire this later.`
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
  }

  useEffect(() => {
    if (!payPeriodId || Number.isNaN(payPeriodId)) {
      setError("Invalid payroll period id");
      setLoading(false);
      return;
    }

    reloadAll();
    loadAllPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payPeriodId]);

  const totals = employees.reduce(
    (acc, e) => {
      acc.regular += e.regular;
      acc.overtime += e.overtime;
      acc.doubletime += e.doubletime;
      return acc;
    },
    { regular: 0, overtime: 0, doubletime: 0 }
  );

  totals.regular = Number(totals.regular.toFixed(2));
  totals.overtime = Number(totals.overtime.toFixed(2));
  totals.doubletime = Number(totals.doubletime.toFixed(2));

  // Sorted periods for nav + dropdown
  const sortedPeriods = [...allPeriods].sort(
    (a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const { prev, next } = getAdjacentPeriods(sortedPeriods, payPeriodId);

  // Keyboard navigation: ← (prev), → (next)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && prev) {
        window.location.href = `/dashboard/timecards/payperiods/${prev.id}`;
      }
      if (e.key === "ArrowRight" && next) {
        window.location.href = `/dashboard/timecards/payperiods/${next.id}`;
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [prev, next]);

  return (
    <div className="p-6 space-y-4">
      {/* Sticky toolbar wrapper */}
      <div className="sticky top-0 z-20 bg-white pb-3 mb-2 border-b border-gray-100">
        {/* Top navigation (Previous / Next) */}
        {sortedPeriods.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            {prev ? (
              <button
                onClick={() =>
                  (window.location.href = `/dashboard/timecards/payperiods/${prev.id}`)
                }
                className="px-3 py-1 text-xs border rounded bg-white hover:bg-gray-100"
              >
                ◀ Previous Period
              </button>
            ) : (
              <div /> // spacer
            )}

            {next && (
              <button
                onClick={() =>
                  (window.location.href = `/dashboard/timecards/payperiods/${next.id}`)
                }
                className="px-3 py-1 text-xs border rounded bg-white hover:bg-gray-100"
              >
                Next Period ▶
              </button>
            )}
          </div>
        )}

        {/* Existing header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">
              <Link
                href="/dashboard/timecards/payperiods"
                className="text-blue-600 hover:underline"
              >
                ← Back to Payroll Periods
              </Link>
            </div>
            <h1 className="text-2xl font-semibold mt-1">
              Payroll Period Detail
            </h1>
            {period && (
              <p className="text-sm text-gray-600 mt-1">
                {formatDate(period.startDate)} – {formatDate(period.endDate)}{" "}
                <StatusBadge status={period.status} />
              </p>
            )}

            {/* Jump-to-period dropdown */}
            {sortedPeriods.length > 0 && (
              <div className="mt-2">
                <label className="text-[11px] text-gray-500 mr-2">
                  Jump to period:
                </label>
                <select
                  className="border rounded px-2 py-1 text-xs"
                  value={payPeriodId || ""}
                  onChange={(e) => {
                    const newId = Number(e.target.value);
                    if (!Number.isNaN(newId) && newId > 0) {
                      window.location.href = `/dashboard/timecards/payperiods/${newId}`;
                    }
                  }}
                >
                  {sortedPeriods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatDate(p.startDate)} – {formatDate(p.endDate)}{" "}
                      (#{p.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ACTIONS */}
          {period && (
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={exportPdf}
                className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-50"
              >
                Export PDF
              </button>

              {period.status === "OPEN" && (
                <>
                  <button
                    onClick={supervisorApprove}
                    className="px-3 py-1.5 text-xs rounded bg-orange-500 text-white hover:bg-orange-600"
                  >
                    Supervisor Approve
                  </button>
                  <button
                    onClick={adminLock}
                    className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    Admin Lock
                  </button>
                </>
              )}

              {period.status === "APPROVED" && (
                <button
                  onClick={adminLock}
                  className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Admin Lock
                </button>
              )}

              {period.status === "LOCKED" && (
                <button
                  onClick={unlock}
                  className="px-3 py-1.5 text-xs rounded bg-gray-600 text-white hover:bg-gray-700"
                >
                  Unlock Period
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SUMMARY BOXES */}
      {period && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="text-xs text-gray-500 mb-1">Period</div>
            <div className="text-sm font-semibold">
              {formatDate(period.startDate)} – {formatDate(period.endDate)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Location ID:{" "}
              <span className="font-mono">{period.locationId ?? "N/A"}</span>
            </div>
          </div>

          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="text-xs text-gray-500 mb-1">Status</div>
            <div className="flex items-center gap-2">
              <StatusBadge status={period.status} />
            </div>
            <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
              <div>Approved: {formatDateTime(period.approvedAt)}</div>
              <div>Locked: {formatDateTime(period.lockedAt)}</div>
            </div>
          </div>

          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="text-xs text-gray-500 mb-1">
              Totals (All Employees)
            </div>
            <div className="text-sm">
              Regular:{" "}
              <span className="font-semibold">{totals.regular}</span> hrs
            </div>
            <div className="text-sm">
              OT:{" "}
              <span className="font-semibold">{totals.overtime}</span> hrs
            </div>
            <div className="text-sm">
              DT:{" "}
              <span className="font-semibold">{totals.doubletime}</span> hrs
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE TABLE */}
      <div className="border rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-gray-100 text-sm font-semibold border-b">
          Employees in this Period
        </div>

        {loading ? (
          <div className="p-4 text-sm">Loading period...</div>
        ) : empLoading ? (
          <div className="p-4 text-sm">Loading employees...</div>
        ) : error ? (
          <div className="p-4 text-sm text-red-600">{error}</div>
        ) : employees.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">
            No employees found for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border p-2 w-8"></th>
                  <th className="border p-2 text-left">Employee</th>
                  <th className="border p-2 text-right">Reg</th>
                  <th className="border p-2 text-right">OT</th>
                  <th className="border p-2 text-right">DT</th>
                  <th className="border p-2 text-center">Missing?</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => {
                  const expanded = expandedEmployeeId === e.employeeId;
                  return (
                    <>
                      <tr
                        key={e.employeeId}
                        id={`emp-row-${e.employeeId}`} // for auto-scroll
                        className={
                          e.missingPunch ? "bg-red-50 border-red-200" : ""
                        }
                      >
                        <td className="border p-1 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => {
                              const nextId = expanded ? null : e.employeeId;
                              setExpandedEmployeeId(nextId);
                              if (nextId !== null) {
                                setTimeout(() => {
                                  const el = document.getElementById(
                                    `emp-row-${nextId}`
                                  );
                                  if (el) {
                                    el.scrollIntoView({
                                      behavior: "smooth",
                                      block: "start",
                                    });
                                  }
                                }, 0);
                              }
                            }}
                            className="px-1 py-0.5 border rounded text-[10px]"
                          >
                            {expanded ? "▾" : "▸"}
                          </button>
                        </td>
                        <td className="border p-2">{e.employeeName}</td>
                        <td className="border p-2 text-right">
                          {e.regular.toFixed(2)}
                        </td>
                        <td className="border p-2 text-right">
                          {e.overtime.toFixed(2)}
                        </td>
                        <td className="border p-2 text-right">
                          {e.doubletime.toFixed(2)}
                        </td>
                        <td className="border p-2 text-center">
                          {e.missingPunch ? (
                            <span className="text-red-600 font-semibold">
                              YES
                            </span>
                          ) : (
                            <span className="text-gray-500">No</span>
                          )}
                        </td>
                      </tr>

                      {expanded && (
                        <tr key={`${e.employeeId}-details`}>
                          <td className="border p-2"></td>
                          <td className="border p-2" colSpan={5}>
                            {e.punchPairs.length === 0 ? (
                              <div className="text-[11px] text-gray-500">
                                No punch pairs found for this employee in this
                                period.
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="text-[11px] text-gray-600">
                                  Punch pairs for{" "}
                                  <span className="font-semibold">
                                    {e.employeeName}
                                  </span>
                                </div>
                                <table className="w-full text-[11px] border">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="border p-1 text-left">
                                        In
                                      </th>
                                      <th className="border p-1 text-left">
                                        Out
                                      </th>
                                      <th className="border p-1 text-right">
                                        Hours
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {e.punchPairs.map((pair, idx) => (
                                      <tr key={idx}>
                                        <td className="border p-1">
                                          {pair.in
                                            ? formatDateTime(pair.in)
                                            : "-"}
                                        </td>
                                        <td className="border p-1">
                                          {pair.out
                                            ? formatDateTime(pair.out)
                                            : e.missingPunch
                                            ? "Missing OUT punch"
                                            : "-"}
                                        </td>
                                        <td className="border p-1 text-right">
                                          {pair.hours != null
                                            ? pair.hours.toFixed(2)
                                            : "-"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
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
          </div>
        )}
      </div>
    </div>
  );
}
