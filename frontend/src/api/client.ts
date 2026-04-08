// Lightweight API client — calls go through the Vite proxy in dev
// Automatically attaches JWT Bearer token from sessionStorage

const BASE_URL = import.meta.env.VITE_API_URL ?? "https://ember-api-frbhh6fka2anfnac.francecentral-01.azurewebsites.net"; // fallback to prod backend

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const token = sessionStorage.getItem("jwt");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If 401, the token is expired or invalid — clear it
  if (res.status === 401) {
    sessionStorage.removeItem("jwt");
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  retu