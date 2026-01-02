"use client";

import { useState } from "react";

interface EmployeePhotoUploadCardProps {
  employeeId: number;
  photoUrl?: string | null;
  onUploaded?: () => void;
}

export default function EmployeePhotoUploadCard({
  employeeId,
  photoUrl,
  onUploaded,
}: EmployeePhotoUploadCardProps) {
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/employee/${employeeId}/photo`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      // 🔑 Notify parent page to reload employee
      onUploaded?.();
    } catch (err) {
      console.error("Photo upload failed", err);
      alert("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-sm">Employee Photo</h3>

      {photoUrl ? (
        <img
          src={photoUrl}
          alt="Employee"
          className="h-32 w-32 object-cover rounded-md"
        />
      ) : (
        <div className="h-32 w-32 bg-gray-100 rounded-md flex items-center justify-center text-sm">
          No photo
        </div>
      )}

      <label className="block">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
        <span className="inline-block px-3 py-1 text-sm bg-blue-600 text-white rounded cursor-pointer">
          {uploading ? "Uploading..." : "Upload Photo"}
        </span>
      </label>
    </div>
  );
}
