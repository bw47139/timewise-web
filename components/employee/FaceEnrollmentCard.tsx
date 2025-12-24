"use client";

import { useState } from "react";
import { getAuthToken } from "@/components/authToken";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface Props {
  employeeId: number;
  photoUrl?: string | null;
  faceEnabled?: boolean;
  onUpdated: () => void;
}

export default function FaceEnrollmentCard({
  employeeId,
  photoUrl,
  faceEnabled,
  onUpdated,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  // --------------------------------------------------
  // Upload photo
  // --------------------------------------------------
  async function uploadPhoto(file: File) {
    setUploading(true);
    const token = getAuthToken();

    const form = new FormData();
    form.append("photo", file);

    const res = await fetch(
      `${API}/api/employee/${employeeId}/photo`,
      {
        method: "POST",
        body: form,
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
        credentials: "include",
      }
    );

    setUploading(false);
    if (res.ok) onUpdated();
  }

  // --------------------------------------------------
  // Enroll face
  // --------------------------------------------------
  async function enrollFace() {
    setEnrolling(true);
    const token = getAuthToken();

    const res = await fetch(
      `${API}/api/face/enroll/${employeeId}`,
      {
        method: "POST",
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
        credentials: "include",
      }
    );

    setEnrolling(false);
    if (res.ok) onUpdated();
  }

  return (
    <div className="bg-white shadow rounded p-4 space-y-4">
      <h2 className="text-lg font-semibold">
        Profile Photo & Face Recognition
      </h2>

      <div className="flex items-center gap-4">
        <img
          src={photoUrl || "/avatar-placeholder.png"}
          alt="Employee"
          className="w-24 h-24 rounded-full object-cover border"
        />

        <label className="cursor-pointer text-sm text-blue-600">
          {uploading ? "Uploading..." : "Upload Photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) =>
              e.target.files &&
              uploadPhoto(e.target.files[0])
            }
          />
        </label>
      </div>

      <div className="border-t pt-4 flex justify-between items-center">
        <div>
          <p className="font-medium">Face Recognition</p>
          <p className="text-sm text-gray-600">
            Status:{" "}
            {faceEnabled ? (
              <span className="text-green-600">Enrolled</span>
            ) : (
              <span className="text-red-600">Not Enrolled</span>
            )}
          </p>
        </div>

        <button
          disabled={!photoUrl || enrolling}
          onClick={enrollFace}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {enrolling ? "Enrolling..." : "Enroll Face"}
        </button>
      </div>
    </div>
  );
}
