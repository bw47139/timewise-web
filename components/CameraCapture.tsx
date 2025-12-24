"use client";

import { useEffect, useRef, useState } from "react";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Unable to access camera");
      }
    }

    startCamera();

    return () => {
      // stop stream when closing
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
      }
    };
  }, []);

  function handleCapture() {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camera-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      onCapture(file);
    }, "image/jpeg");
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">Capture Photo</h2>

        {error && (
          <div className="bg-red-100 text-red-600 p-2 mb-2 rounded">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded border mb-3"
          />

          <div className="flex justify-between w-full mt-2">
            <button
              type="button"
              onClick={handleCapture}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Capture
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
