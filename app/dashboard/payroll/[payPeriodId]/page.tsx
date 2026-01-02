"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import PayrollSummaryCard from "@/components/payroll/PayrollSummaryCard";
import PayrollEmployeeRow from "@/components/payroll/PayrollEmployeeRow";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

/**
 * -----------------------------
 * Types (EMPLOYEES ONLY)
 * -----------------------------
 * NOTE:
 * - We intentionally do NOT define PayrollSummary here
 * - Summary shape is adapted for the UI below
 */
type PayrollDay = {
  date: string;
  regularHours: number;
  overtimeHours: number;
  doubletimeHours: number;
  ptoHours: number;
};

type PayrollEmployee = {
  employeeId: number;
  name: string;
  regularHours: number;
  overtimeHours: number;
  doubletimeHours: number;
  ptoHours: number;
  rate: number;
  grossPay: number;
  days: PayrollDay[];
};

type PayrollResponse = {
  summary: {
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalDoubletimeHours: number;
    totalPtoHours: number;
    totalGrossPay: number;
  };
  employees: PayrollEmployee[];
};

export default function PayrollDetailPage() {
  const params = useParams();
  const payPeriodId = Number(params?.payPeriodId);

  const [data, setData] = useState<PayrollResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!payPeriodId) {
      setError("Invalid pay period");
      setLoading(false);
      return;
    }

    async function loadPayroll() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${API}/api/payperiod-report/payroll/summary?payPeriodId=${payPeriodId}`,
          { credentials: "include" }
        );

        if (!res.ok) {
          throw new Error(`API error ${res.status}`);
        }

        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("❌ Payroll load failed:", err);
        setError("Failed to load payroll data");
      } finally {
        setLoading(false);
      }
    }

    loadPayroll();
  }, [payPeriodId]);

  // -----------------------------
  // Render states
  // -----------------------------
  if (loading) {
    return <div className="p-6">Loading payroll…</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-600 font-medium">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="p-6">No payroll data found</div>;
  }

  /**
   * --------------------------------
   * MAP API SUMMARY → UI SUMMARY
   * --------------------------------
   * This is the critical fix.
   */
  const summaryForCard = {
    totalRegular: data.summary.totalRegularHours,
    totalOvertime: data.summary.totalOvertimeHours,
    totalDoubletime: data.summary.totalDoubletimeHours,
    totalGross: data.summary.totalGrossPay,
  };

  return (
    <div className="p-6 space-y-6">
      {/* PAGE TITLE */}
      <h1 className="text-2xl font-bold">
        Payroll Details
      </h1>

      {/* TOP SUMMARY TOTALS + LOCK + EXPORT */}
      <PayrollSummaryCard
        summary={summaryForCard}
        payPeriodId={payPeriodId}
      />

      {/* EMPLOYEE DRILL-DOWN */}
      <div className="bg-white rounded shadow divide-y">
        {data.employees.map((emp) => (
          <PayrollEmployeeRow
            key={emp.employeeId}
            employee={emp}
          />
        ))}

        {data.employees.length === 0 && (
          <div className="p-4 text-gray-500">
            No employees in this pay period
          </div>
        )}
      </div>
    </div>
  );
}
