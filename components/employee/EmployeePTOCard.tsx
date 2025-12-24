"use client";

import { useEffect, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type PTOBalance = {
  accruedHours: number;
  usedHours: number;
  availableHours: number;
};

export default function EmployeePTOCard({
  employeeId,
}: {
  employeeId: number;
}) {
  const [pto, setPto] = useState<PTOBalance | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadPTO() {
    setLoading(true);

    const res = await fetch(
      `${API}/api/pto/employee/${employeeId}`,
      { credentials: "include" }
    );

    if (res.ok) {
      setPto(await res.json());
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPTO();
  }, [employeeId]);

  if (loading) return <p>Loading PTO…</p>;
  if (!pto) return <p>No PTO data available.</p>;

  return (
    <div className="bg-white border rounded p-4 space-y-3">
      <h2 className="font-semibold text-lg">PTO Summary</h2>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Accrued</p>
          <p className="font-medium">{pto.accruedHours} hrs</p>
        </div>

        <div>
          <p className="text-gray-500">Used</p>
          <p className="font-medium">{pto.usedHours} hrs</p>
        </div>

        <div>
          <p className="text-gray-500">Available</p>
          <p className="font-semibold text-green-600">
            {pto.availableHours} hrs
          </p>
        </div>
      </div>
    </div>
  );
}
