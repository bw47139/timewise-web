"use client";

import { useState } from "react";

type Props = {
  employeeId: number;
  photoUrl?: string | null;
};

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function EmployeePhotoCard({
  employeeId,
  photoUrl,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append("photo", file);

    const res = await fetch(
      `${API}/api/employees/${employeeId}/photo`,
      {
        method: "POST",
        credentials: "include",
        body: form,
      }
    );

    if (!res.ok) {
      setError("Failed to upload photo");
    } else {
      window.location.reload(); // simple + reliable
    }

    setUploading(false);
  }

  return (
    <div className="rounded border bg-white p-4 space-y-4">
      <h2 className="font-semibold">Employee Photo</h2>

      {photoUrl ? (
        <img
          src={photoUrl}
          alt="Employee"
          className="h-40 w-40 object-cover rounded border"
        />
      ) : (
        <div className="h-40 w-40 flex items-center justify-center border rounded text-gray-400">
          No photo
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleUpload(e.target.files[0]);
          }
        }}
      />

      {uploading && <p className="text-sm">Uploading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
