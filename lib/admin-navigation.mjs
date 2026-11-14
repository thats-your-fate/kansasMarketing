/** Allow only normalized internal administrator destinations after sign-in. */
export function safeAdminDestination(value, fallback = "/app/admin/documents") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x20\x7f]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://admin.invalid");
    if (url.origin !== "https://admin.invalid" || !(url.pathname === "/app/admin" || url.pathname.startsWith("/app/admin/"))) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}
