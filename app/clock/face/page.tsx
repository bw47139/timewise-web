import { redirect } from "next/navigation";

/**
 * This route should never render FaceClockClient directly.
 * The canonical kiosk lives at /clock.
 */
export default function FaceClockRedirectPage() {
  redirect("/clock");
}
