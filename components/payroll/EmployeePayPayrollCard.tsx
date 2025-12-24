"use client";

import { useState } from "react";

type PayType = "HOURLY" | "SALARY";

export default function EmployeePayPayrollCard({
  employeeId,
}: {
  employeeId: number;
}) {
  // UI-first (DB later)
  const [payType, setPayType] = useState<PayType>("HOURLY");
  const [payRate, setPayRate] = useState("");
  const [payFrequency, setPayFrequency] = useState("Bi-Weekly");
  const [overtimeEligible, setOvertimeEligible] = useState(true);
  const [effectiveDate, setEffectiveDate] = useState("");

  return (
    <div className="max-w-2xl rounded border bg-white p-4 space-y-4">
      <h2 className="text-lg font-semibold">Pay & Payroll</h2>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <label className="text-gray-500">Pay Type</label>
          <select
            className="w-full rounded border p-2"
            value={payType}
            onChange={(e) =>
              setPayType(e.target.value as PayType)
            }
          >
            <option value="HOURLY">Hourly</option>
            <option value="SALARY">Salary</option>
          </select>
        </div>

        <div>
          <label className="text-gray-500">
            {payType === "HOURLY"
              ? "Hourly Rate ($)"
              : "Annual Salary ($)"}
          </label>
          <input
            className="w-full rounded border p-2"
            placeholder="0.00"
            value={payRate}
            onChange={(e) => setPayRate(e.target.value)}
          />
        </div>

        <div>
          <label className="text-gray-500">Pay Frequency</label>
          <select
            className="w-full rounded border p-2"
            value={payFrequency}
            onChange={(e) => setPayFrequency(e.target.value)}
          >
            <option>Weekly</option>
            <option>Bi-Weekly</option>
            <option>Semi-Monthly</option>
            <option>Monthly</option>
          </select>
        </div>

        <div>
          <label className="text-gray-500">Overtime Eligible</label>
          <select
            className="w-full rounded border p-2"
            value={overtimeEligible ? "yes" : "no"}
            onChange={(e) =>
              setOvertimeEligible(e.target.value === "yes")
            }
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div>
          <label className="text-gray-500">Effective Date</label>
          <input
            type="date"
            className="w-full rounded border p-2"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
        </div>
      </div>

      <button
        disabled
        className="rounded bg-gray-400 px-4 py-2 text-white cursor-not-allowed"
      >
        Save (Payroll engine coming next)
      </button>
    </div>
  );
}
