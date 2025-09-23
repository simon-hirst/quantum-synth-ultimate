export const BACKEND_HOST: string =
  (import.meta as any)?.env?.VITE_BACKEND_HOST ||
  (typeof window !== "undefined" ? window.location.host : "localhost:5173");

export function httpBase(): string {
  if (BACKEND_HOST.includes("://")) {
    const u = new URL(BACKEND_HOST);
    return `${u.protocol}//${u.host}`;
  }
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:";
  return `${secure ? "https:" : "http:"}//${BACKEND_HOST}`;
}

export function wsUrl(path = "/ws"): string {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:";
  const wsProto = secure ? "wss:" : "ws:";
  if (BACKEND_HOST.startsWith("ws:") || BACKEND_HOST.startsWith("wss:")) {
    const u = new URL(BACKEND_HOST);
    return `${u.protocol}//${u.host}${path}`;
  }
  if (BACKEND_HOST.startsWith("http:") || BACKEND_HOST.startsWith("https:")) {
    const u = new URL(BACKEND_HOST);
    return `${wsProto}//${u.host}${path}`;
  }
  return `${wsProto}//${BACKEND_HOST}${path}`;
}
