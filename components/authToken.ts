// timewise-web/components/authToken.ts

/**
 * With httpOnly authentication (your backend's design),
 * the JWT is stored ONLY in a secure httpOnly cookie.
 *
 * JavaScript in the browser CANNOT read or modify it.
 *
 * These helpers remain as no-ops so the rest of your
 * frontend code does not break.
 */

export function setAuthToken(_token: string) {
  // no-op (backend handles cookie)
}

export function getAuthToken() {
  // httpOnly cookie cannot be read from JS
  return null;
}

export function clearAuthToken() {
  // no-op (backend clears cookie on /logout)
}
