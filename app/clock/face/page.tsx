import { Suspense } from "react";
import FaceClockClient from "./FaceClockClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center text-2xl">
          Loading Clock…
        </div>
      }
    >
      <FaceClockClient />
    </Suspense>
  );
}
