"use client";

import { useState } from "react";

type EmploymentInfo = {
  hireDate?: string;
  employmentType?: string;
  jobTitle?: string;
  department?: string;
  location?: string;
  supervisor?: string;
  status?: string;
};

export default function EmployeeEmploymentCard({
  employeeId,
  initialStatus,
}: {
  employeeId: number;
  initialStatus: string;
}) {
  // UI-first: local state only (DB later)
  const [employment, setEmployment] = useState<EmploymentInfo>({
    hireDate: "",
    employmentType: "Full-time",
    jobTitle: "",
    department: "",
    location: "",
    supervisor: "",
    status: initialStatus,
  });

  return (
    <div className="max-w-2xl rounded border bg-white p-4 space-y-4">
      <h2 className="text-lg font-semibold">Employment Details</h2>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <label className="text-gray-500">Hire Date</label>
          <input
            type="date"
            className="w-full rounded border p-2"
            value={employment.hireDate}
            onChange={(e) =>
              setEmployment({ ...employment, hireDate: e.target.value })
            }
          />
        </div>

        <div>
          <label className="text-gray-500">Employment Type</label>
          <select
            className="w-full rounded border p-2"
            value={employment.employmentType}
            onChange={(e) =>
              setEmployment({
                ...employment,
                employmentType: e.target.value,
              })
            }
          >
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Contractor</option>
          </select>
        </div>

        <div>
          <label className="text-gray-500">Job Title</label>
          <input
            className="w-full rounded border p-2"
            placeholder="Job title"
            value={employment.jobTitle}
            onChange={(e) =>
              setEmployment({ ...employment, jobTitle: e.target.value })
            }
          />
        </div>

        <div>
          <label className="text-gray-500">Department</label>
          <input
            className="w-full rounded border p-2"
            placeholder="Department"
            value={employment.department}
            onChange={(e) =>
              setEmployment({ ...employment, department: e.target.value })
            }
          />
        </div>

        <div>
          <label className="text-gray-500">Location</label>
          <input
            className="w-full rounded border p-2"
            placeholder="Location"
            value={employment.location}
            onChange={(e) =>
              setEmployment({ ...employment, location: e.target.value })
            }
          />
        </div>

        <div>
          <label className="text-gray-500">Supervisor</label>
          <input
            className="w-full rounded border p-2"
            placeholder="Supervisor name"
            value={employment.supervisor}
            onChange={(e) =>
              setEmployment({ ...employment, supervisor: e.target.value })
            }
          />
        </div>

        <div className="col-span-2">
          <label className="text-gray-500">Employment Status</label>
          <input
            className="w-full rounded border p-2 bg-gray-100"
            value={employment.status}
            disabled
          />
        </div>
      </div>

      <button
        disabled
        className="rounded bg-gray-400 px-4 py-2 text-white cursor-not-allowed"
      >
        Save (DB wiring coming next)
      </button>
    </div>
  );
}
