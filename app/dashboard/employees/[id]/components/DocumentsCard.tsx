"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { getAuthToken } from "@/components/authToken";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface EmployeeDocument {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
}

export default function DocumentsCard({ employeeId }: { employeeId: number }) {
  const [docs, setDocs] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // ------------------------------
  // LOAD DOCUMENTS
  // ------------------------------
  async function load() {
    const token = getAuthToken();

    const res = await fetch(`${API}/api/employees/${employeeId}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    setDocs(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // ------------------------------
  // FILE UPLOAD
  // ------------------------------
  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const token = getAuthToken();

    const res = await fetch(`${API}/api/employees/${employeeId}/documents`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const json = await res.json();

    setDocs((prev) => [json, ...prev]);
    setUploading(false);
  }

  // ------------------------------
  // DELETE DOCUMENT
  // ------------------------------
  async function deleteDoc(id: number) {
    if (!confirm("Delete this document?")) return;

    const token = getAuthToken();

    await fetch(`${API}/api/employees/${employeeId}/documents/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  // ------------------------------
  // RENDER UI
  // ------------------------------
  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Documents</h2>

        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
          Upload File
          <input
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {uploading && (
        <p className="text-sm text-gray-500">Uploading document...</p>
      )}

      {loading ? (
        <p>Loading documents…</p>
      ) : docs.length === 0 ? (
        <p className="text-gray-500 text-sm">No documents uploaded.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-2">File Name</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Date</th>
              <th className="text-right p-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {docs.map((doc) => (
              <tr key={doc.id} className="border-b">
                <td className="p-2">{doc.fileName}</td>
                <td className="p-2">{doc.fileType}</td>
                <td className="p-2">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </td>

                <td className="p-2 text-right flex justify-end gap-3">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </a>

                  <button
                    onClick={() => deleteDoc(doc.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
