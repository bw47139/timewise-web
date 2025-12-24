"use client";

import { useEffect, useRef, useState } from "react";

/**
 * --------------------------------------------------
 * Config
 * --------------------------------------------------
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const DEVICE_KEY = "tw_device_id";
const RESET_DELAY = 3000;

/**
 * --------------------------------------------------
 * Device ID (SYNC – NEVER ASYNC)
 * --------------------------------------------------
 */
function getDeviceIdSync() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/**
 * --------------------------------------------------
 * Safe punch formatter
 * --------------------------------------------------
 */
function formatPunchMessage(data: any) {
  if (!data) return null;

  const name = data.name || data.employeeName || "Employee";
  const action = data.action || "PUNCH";

  const timeValue = data.punchedAt || data.timestamp || null;
  const time = timeValue ? new Date(timeValue).toLocaleTimeString() : "";

  return `${name} — ${action}${time ? ` at ${time}` : ""}`;
}

/**
 * --------------------------------------------------
 * Kiosk Page
 * --------------------------------------------------
 */
export default function ClockKioskPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const deviceId = getDeviceIdSync();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");

  // --------------------------------------------------
  // Init camera
  // --------------------------------------------------
  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        setError("Camera access denied");
      }
    }

    initCamera();
  }, []);

  // --------------------------------------------------
  // Capture photo
  // --------------------------------------------------
  function capturePhoto(): Blob | null {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");

    const byteString = atob(dataUrl.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: "image/jpeg" });
  }

  // --------------------------------------------------
  // Face punch
  // --------------------------------------------------
  async function handleFaceScan() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const photo = capturePhoto();
    if (!photo) {
      setError("Camera error");
      setLoading(false);
      return;
    }

    const form = new FormData();
    form.append("photo", photo);
    form.append("locationId", "1");

    try {
      const res = await fetch(`${API_BASE}/api/clock/face`, {
        method: "POST",
        headers: { "x-device-id": deviceId },
        body: form,
      });

      const data = await res.json();

      if (!res.ok || data.matched === false || !data.employeeId) {
        setShowPin(true);
        setError("Face not recognized. Enter PIN.");
        return;
      }

      const msg = formatPunchMessage(data);
      if (!msg) {
        setShowPin(true);
        setError("Face not recognized. Enter PIN.");
        return;
      }

      setMessage(msg);
      autoReset();
    } catch {
      setShowPin(true);
      setError("Face scan failed. Enter PIN.");
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // PIN punch
  // --------------------------------------------------
  async function handlePinSubmit() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/clock/pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": deviceId,
        },
        body: JSON.stringify({
          pin,
          locationId: 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error();

      const msg = formatPunchMessage(data);
      if (!msg) throw new Error();

      setMessage(msg);
      autoReset();
    } catch {
      setError("Invalid PIN");
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // Reset
  // --------------------------------------------------
  function autoReset() {
    setTimeout(() => {
      setMessage(null);
      setError(null);
      setPin("");
      setShowPin(false);
    }, RESET_DELAY);
  }

  /**
   * --------------------------------------------------
   * PIN PAD LOGIC
   * --------------------------------------------------
   */
  function handleDigit(d: string) {
    setPin((prev) => (prev + d).slice(0, 6));
  }
  function handleDelete() {
    setPin((prev) => prev.slice(0, -1));
  }
  function handleClear() {
    setPin("");
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white px-4">
      <h1 className="text-3xl font-bold mb-6">TimeWise Clock</h1>

      <div className="relative w-full max-w-md">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="rounded-lg border border-gray-700"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {!showPin && (
        <button
          onClick={handleFaceScan}
          disabled={loading}
          className="mt-6 w-full max-w-md py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-xl font-semibold"
        >
          {loading ? "Scanning..." : "Scan Face"}
        </button>
      )}

      {showPin && (
        <div className="w-full max-w-md mt-6 bg-white rounded-xl p-6 shadow-2xl border-4 border-blue-600">
          <div className="text-xl font-bold mb-2 text-center text-gray-900">
            PIN REQUIRED
          </div>

          <div className="text-center text-sm text-gray-600 mb-4">
            Face not recognized — please enter your employee PIN
          </div>

          {/* INPUT FIELD */}
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="
              w-full
              px-4
              py-4
              text-3xl
              tracking-widest
              text-center
              bg-yellow-100
              text-black
              rounded-lg
              border-2
              border-gray-800
              focus:outline-none
              focus:ring-4
              focus:ring-blue-500
              mb-4
            "
          />

          {/* PIN PAD */}
          <div className="grid grid-cols-3 gap-3 mb-4 text-black">
            {["1","2","3","4","5","6","7","8","9"].map((n) => (
              <button
                key={n}
                onClick={() => handleDigit(n)}
                className="p-4 bg-gray-200 rounded-lg text-2xl font-bold"
              >
                {n}
              </button>
            ))}

            {/* CLEAR */}
            <button
              onClick={handleClear}
              className="p-4 bg-red-300 rounded-lg text-xl font-bold"
            >
              C
            </button>

            {/* ZERO */}
            <button
              onClick={() => handleDigit("0")}
              className="p-4 bg-gray-200 rounded-lg text-2xl font-bold"
            >
              0
            </button>

            {/* DELETE */}
            <button
              onClick={handleDelete}
              className="p-4 bg-yellow-300 rounded-lg text-xl font-bold"
            >
              ⌫
            </button>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            onClick={handlePinSubmit}
            disabled={loading || !pin}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xl font-bold"
          >
            SUBMIT PIN
          </button>
        </div>
      )}

      {message && (
        <div className="mt-6 p-4 bg-green-700 rounded w-full max-w-md text-center text-lg">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-700 rounded w-full max-w-md text-center text-lg">
          {error}
        </div>
      )}
    </div>
  );
}
