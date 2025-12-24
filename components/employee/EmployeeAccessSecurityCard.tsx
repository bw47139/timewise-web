"use client";

import { useState } from "react";

type ClockAccessMethod = "PIN" | "FACE" | "BOTH";

export default function EmployeeAccessSecurityCard({
  employeeId,
}: {
  employeeId: number;
}) {
  // UI-first placeholders (real data later)
  const [pinMasked] = useState("••••");
  const [faceEnrolled] = useState(true);
  const [accessMethod, setAccessMethod] =
    useState<ClockAccessMethod>("BOTH");

  return (
    <div className="max-w-2xl rounded border bg-white p-4 space-y-5">
      <h2 className="text-lg font-semibold">
        Access & Security
      </h2>

      {/* PIN */}
      <div className="border rounded p-3 space-y-2">
        <h3 className="font-medium text-sm">PIN Access</h3>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <p className="text-gray-500">Current PIN</p>
            <p className="font-mono">{pinMasked}</p>
          </div>

          <button
            disabled
            className="px-3 py-1 border rounded text-sm cursor-not-allowed text-gray-400"
          >
            Reset PIN
          </button>
        </div>
      </div>

      {/* Face Recognition */}
      <div className="border rounded p-3 space-y-2">
        <h3 className="font-medium text-sm">
          Face Recognition
        </h3>

        <div className="flex items-center justify-between">
          <p className="text-sm">
            Status:{" "}
            <span
              className={
                faceEnrolled
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {faceEnrolled ? "Enrolled" : "Not Enrolled"}
            </span>
          </p>

          <button
            disabled
            className="px-3 py-1 border rounded text-sm cursor-not-allowed text-gray-400"
          >
            {faceEnrolled ? "Re-Enroll" : "Enroll"}
          </button>
        </div>
      </div>

      {/* Clock-In Methods */}
      <div className="border rounded p-3 space-y-2">
        <h3 className="font-medium text-sm">
          Allowed Clock-In Methods
        </h3>

        <select
          className="w-full rounded border p-2 text-sm"
          value={accessMethod}
          onChange={(e) =>
            setAccessMethod(e.target.value as ClockAccessMethod)
          }
        >
          <option value="PIN">PIN Only</option>
          <option value="FACE">Face Only</option>
          <option value="BOTH">PIN + Face</option>
        </select>

        <p className="text-xs text-gray-500">
          Controls how this employee can clock in at kiosks.
        </p>
      </div>

      {/* Device Enforcement */}
      <div className="border rounded p-3 text-sm text-gray-500">
        Device enforcement is enabled at the location
        level.
      </div>

      <button
        disabled
        className="rounded bg-gray-400 px-4 py-2 text-white cursor-not-allowed"
      >
        Save (Security wiring coming next)
      </button>
    </div>
  );
}
