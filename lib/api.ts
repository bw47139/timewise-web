import axios from "axios";
import { getAuthToken } from "./auth"; // <-- FIXED

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

console.log("API BASE URL ->", baseURL);

const api = axios.create({
  baseURL,
  withCredentials: false,
});

// 🔥 Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken(); // <-- FIXED
    if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export { api };
export default api;
