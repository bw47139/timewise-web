"use client";

import { useState } from "react";

type Props = {
  employeeId: number;
  faceEnabled: boolean;
  onUpdated?: () => Promise<void>; // ✅ ADD THIS
};

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function EmployeeFaceEnrollmentCard({
  employeeId,
  faceEnabled,
  onUpdated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function enrollFace(file: File) {
    setLoading(true);
    setMessage(null);

    try {
      const form = new FormData();
      form.append("photo", file);
      form.append("employeeId", String(employeeId));

      const res = await fetch(`${API}/api/face/enroll`, {
        method: "POST",
        credentials: "include",
        body: form,
      });

      if (!res.ok) {
        setMessage("Face enrollment failed");
      } else {
        setMessage("Face enrolled successfully");

        // ✅ Notify parent to reload employee data
        if (onUpdated) {
          await onUpdated();
        }
      }
    } catch (err) {
      setMessage("Face enrollment failed");
    } finally {
      setLoading(false);
    }
  }

  async function removeFace() {
    setLoading(true);
    setMessage(null);

    try {
      await fetch(`${API}/api/face/${employeeId}`, {
        method: "DELETE",
        credentials: "include",
      });

      setMessage("Face enrollment removed");

      // ✅ Notify parent to reload employee data
      if (onUpdated) {
        await onUpdated();
      }
    } catch (err) {
      setMessage("Failed to remove face enrollment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded border bg-white p-4 space-y-4">
      <h2 className="font-semibold">Face Recognition</h2>

      <p className="text-sm">
        Status:{" "}
        <span
          className={
            faceEnabled ? "text-green-600" : "text-gray-500"
          }
        >
          {faceEnabled ? "Enrolled" : "Not enrolled"}
        </span>
      </p>

      <input
        type="file"
        accept="image/*"
        disabled={loading}
        onChange={(e) => {
          if (e.target.files?.[0]) {
            enrollFace(e.target.files[0]);
          }
        }}
      />

      {faceEnabled && (
        <button
          onClick={removeFace}
          disabled={loading}
          className="text-sm text-red-600 underline"
        >
          Remove face enrollment
        </button>
      )}

      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
