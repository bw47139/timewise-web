"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/components/authToken";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface ActivityLogEntry {
  id: number;
  type: string;
  description: string;
  createdAt: string;
  createdBy?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
}

interface ActivityResponse {
  data: ActivityLogEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export default function ActivityLogCard({ employeeId }: { employeeId: number }) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotal] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadLogs = async (pageNum: number) => {
    setLoading(true);

    const token = getAuthToken();
    const res = await fetch(
      `${API_BASE_URL}/api/employees/${employeeId}/activity?page=${pageNum}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const json: ActivityResponse = await res.json();

    setLogs(json.data);
    setPage(json.pagination.page);
    setTotal(json.pagination.totalPages);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs(1);
  }, [employeeId]);

  return (
    <div className="bg-white shadow rounded-lg p-4 mt-4">
      <h2 className="text-lg font-semibold mb-3">Activity Log</h2>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-500">No activity recorded.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-gray-600">
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-left">By</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b">
                <td className="p-2">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="p-2 font-mono uppercase text-xs">{log.type}</td>
                <td className="p-2">{log.description}</td>
                <td className="p-2">
                  {log.createdBy
                    ? `${log.createdBy.firstName} ${log.createdBy.lastName}`
                    : "System"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      <div className="flex justify-between mt-3 text-xs">
        <button
          disabled={page <= 1}
          onClick={() => loadLogs(page - 1)}
          className={`px-3 py-1 border rounded-md ${
            page <= 1
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-gray-100 bg-white"
          }`}
        >
          Previous
        </button>

        <span>
          Page {page} of {totalPages}
        </span>

        <button
          disabled={page >= totalPages}
          onClick={() => loadLogs(page + 1)}
          className={`px-3 py-1 border rounded-md ${
            page >= totalPages
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-gray-100 bg-white"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
