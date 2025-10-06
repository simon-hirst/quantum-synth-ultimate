export function wsUrl(path: string, override?: string) {
  const base = override || (typeof window !== "undefined" ? window.location.origin : "http://localhost:8080");
  const url = new URL(path, base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}
