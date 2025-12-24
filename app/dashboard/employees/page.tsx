"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Employee = {
  id: number;
  firstName: string;
  lastName: string;
  email?: string | null;
  status: string;
};

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function EmployeesPage() {
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadEmployees() {
    try {
      const res = await fetch(`${API}/api/employee`, {
        method: "GET",
        credentials: "include", // 🔒 REQUIRED for cookie auth
      });

      // 🔴 Unauthorized → redirect to login
      if (res.status === 401) {
        console.error("Unauthorized – redirecting to login");
        setEmployees([]);
        setError("Your session expired. Please log in again.");
        return;
      }

      const data = await res.json();

      // 🔒 Force array safety
      if (Array.isArray(data)) {
        setEmployees(data);
      } else {
        console.error("Unexpected employees response:", data);
        setEmployees([]);
        setError("Failed to load employees.");
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
      setEmployees([]);
      setError("Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  if (loading) {
    return <p>Loading employees…</p>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 border border-red-200 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Employees</h1>

      <table className="w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2 text-left">Name</th>
            <th className="border p-2 text-left">Email</th>
            <th className="border p-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                className="border p-4 text-center text-gray-500"
              >
                No employees found.
              </td>
            </tr>
          ) : (
            employees.map((e) => (
              <tr
                key={e.id}
                onClick={() =>
                  router.push(`/dashboard/employees/${e.id}`)
                }
                className="cursor-pointer hover:bg-gray-50"
              >
                <td className="border p-2">
                  {e.firstName} {e.lastName}
                </td>
                <td className="border p-2">{e.email || "-"}</td>
                <td className="border p-2">{e.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
