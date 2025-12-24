"use client";

import { useEffect, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type PayRate = {
  id: number;
  rate: number;
  effectiveDate: string;
};

type Props = {
  employeeId: number;
};

export default function EmployeePayRateCard({ employeeId }: Props) {
  const [rates, setRates] = useState<PayRate[]>([]);
  const [rate, setRate] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadRates() {
    const res = await fetch(`${API}/api/payrate`, {
      credentials: "include",
    });
    const allRates = await res.json();

    const filtered = allRates.filter(
      (r: any) => r.employeeId === employeeId
    );

    setRates(filtered);
    setLoading(false);
  }

  async function addRate() {
    if (!rate || !effectiveDate) {
      alert("Rate and effective date required");
      return;
    }

    await fetch(`${API}/api/payrate`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId,
        rate: Number(rate),
        effectiveDate,
      }),
    });

    setRate("");
    setEffectiveDate("");
    loadRates();
  }

  useEffect(() => {
    loadRates();
  }, [employeeId]);

  if (loading) return <div>Loading pay rates…</div>;

  return (
    <div className="border rounded p-4 space-y-4 bg-white">
      <h3 className="text-lg font-semibold">Pay Rates</h3>

      {/* Current Rate */}
      {rates.length > 0 && (
        <div className="text-sm">
          <strong>Current Rate:</strong> $
          {rates[0].rate.toFixed(2)} / hr
        </div>
      )}

      {/* Rate History */}
      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">Rate</th>
            <th className="border px-2 py-1">Effective Date</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((r) => (
            <tr key={r.id}>
              <td className="border px-2 py-1">
                ${r.rate.toFixed(2)}
              </td>
              <td className="border px-2 py-1">
                {new Date(r.effectiveDate).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Rate */}
      <div className="flex gap-2 items-end">
        <div>
          <label className="text-sm">Rate ($)</label>
          <input
            type="number"
            className="border px-2 py-1 w-24"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Effective Date</label>
          <input
            type="date"
            className="border px-2 py-1"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
        </div>

        <button
          onClick={addRate}
          className="bg-black text-white px-4 py-1 rounded"
        >
          Add
        </button>
      </div>
    </div>
  );
}
