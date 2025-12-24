"use client";

import { useEffect, useState } from "react";
import RequireRole from "@/components/auth/RequireRole";
import dayjs from "dayjs";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface Device {
  id: number;
  deviceId: string;
  name?: string | null;
  isApproved: boolean;
  isActive: boolean;
  lastSeenAt: string | null;
  location: {
    id: number;
    name: string;
  };
}

function getStatus(device: Device) {
  if (!device.isActive) return "DISABLED";
  if (!device.isApproved) return "UNAPPROVED";
  if (!device.lastSeenAt) return "OFFLINE";

  const minutesAgo =
    (Date.now() - new Date(device.lastSeenAt).getTime()) / 60000;

  if (minutesAgo < 2) return "ONLINE";
  if (minutesAgo < 10) return "IDLE";
  return "OFFLINE";
}

function statusColor(status: string) {
  switch (status) {
    case "ONLINE":
      return "bg-green-600";
    case "IDLE":
      return "bg-yellow-500";
    case "OFFLINE":
      return "bg-red-600";
    case "DISABLED":
      return "bg-gray-400";
    case "UNAPPROVED":
      return "bg-orange-500";
    default:
      return "bg-gray-300";
  }
}

export default function DevicesSettingsPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch(`${API}/api/clock/device`, {
      credentials: "include",
    });
    setDevices(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000); // auto refresh
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading kiosk health…</div>;

  return (
    <RequireRole allow={["ADMIN", "OWNER"]}>
      <div>
        <h1 className="text-2xl font-bold mb-4">
          Kiosk Health Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((d) => {
            const status = getStatus(d);

            return (
              <div
                key={d.id}
                className="border rounded bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">
                    {d.name || "Unnamed Kiosk"}
                  </div>
                  <span
                    className={`text-xs text-white px-2 py-1 rounded ${statusColor(
                      status
                    )}`}
                  >
                    {status}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  Location: <b>{d.location.name}</b>
                </div>

                <div className="text-xs text-gray-400 mt-1">
                  Device ID: {d.deviceId}
                </div>

                <div className="text-sm mt-3">
                  Last Seen:{" "}
                  {d.lastSeenAt
                    ? dayjs(d.lastSeenAt).format(
                        "MMM D, YYYY h:mm A"
                      )
                    : "Never"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </RequireRole>
  );
}
