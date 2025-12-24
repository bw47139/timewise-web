"use client";

type ClockMethod = "PIN" | "FACE" | "BOTH";

export default function EmployeeTimeAttendanceCard({
  employeeId,
}: {
  employeeId: number;
}) {
  // UI-first placeholders (backend later)
  const clockMethod: ClockMethod = "BOTH";
  const assignedLocation = "Main Location";
  const defaultSchedule = "Mon–Fri, 9:00 AM – 5:00 PM";
  const lastPunch = "Today at 9:02 AM";

  return (
    <div className="max-w-3xl rounded border bg-white p-4 space-y-4">
      <h2 className="text-lg font-semibold">
        Time & Attendance
      </h2>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <label className="text-gray-500">
            Clock-In Method
          </label>
          <input
            className="w-full rounded border p-2 bg-gray-100"
            value={clockMethod}
            disabled
          />
        </div>

        <div>
          <label className="text-gray-500">
            Assigned Location
          </label>
          <input
            className="w-full rounded border p-2 bg-gray-100"
            value={assignedLocation}
            disabled
          />
        </div>

        <div>
          <label className="text-gray-500">
            Default Schedule
          </label>
          <input
            className="w-full rounded border p-2 bg-gray-100"
            value={defaultSchedule}
            disabled
          />
        </div>

        <div>
          <label className="text-gray-500">
            Last Punch
          </label>
          <input
            className="w-full rounded border p-2 bg-gray-100"
            value={lastPunch}
            disabled
          />
        </div>
      </div>

      <div className="border-t pt-4 space-y-2">
        <h3 className="font-medium text-sm">
          Timecard Summary (Current Period)
        </h3>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Regular</p>
            <p className="font-medium">32.0 hrs</p>
          </div>

          <div>
            <p className="text-gray-500">Overtime</p>
            <p className="font-medium">2.5 hrs</p>
          </div>

          <div>
            <p className="text-gray-500">Total</p>
            <p className="font-semibold">34.5 hrs</p>
          </div>
        </div>
      </div>

      <button
        disabled
        className="rounded bg-gray-400 px-4 py-2 text-white cursor-not-allowed"
      >
        View Full Timecard (coming next)
      </button>
    </div>
  );
}
