"use client";

export async function authFetch(
  url: string,
  options: RequestInit = {}
) {
  // Read token from cookie
  const token = document.cookie
    .split("; ")
    .find((c) => c.startsWith("tw_token="))
    ?.split("=")[1];

  if (!token) {
    throw new Error("Not authenticated");
  }

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}
