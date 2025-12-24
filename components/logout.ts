"use client";

export function logout() {
  // Clear auth cookie
  document.cookie = "tw_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  window.location.href = "/login";
}
