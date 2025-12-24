"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/components/authToken";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface Document {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
  expiresAt?: string | null;
  isExpired?: boolean;
}

export default function DocumentsCard({
  employeeId,
}: {
  employeeId: number;
}) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const token = getAuthToken();

      const res = await fetch(
        `${API}/api/employees/${employeeId}/documents`,
        {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
          credentials: "include",
        }
      );

      if (!res.ok) {
        throw new Error("Failed to load documents");
      }

      setDocs(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [employeeId]);

  if (loading) return <p>Loading documents…</p>;
  if (!docs.length) return <p>No documents uploaded.</p>;

  return (
    <div className="bg-white shadow rounded p-4 space-y-3">
      <h2 className="text-lg font-semibold">Documents</h2>

      {docs.map((d) => (
        <div
          key={d.id}
          className="border rounded p-3 text-sm flex justify-between items-center"
        >
          <div>
            <p className="font-medium">{d.fileName}</p>
            <p className="text-xs text-gray-500">
              Uploaded {new Date(d.createdAt).toLocaleDateString()}
            </p>
            {d.expiresAt && (
              <p className="text-xs text-red-600">
                Expires {new Date(d.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <a
            href={d.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 text-sm"
          >
            View
          </a>
        </div>
      ))}
    </div>
  );
}
