import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

export function resolveMediaUrl(storedPath) {
  if (!storedPath) {
    return "";
  }

  const normalized = String(storedPath).replaceAll("\\", "/");
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return `${API_ORIGIN}/${normalized.replace(/^\/+/, "")}`;
}

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default api;
