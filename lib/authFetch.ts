const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

/**
 * authFetch
 * --------------------------------------------------
 * - Always sends credentials
 * - Detects session expiration (401)
 * - Redirects to login with banner
 */
export async function authFetch(
  input: RequestInfo,
  init: RequestInit = {}
) {
  const res = await fetch(input, {
    ...init,
    credentials: "include",
  });

  if (res.status === 401) {
    // 🔥 Session expired
    if (typeof window !== "undefined") {
      window.location.href = "/login?expired=1";
    }
    throw new Error("Session expired");
  }

  return res;
}
