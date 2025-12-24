"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/components/authToken";

interface PayRate {
  id: number;
  rate: number;
  effectiveDate: string;
}

export default function PayRatesCard({ employeeId }: { employeeId: number }) {
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

  const [rates, setRates] = useState<PayRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newRate, setNewRate] = useState<number>(0);
  const [newDate, setNewDate] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // -----------------------------------------------------
  // LOAD PAY RATES
  // -----------------------------------------------------
  async function load() {
    try {
      setLoading(true);
      const token = getAuthToken();

      const res = await fetch(
        `${API_BASE}/api/payrates?employeeId=${employeeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      setRates(data.sort((a: PayRate, b: PayRate) => 
        new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
      ));
    } catch (e: any) {
      setError(e.message || "Failed to load pay rates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // -----------------------------------------------------
  // ADD PAY RATE
  // -----------------------------------------------------
  async function addRate() {
    try {
      const token = getAuthToken();

      const body = {
        employeeId,
        rate: Number(newRate),
        effectiveDate: newDate,
      };

      const res = await fetch(`${API_BASE}/api/payrates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to add rate");

      setNewRate(0);
      setNewDate("");
      setAdding(false);
      load();
    } catch (err: any) {
      alert(err.message || "Failed to add rate");
    }
  }

  // -----------------------------------------------------
  // DELETE PAY RATE
  // -----------------------------------------------------
  async function deleteRate(id: number) {
    if (!confirm("Delete this rate?")) return;

    try {
      const token = getAuthToken();

      const res = await fetch(`${API_BASE}/api/payrates/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete rate");

      load();
    } catch (err: any) {
      alert(err.message || "Failed to delete rate");
    }
  }

  // -----------------------------------------------------
  // UI
  // -----------------------------------------------------
  const activeRate = rates[0];

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Pay Rates</h2>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Active Rate */}
      {activeRate && (
        <div className="p-3 bg-green-50 border border-green-300 rounded mb-4">
          <p className="text-sm font-medium">Current Rate:</p>
          <p className="text-xl font-bold">${activeRate.rate.toFixed(2)}</p>
          <p className="text-xs text-gray-600">
            Effective {new Date(activeRate.effectiveDate).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Rate List */}
      <div className="space-y-2">
        {rates.map((r) => (
          <div
            key={r.id}
            className="flex justify-between items-center border p-2 rounded"
          >
            <div>
              <p className="font-medium">${r.rate.toFixed(2)}</p>
              <p className="text-xs text-gray-500">
                Effective {new Date(r.effectiveDate).toLocaleDateString()}
              </p>
            </div>

            <button
              onClick={() => deleteRate(r.id)}
              className="text-red-600 text-sm hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Add New Rate Form */}
      <div className="mt-4">
        {adding ? (
          <div className="space-y-3">
            <input
              type="number"
              step="0.01"
              value={newRate}
              onChange={(e) => setNewRate(Number(e.target.value))}
              placeholder="Hourly rate"
              className="border p-2 rounded w-full"
            />

            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="border p-2 rounded w-full"
            />

            <div className="flex gap-2">
              <button
                onClick={addRate}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Save
              </button>

              <button
                onClick={() => setAdding(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="px-4 py-2 border rounded hover:bg-gray-50 text-sm"
          >
            + Add Pay Rate
          </button>
        )}
      </div>
    </div>
  );
}
