"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function FixMissingPunchPage() {
  const params = useSearchParams();
  const router = useRouter();

  const employeeId = params.get("employeeId");
  const start = params.get("start");
  const end = params.get("end");

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<any>(null);
  const [punches, setPunches] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch(
        `${API}/api/timecards/detail?employeeId=${employeeId}&start=${start}&end=${end}`,
        {
          method: "GET",
          credentials: "include", // 🔒 cookie auth
        }
      );

      // If session expired → push to login
      if (res.status === 401) {
        router.replace(
          `/login?expired=1&next=/dashboard/timecards/fix?employeeId=${employeeId}&start=${start}&end=${end}`
        );
        return;
      }

      if (!res.ok) {
        console.error("Failed to load detail:", res.status);
        setEmployee(null);
        setPunches([]);
        setSessions([]);
        setSuggestions([]);
        setLoading(false);
        return;
      }

      const data = await res.json();

      setEmployee(data.employee);
      setPunches(data.rows || []);
      setSessions(data.summary?.sessions || []);

      computeSuggestions(data.summary?.sessions || []);
    } catch (err) {
      console.error("Error loading detail:", err);
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------------
  // AUTO DETECTION OF MISSING PUNCHES
  // -------------------------------------------------------
  function computeSuggestions(sessions: any[]) {
    const s: any[] = [];

    sessions.forEach((sess) => {
      // Missing OUT punch
      if (!sess.out) {
        s.push({
          type: "ADD_OUT",
          message: "Missing OUT punch",
          recommendedTime: new Date(
            new Date(sess.in).getTime() + 8 * 60 * 60 * 1000
          ).toISOString(),
          session: sess,
        });
      }
    });

    // Detect OUT without matching IN (rare)
    for (let i = 0; i < punches.length; i++) {
      const p = punches[i];
      if (p.type === "OUT" && i === 0) {
        s.push({
          type: "ADD_IN",
          message: "OUT punch has no matching IN",
          recommendedTime: new Date(
            new Date(p.timestamp).getTime() - 8 * 60 * 60 * 1000
          ).toISOString(),
          punch: p,
        });
      }
    }

    setSuggestions(s);
  }

  // -------------------------------------------------------
  // APPLY SUGGESTION
  // -------------------------------------------------------
  async function applySuggestion(s: any) {
    try {
      setSaving(true);

      const body =
        s.type === "ADD_OUT"
          ? {
              employeeId,
              locationId: employee.locationId,
              type: "OUT",
              timestamp: s.recommendedTime,
            }
          : {
              employeeId,
              locationId: employee.locationId,
              type: "IN",
              timestamp: s.recommendedTime,
            };

      await fetch(`${API}/api/punches/add`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      await load();
    } catch (err) {
      console.error("Failed to apply suggestion:", err);
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------
  // MANUAL EDIT: DELETE PUNCH
  // -------------------------------------------------------
  async function deletePunch(id: number) {
    try {
      await fetch(`${API}/api/punches/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      await load();
    } catch (err) {
      console.error("Failed to delete punch:", err);
    }
  }

  // -------------------------------------------------------
  // MANUAL EDIT: ADD NEW PUNCH
  // -------------------------------------------------------
  async function addPunch(type: "IN" | "OUT") {
    const timestamp = prompt("Enter timestamp (YYYY-MM-DD HH:mm):");
    if (!timestamp) return;

    try {
      await fetch(`${API}/api/punches/add`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          locationId: employee.locationId,
          type,
          timestamp,
        }),
      });

      await load();
    } catch (err) {
      console.error("Failed to add punch:", err);
    }
  }

  // -------------------------------------------------------
  // INITIAL LOAD
  // -------------------------------------------------------
  useEffect(() => {
    if (employeeId && start && end) load();
  }, [employeeId, start, end]);

  if (loading) return <p className="p-6">Loading...</p>;
  if (!employee) return <p className="p-6 text-red-600">Employee not found.</p>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">
        Fix Missing Punches — {employee.firstName} {employee.lastName}
      </h1>

      {/* ================================
          AUTO FIX WIZARD
      ================================= */}
      <div className="bg-white shadow rounded-xl p-4">
        <h2 className="font-semibold mb-3">🔧 Automatic Fix Wizard</h2>

        {suggestions.length === 0 ? (
          <p className="text-gray-500">No missing punch errors detected.</p>
        ) : (
          suggestions.map((s, i) => (
            <div
              key={i}
              className="border p-3 rounded-lg mb-3 bg-red-50 border-red-300"
            >
              <p className="font-semibold text-red-700">{s.message}</p>
              <p className="text-sm text-gray-700 mt-1">
                Suggested time: {new Date(s.recommendedTime).toLocaleString()}
              </p>

              <button
                onClick={() => applySuggestion(s)}
                disabled={saving}
                className="mt-3 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Apply Fix
              </button>
            </div>
          ))
        )}
      </div>

      {/* ================================
          MANUAL EDITOR
      ================================= */}
      <div className="bg-white shadow rounded-xl p-4">
        <h2 className="font-semibold mb-3">✏️ Manual Punch Editor</h2>

        <button
          onClick={() => addPunch("IN")}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded mr-2 hover:bg-blue-700"
        >
          Add IN
        </button>

        <button
          onClick={() => addPunch("OUT")}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Add OUT
        </button>

        <table className="w-full border-collapse mt-4 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Timestamp</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>

          <tbody>
            {punches.map((p) => (
              <tr key={p.id}>
                <td className="p-2 border">{p.type}</td>
                <td className="p-2 border">
                  {new Date(p.timestamp).toLocaleString()}
                </td>
                <td className="p-2 border">
                  <button
                    onClick={() => deletePunch(p.id)}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
