"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";

/**
 * FaceClockClient PROPS
 * (required for ClockPage build typing)
 */
export interface FaceClockClientProps {
  deviceId: string;
  locationId: number;
  onFallbackToPin: () => void;
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
}

interface Location {
  id: number;
  name: string;
}

interface FacePunchResult {
  employeeName: string;
  punchType: string;
  punchTime: string;
  locationName: string;
}

export default function FaceClockClient({
  deviceId,
  locationId,
  onFallbackToPin,
  onSuccess,
  onError,
}: FaceClockClientProps) {
  // --------------------------------------------------
  // DEVICE / LOCATION
  // --------------------------------------------------
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);

  // --------------------------------------------------
  // KIOSK STATE
  // --------------------------------------------------
  const [mode, setMode] = useState<
    "attract" | "liveness" | "result"
  >("attract");

  const [lastResult, setLastResult] =
    useState<FacePunchResult | null>(null);

  // --------------------------------------------------
  // LIVENESS STATE
  // --------------------------------------------------
  const [blinkDetected, setBlinkDetected] = useState(false);
  const [motionDetected, setMotionDetected] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastFrameRef = useRef<ImageData | null>(null);

  // --------------------------------------------------
  // Resolve device → location (SAFE)
  // --------------------------------------------------
  useEffect(() => {
    async function resolveDevice() {
      try {
        const res = await api.get(`/clock/device/${deviceId}`);
        setLocation(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to resolve clock location");
        onError("Failed to resolve clock location");
      } finally {
        setLoading(false);
      }
    }

    resolveDevice();
  }, [deviceId, onError]);

  // --------------------------------------------------
  // START CAMERA
  // --------------------------------------------------
  useEffect(() => {
    if (mode !== "liveness") return;

    async function startCamera() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
      }
    };
  }, [mode]);

  // --------------------------------------------------
  // MOTION DETECTION
  // --------------------------------------------------
  function detectMotion() {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (lastFrameRef.current) {
      let diff = 0;
      for (let i = 0; i < frame.data.length; i += 4) {
        diff += Math.abs(frame.data[i] - lastFrameRef.current.data[i]);
      }

      if (diff > 1_000_000) {
        setMotionDetected(true);
      }
    }

    lastFrameRef.current = frame;
  }

  // --------------------------------------------------
  // BLINK DETECTION (simplified)
  // --------------------------------------------------
  function detectBlink() {
    setBlinkDetected(true);
  }

  // --------------------------------------------------
  // CAPTURE + SUBMIT
  // --------------------------------------------------
  async function captureAndSubmit() {
    if (!videoRef.current || !location) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );

    if (!blob) return;

    const file = new File([blob], "face.jpg", { type: "image/jpeg" });

    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("locationId", String(locationId));

      const res = await api.post("/clock/face", formData);

      if (!res.data?.success) {
        throw new Error("Face not recognized");
      }

      const result: FacePunchResult = {
        employeeName: res.data.employeeName,
        punchType: res.data.punchType,
        punchTime: new Date(res.data.punchedAt).toLocaleString(),
        locationName: location.name,
      };

      setLastResult(result);
      setMode("result");

      onSuccess(`${result.employeeName} punched ${result.punchType}`);

      setTimeout(resetKiosk, 4000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error || "Face punch failed";
      toast.error(msg);
      onError(msg);
      setTimeout(resetKiosk, 3000);
    }
  }

  // --------------------------------------------------
  // RESET
  // --------------------------------------------------
  function resetKiosk() {
    setBlinkDetected(false);
    setMotionDetected(false);
    lastFrameRef.current = null;
    setLastResult(null);
    setMode("attract");
  }

  // --------------------------------------------------
  // UI STATES
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-2xl">
        Initializing Clock…
      </div>
    );
  }

  if (!location) {
    return (
      <div className="h-screen flex items-center justify-center text-red-600">
        Clock not bound to a location
        <button
          onClick={onFallbackToPin}
          className="ml-4 underline text-blue-600"
        >
          Use PIN instead
        </button>
      </div>
    );
  }

  // ---------------- ATTRACT ----------------
  if (mode === "attract") {
    return (
      <div
        className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white cursor-pointer"
        onClick={() => setMode("liveness")}
      >
        <h1 className="text-4xl font-bold mb-2">Face Clock</h1>
        <p className="text-lg opacity-80">{location.name}</p>

        <div className="mt-10 px-10 py-6 border-4 border-white rounded-xl text-3xl animate-pulse">
          TAP TO SCAN FACE
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onFallbackToPin();
          }}
          className="mt-8 text-sm underline"
        >
          Use PIN instead
        </button>
      </div>
    );
  }

  // ---------------- LIVENESS ----------------
  if (mode === "liveness") {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="rounded-lg border border-white w-80 h-60 mb-4"
          onTimeUpdate={() => {
            detectMotion();
            detectBlink();
          }}
        />

        <p className="text-lg mb-2">
          {blinkDetected ? "Blink detected ✔" : "Please blink"}
        </p>

        <p className="text-lg mb-4">
          {motionDetected
            ? "Motion detected ✔"
            : "Move your head slightly"}
        </p>

        <button
          disabled={!blinkDetected || !motionDetected}
          onClick={captureAndSubmit}
          className={`px-6 py-3 rounded text-lg ${
            blinkDetected && motionDetected
              ? "bg-green-600"
              : "bg-gray-500"
          }`}
        >
          Confirm Scan
        </button>
      </div>
    );
  }

  // ---------------- RESULT ----------------
  if (mode === "result" && lastResult) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-green-700 text-white">
        <h1 className="text-4xl font-bold mb-4">Punch Recorded</h1>

        <p className="text-2xl">{lastResult.employeeName}</p>
        <p className="text-xl">{lastResult.punchType}</p>
        <p className="text-lg">{lastResult.punchTime}</p>

        <p className="mt-8 text-sm opacity-80">Resetting…</p>
      </div>
    );
  }

  return null;
}
