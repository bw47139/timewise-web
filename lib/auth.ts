import Cookies from "js-cookie";

/**
 * Save the JWT token after login
 */
export function setAuthToken(token: string) {
  Cookies.set("tw_token", token, {
    expires: 7, // 7 days
  });
}

/**
 * Read token (used for protected API calls)
 */
export function getAuthToken() {
  return Cookies.get("tw_token");
}

/**
 * Remove token on logout
 */
export function clearAuthToken() {
  Cookies.remove("tw_token");
}
