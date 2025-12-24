"use client";

import { useState } from "react";
import PayrollPunchRow from "./PayrollPunchRow";

export default function PayrollDayRow({
  day,
}: {
  day: {
    date: string;
    regularHours: number;
    overtimeHours: number;
    doubletimeHours?: number;
    ptoHours?: number;
    punches?: {
      type: "IN" | "OUT" | "BREAK_START" | "BREAK_END";
      time: string | null;
    }[];
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t">
      {/* DAY HEADER */}
      <div
        className="flex justify-between px-8 py-2 cursor-pointer hover:bg-gray-100 text-sm"
        onClick={() => setOpen(!open)}
      >
        <div className="font-medium">{day.date}</div>

        <div className="text-gray-700">
          Reg: {day.regularHours} · OT: {day.overtimeHours}
          {day.doubletimeHours
            ? ` · DT: ${day.doubletimeHours}`
            : ""}
          {day.ptoHours ? ` · PTO: ${day.ptoHours}` : ""}
        </div>
      </div>

      {/* PUNCH LIST */}
      {open && (
        <div className="bg-gray-50">
          {day.punches && day.punches.length > 0 ? (
            day.punches.map((p, i) => (
              <PayrollPunchRow key={i} punch={p} />
            ))
          ) : (
            <div className="px-12 py-2 text-xs text-gray-400">
              No punches recorded
            </div>
          )}
        </div>
      )}
    </div>
  );
}
