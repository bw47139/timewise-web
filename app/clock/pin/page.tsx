"use client";

import { useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function PinClockPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const [employee, setEmployee] = useState<any>(null);
  const [punchLoading, setPunchLoading] = useState(false);

  // Used to show success card after punch
  const [lastPunchResult, setLastPunchResult] = useState<any>(null);

  // ------------------------------------------------------
  // Handle PIN Submit → Identify employee
  // ------------------------------------------------------
  const handlePinSubmit = async (e: any) => {
    e.preventDefault();
    if (!pin) return toast.error("Enter your PIN");

    setLoading(true);

    try {
      const res = await api.post("/clock/pin", { pin });
      setEmployee(res.data);
      setLastPunchResult(null); // clear previous punch card
      toast.success("Employee found");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Invalid PIN");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------
  // Punch In / Punch Out
  // ------------------------------------------------------
  const handlePunch = async () => {
    if (!employee) return;

    setPunchLoading(true);

    try {
      const res = await api.post("/clock/punch", {
        employeeId: employee.id,
      });

      toast.success(res.data.message);

      // Show punch result
      setLastPunchResult({
        employeeName: `${employee.firstName} ${employee.lastName}`,
        type: res.data.newStatus,
        time: new Date().toLocaleString(),
      });

      // 🔥 Require a NEW PIN for next punch
      setEmployee(null);
      setPin(""); // clear PIN input
    } catch (err: any) {
      console.error(err);
      toast.error("Punch failed");
    } finally {
      setPunchLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto text-center">
      <h1 className="text-3xl font-bold mb-6">Time Clock — PIN</h1>

      {/* ========================== */}
      {/* SUCCESS PUNCH RESULT CARD */}
      {/* ========================== */}
      {lastPunchResult && (
        <div className="bg-green-50 rounded border border-green-300 p-4 shadow mb-6">
          <h2 className="text-xl font-semibold text-green-700">
            Punch Successful
          </h2>

          <div className="mt-2 text-green-900 text-sm space-y-1">
            <p>
              <span className="font-medium">Employee:</span>{" "}
              {lastPunchResult.employeeName}
            </p>
            <p>
              <span className="font-medium">Type:</span>{" "}
              {lastPunchResult.type}
            </p>
            <p>
              <span className="font-medium">Time:</span>{" "}
              {lastPunchResult.time}
            </p>
          </div>

          <p className="mt-4 text-yellow-700 bg-yellow-100 border border-yellow-300 p-2 rounded text-sm">
            Enter PIN again for the next punch.
          </p>
        </div>
      )}

      {/* ========================== */}
      {/* PIN ENTRY FORM */}
      {/* ========================== */}
      {!employee && (
        <form onSubmit={handlePinSubmit} className="space-y-4 mb-8">
          <input
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setLastPunchResult(null);
            }}
            className="w-full border rounded px-3 py-2 text-center text-xl tracking-widest"
          />

          <button
            className="w-full bg-blue-600 text-white py-3 rounded text-xl hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? "Checking..." : "Submit PIN"}
          </button>
        </form>
      )}

      {/* ========================== */}
      {/* EMPLOYEE FOUND → SHOW DATA */}
      {/* ========================== */}
      {employee && (
        <div>
          {/* PHOTO */}
          <div className="flex justify-center">
            {employee.photoUrl ? (
              <img
                src={employee.photoUrl}
                className="w-32 h-32 rounded-full object-cover border shadow"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                No Photo
              </div>
            )}
          </div>

          {/* NAME */}
          <h2 className="mt-4 text-2xl font-bold">
            {employee.firstName} {employee.lastName}
          </h2>

          {/* STATUS */}
          <p className="mt-2 text-gray-600">
            Status:{" "}
            {employee.lastPunchType === "IN"
              ? "Currently Clocked In"
              : "Currently Clocked Out"}
          </p>

          {/* PUNCH BUTTON */}
          <button
            onClick={handlePunch}
            className={`mt-6 w-full py-4 rounded text-xl text-white ${
              employee.lastPunchType === "IN"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
            disabled={punchLoading}
          >
            {punchLoading
              ? "Processing..."
              : employee.lastPunchType === "IN"
              ? "Punch Out"
              : "Punch In"}
          </button>

          {/* Back to PIN Screen */}
          <button
            onClick={() => {
              setEmployee(null);
              setPin("");
            }}
            className="mt-4 text-blue-600 underline"
          >
            Enter a Different PIN
          </button>
        </div>
      )}
    </div>
  );
}
