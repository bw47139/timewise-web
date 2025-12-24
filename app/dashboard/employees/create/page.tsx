"use client";

import { useState } from "react";
import { getAuthToken } from "@/components/authToken";

export default function EmployeeCreatePage() {
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [pin, setPin] = useState("");

  async function save() {
    const token = getAuthToken();

    await fetch("http://localhost:4000/api/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ firstName, lastName, pin }),
    });

    window.location.href = "/dashboard/employees";
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Create Employee</h1>

      <div className="space-y-4">
        <input className="border p-2" placeholder="First Name" onChange={e => setFirst(e.target.value)} />
        <input className="border p-2" placeholder="Last Name" onChange={e => setLast(e.target.value)} />
        <input className="border p-2" placeholder="PIN" onChange={e => setPin(e.target.value)} />

        <button onClick={save} className="bg-blue-600 text-white px-4 py-2 rounded">
          Save
        </button>
      </div>
    </div>
  );
}
