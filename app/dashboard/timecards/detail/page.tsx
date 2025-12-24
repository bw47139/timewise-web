"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function TimecardDetailPage() {
  const params = useSearchParams();
  const router = useRouter();

  const employeeId = params.get("employeeId");
  const start = params.get("start");
  const end = params.get("end");

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch(
        `${API}/api/timecards/detail?employeeId=${employeeId}&start=${start}&end=${end}`,
        {
          method: "GET",
          credentials: "include", // 🔒 cookie-based auth
        }
      );

      // Handle session expiration
      if (res.status === 401) {
        router.replace(
          `/login?expired=1&next=/dashboard/timecards/detail?employeeId=${employeeId}&start=${start}&end=${end}`
        );
        return;
      }

      if (!res.ok) {
        console.error("Failed to load timecard detail:", res.status);
        setEmployee(null);
        setRows([]);
        setSummary(null);
        setLoading(false);
        return;
      }

      const data = await res.json();

      setEmployee(data.employee);
      setRows(data.rows || []);
      setSummary(data.summary || {});
    } catch (err) {
      console.error("Error loading timecard detail:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (employeeId && start && end) {
      load();
    }
  }, [employeeId, start, end]);

  if (!employeeId || !start || !end)
    return <p className="p-6">Missing query parameters.</p>;

  if (loading) return <p className="p-6">Loading...</p>;

  if (!employee)
    return <p className="p-6 text-red-600">Employee not found.</p>;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-sm text-gray-600">
            Timecard for {start} → {end}
          </p>
        </div>

        <Link
          href="/dashboard/timecards"
          className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
        >
          ← Back to Summary
        </Link>
      </div>

      {/* SUMMARY BOX */}
      <div className="bg-white shadow rounded-xl p-4 text-sm space-y-2">
        <h2 className="font-semibold text-gray-700 mb-2">Summary</h2>

        <p>Regular Hours: {summary?.regular ?? 0}</p>
        <p>Overtime Hours: {summary?.overtime ?? 0}</p>
        <p>Double-Time Hours: {summary?.doubletime ?? 0}</p>

        {summary?.missingPunch && (
          <p className="text-red-600 font-semibold">
            ⚠ Missing punches detected!
          </p>
        )}

        <Link
          href={`/dashboard/reports/timesheet?employeeId=${employeeId}&start=${start}&end=${end}`}
          className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Download Timesheet PDF
        </Link>
      </div>

      {/* PUNCHES TABLE */}
      <div>
        <h2 className="font-semibold text-gray-700 mb-2">Punches</h2>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Timestamp</th>
              <th className="p-2 border">Location</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((p: any, i: number) => (
              <tr key={i}>
                <td className="p-2 border">{p.type}</td>
                <td className="p-2 border">
                  {new Date(p.timestamp).toLocaleString()}
                </td>
                <td className="p-2 border">{p.location?.name || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SESSIONS TABLE */}
      <div>
        <h2 className="font-semibold text-gray-700 mb-2">Work Sessions</h2>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">IN</th>
              <th className="p-2 border">OUT</th>
              <th className="p-2 border">Hours</th>
            </tr>
          </thead>

          <tbody>
            {summary?.sessions?.map((s: any, i: number) => (
              <tr key={i}>
                <td className="p-2 border">
                  {new Date(s.in).toLocaleString()}
                </td>
                <td className="p-2 border">
                  {s.out ? new Date(s.out).toLocaleString() : "—"}
                </td>
                <td className="p-2 border">{s.hours}</td>
              </tr>
            )) || (
              <tr>
                <td className="p-2 border" colSpan={3}>
                  No sessions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
