"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// ⛔ Face camera must be client-only
const FaceClockClient = dynamic(
  () => import("./face/FaceClockClient"),
  { ssr: false }
);

// ❗ IMPORTANT
// All browser requests must go through /api/* so cookies are sent correctly

const DEVICE_ID = "dev-postman-001";
const LOCATION_ID = 1;

// 🔐 Supervisor PIN (temporary)
const SUPERVISOR_PIN = "9999";

// ⏱ UI reset delay
const RESET_DELAY = 5000;

// 📦 Offline queue key
const QUEUE_KEY = "timewise_offline_queue";

type OfflinePunch = {
  pin: string;
  locationId: number;
  timestamp: string;
};

export default function ClockPage() {
  const [mode, setMode] = useState<"face" | "pin" | "supervisor">("face");
  const [locked, setLocked] = useState(false);

  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔊 Sounds
  const successSound = useRef<HTMLAudioElement | null>(null);
  const errorSound = useRef<HTMLAudioElement | null>(null);

  // ------------------------
  // INIT
  // ------------------------
  useEffect(() => {
    successSound.current = new Audio("/sounds/success.wav");
    errorSound.current = new Audio("/sounds/error.wav");
    flushOfflineQueue();
  }, []);

  // ------------------------
  // AUTO RESET
  // ------------------------
  useEffect(() => {
    if (message || error) {
      const t = setTimeout(() => {
        setMessage(null);
        setError(null);
        setPin("");
        setMode("face");
      }, RESET_DELAY);
      return () => clearTimeout(t);
    }
  }, [message, error]);

  // ------------------------
  // OFFLINE QUEUE HELPERS
  // ------------------------
  const getQueue = (): OfflinePunch[] => {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  };

  const saveQueue = (queue: OfflinePunch[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  };

  const queueOfflinePunch = (pin: string) => {
    const queue = getQueue();
    queue.push({
      pin,
      locationId: LOCATION_ID,
      timestamp: new Date().toISOString(),
    });
    saveQueue(queue);
  };

  const flushOfflineQueue = async () => {
    const queue = getQueue();
    if (!queue.length) return;

    for (const item of queue) {
      try {
        await fetch("/api/clock/pin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-device-id": DEVICE_ID,
          },
          body: JSON.stringify({
            pin: item.pin,
            locationId: item.locationId,
          }),
        });
      } catch {
        return; // still offline
      }
    }

    saveQueue([]);
  };

  // ------------------------
  // PIN SUBMIT
  // ------------------------
  const submitPin = async () => {
    if (pin.length < 4) return;

    // 🔐 Supervisor override
    if (mode === "supervisor") {
      if (pin === SUPERVISOR_PIN) {
        setLocked(false);
        successSound.current?.play();
        setMessage("Supervisor override successful");
      } else {
        errorSound.current?.play();
        setError("Invalid supervisor PIN");
      }
      setPin("");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/clock/pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": DEVICE_ID,
        },
        body: JSON.stringify({
          pin,
          locationId: LOCATION_ID,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.error === "Device not authorized") {
          setLocked(true);
          errorSound.current?.play();
          return;
        }

        errorSound.current?.play();
        setError(data?.error || "Punch failed");
      } else {
        successSound.current?.play();
        setMessage(`${data.employeeName} punched ${data.punchType}`);
      }
    } catch {
      queueOfflinePunch(pin);
      successSound.current?.play();
      setMessage("Saved offline – will sync automatically");
    } finally {
      setPin("");
      setLoading(false);
    }
  };

  const addDigit = (d: string) =>
    pin.length < 6 && setPin((p) => p + d);

  const clearPin = () => setPin("");

  // ------------------------
  // 🔒 LOCK SCREEN
  // ------------------------
  if (locked) {
    return (
      <main className="flex flex-col items-center justify-center h-screen bg-red-50 px-4">
        <h1 className="text-3xl font-bold text-red-700 mb-4">
          Device Locked
        </h1>
        <p className="text-red-600 mb-6 text-center">
          Supervisor authorization required
        </p>

        <button
          onClick={() => setMode("supervisor")}
          className="text-blue-600 underline"
        >
          Supervisor Override
        </button>

        <p className="mt-6 text-xs text-gray-500">
          Device ID: {DEVICE_ID}
        </p>
      </main>
    );
  }

  // ------------------------
  // UI
  // ------------------------
  return (
    <main className="flex flex-col items-center justify-center h-screen bg-gray-50 px-4">
      <h1 className="text-3xl font-bold mb-2">TimeWise Clock</h1>

      {mode === "face" && (
        <>
          <FaceClockClient
            deviceId={DEVICE_ID}
            locationId={LOCATION_ID}
            onFallbackToPin={() => setMode("pin")}
            onSuccess={(msg: string) => {
              successSound.current?.play();
              setMessage(msg);
            }}
            onError={(err: string) => {
              errorSound.current?.play();
              setError(err);
            }}
          />

          <button
            onClick={() => setMode("pin")}
            className="mt-6 text-sm text-blue-600 underline"
          >
            Use PIN instead
          </button>
        </>
      )}

      {(mode === "pin" || mode === "supervisor") && (
        <>
          <p className="text-gray-500 mb-3">
            {mode === "supervisor"
              ? "Supervisor PIN"
              : "Enter your PIN"}
          </p>

          <div className="mb-4 text-2xl tracking-widest font-mono">
            {pin.replace(/./g, "•")}
          </div>

          {message && (
            <div className="mb-4 text-green-600 font-semibold">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 text-red-600 font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 w-64">
            {[1,2,3,4,5,6,7,8,9].map((n) => (
              <button
                key={n}
                onClick={() => addDigit(String(n))}
                className="h-16 rounded-lg bg-white shadow text-xl font-bold"
              >
                {n}
              </button>
            ))}

            <button
              onClick={clearPin}
              className="h-16 rounded-lg bg-red-100 text-red-700"
            >
              Clear
            </button>

            <button
              onClick={() => addDigit("0")}
              className="h-16 rounded-lg bg-white shadow text-xl font-bold"
            >
              0
            </button>

            <button
              onClick={submitPin}
              disabled={pin.length < 4 || loading}
              className="h-16 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
            >
              Enter
            </button>
          </div>

          <button
            onClick={() => setMode("face")}
            className="mt-6 text-sm text-blue-600 underline"
          >
            Back
          </button>
        </>
      )}
    </main>
  );
}
