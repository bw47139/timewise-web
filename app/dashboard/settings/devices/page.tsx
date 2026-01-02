"use client";

import RequireRole from "@/components/auth/RequireRole";

/**
 * ----------------------------------------------------
 * Devices / Kiosk Health Dashboard
 * ----------------------------------------------------
 * - Admin-only page
 * - OWNER role is NOT part of the Role union
 * - RequireRole expects allow: Role[]
 * ----------------------------------------------------
 */

export default function DevicesSettingsPage() {
  return (
    <RequireRole allow={["ADMIN"]}>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">
          Kiosk Health Dashboard
        </h1>

        <p className="text-gray-600">
          Monitor registered kiosk devices, camera health,
          and punch activity status.
        </p>

        {/* ------------------------------------------------
            FUTURE IMPLEMENTATION
            ------------------------------------------------
            - Device list table
            - Device ID / name
            - Location assignment
            - Last heartbeat timestamp
            - Camera availability
            - Approved / blocked status
            - Revoke / disable device action
        ------------------------------------------------ */}
      </div>
    </RequireRole>
  );
}
