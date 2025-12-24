"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAuthToken } from "@/components/authToken";
import dayjs from "dayjs";

export default function LocationPayrollPage() {
  const { id } = useParams(); // Location ID
  const token = getAuthToken();

  const [start, setStart] = useState(dayjs().startOf("week").format("YYYY-MM-DD"));
  const [end, setEnd] = useState(dayjs().endOf("week").format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState("");

  async function loadPayroll() {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `http://localhost:4000/api/locations/${id}/payroll?start=${start}&end=${end}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to load payroll");
      }

      const data = await res.json();
      setSummary(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayroll();
  }, []);

  return (
    <div className="p-8">

      <h1 className="text-3xl font-bold mb-6">
        Location Payroll Summary
      </h1>

      {/* Date Controls */}
      <div className="mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium">Start</label>
          <input
            type="date"
            className="border p-2 rounded"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">End</label>
          <input
            type="date"
            className="border p-2 rounded"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>

        <button
          onClick={loadPayroll}
          className="bg-blue-600 text-white px-4 py-2 rounded mt-5"
        >
          Load Payroll
        </button>
      </div>

      {loading && <p className="text-lg">Loading payroll...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* When summary is loaded */}
      {summary && (
        <div className="space-y-6">

          {/* LOCATION INFO */}
          <div className="p-4 border rounded bg-gray-50">
            <h2 className="text-xl font-bold mb-2">📍 {summary.location.name}</h2>
            <p className="text-sm text-gray-600">Timezone: {summary.location.timezone}</p>
            <p className="text-sm text-gray-600">
              Employees included: {summary.counts.totalEmployees}
            </p>
          </div>

          {/* PAYROLL TOTALS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <PayrollBox label="Total Worked" value={summary.totals.workedHours} />
            <PayrollBox label="Regular Hours" value={summary.totals.regularHours} />
            <PayrollBox label="Overtime" value={summary.totals.overtimeHours} />
            <PayrollBox label="Doubletime" value={summary.totals.doubletimeHours} />
            <PayrollBox label="Auto-Lunch Hours" value={summary.totals.autoLunchHours} />
          </div>

          {/* EMPLOYEE BREAKDOWN */}
          <h2 className="text-xl font-bold mt-8 mb-4">Employees</h2>

          <div className="space-y-4">
            {summary.employees.map((emp: any) => (
              <div key={emp.id} className="p-4 border rounded">
                <h3 className="text-lg font-semibold">
                  {emp.firstName} {emp.lastName}
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  <PayrollBox label="Worked" value={emp.totals.workedHours} small />
                  <PayrollBox label="Regular" value={emp.totals.regularHours} small />
                  <PayrollBox label="OT" value={emp.totals.overtimeHours} small />
                  <PayrollBox label="DT" value={emp.totals.doubletimeHours} small />
                </div>

                {/* Daily breakdown */}
                <details className="mt-3">
                  <summary className="cursor-pointer text-blue-600 underline">
                    View Daily Details
                  </summary>

                  <div className="mt-3 space-y-2">
                    {emp.days.map((d: any) => (
                      <div key={d.date} className="p-2 border rounded bg-gray-50">
                        <strong>{d.date}</strong>
                        <p>Total: {d.formattedTotal}</p>
                        <p>Regular: {d.formattedRegular}</p>
                        <p>OT: {d.formattedOvertime}</p>
                        <p>DT: {d.formattedDoubletime}</p>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* Small helper component */
function PayrollBox({ label, value, small = false }) {
  return (
    <div className="p-4 bg-white border rounded shadow-sm">
      <div className={small ? "text-sm text-gray-600" : "text-gray-500"}>
        {label}
      </div>
      <div className={small ? "text-lg font-semibold" : "text-2xl font-bold"}>
        {value.toFixed(2)}
      </div>
    </div>
  );
}
