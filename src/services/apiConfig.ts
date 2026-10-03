/**
 * Centralized API and WebSocket endpoint resolver
 * 
 * Supports:
 * - Local development: relative HTTP requests (`/api/*`) and same-host WebSocket (`ws://localhost:3000/live`)
 * - GitHub Pages + Render: calls Render backend via `VITE_API_URL` (e.g., `https://jtec-backend.onrender.com`)
 *   and secure WebSocket (`wss://jtec-backend.onrender.com/live`)
 */

export function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  return "";
}

export function getApiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return base ? `${base}${cleanEndpoint}` : cleanEndpoint;
}

export function getLiveWebSocketUrl(): string {
  const base = getApiBaseUrl();
  if (base) {
    const wsBase = base
      .replace(/^https:\/\//i, "wss://")
      .replace(/^http:\/\//i, "ws://");
    return `${wsBase}/live`;
  }

  if (typeof window !== "undefined" && window.location) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/live`;
  }
  return "ws://localhost:3000/live";
}
