export function wsUrl(path: string, override?: string) {
  // If explicit base provided (like env), use it
  const base = override || (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173");
  const url = new URL(path, base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}
