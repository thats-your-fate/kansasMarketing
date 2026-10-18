// Keep this self-contained: it is serialized into the parser-time head script.
// Canonical copy: futureMarketing/lib/analytics-traffic.ts. Policy traffic-v1.
export function installAnalyticsTrafficGuard() {
  if (window.__fwAnalyticsTraffic) return;
  const productionHosts = ["futurewells.co", "futurewellstexas.com", "futurewellsoklahoma.com", "futurewellswyoming.com", "futurewellsnewmexico.com", "futurewellsnorthdakota.com", "futurewellscolorado.com", "futurewellskansas.com"];
  const production = /^https:$/.test(location.protocol) && !location.port && productionHosts.includes(location.hostname.toLowerCase().replace(/^www\./, ""));
  function internalPath(raw: string) {
    try {
      let path = new URL(raw, location.href).pathname;
      for (let i = 0; i < 4; i++) { const decoded = decodeURIComponent(path); if (decoded === path) break; path = decoded; }
      return /^\/(?:app|superadmin|api\/admin)(?:\/|$)/i.test(path);
    } catch { return false; }
  }
  const marked = () => document.cookie.split(";").some(item => item.trim() === "fw_analytics_internal=1");
  function markInternal() {
    document.cookie = "fw_analytics_internal=1; Path=/; Max-Age=31536000; SameSite=Lax; Secure";
  }
  let internal = marked() || internalPath(location.href);
  if (internal && production) markInternal();
  let ready = location.hostname.replace(/^www\./, "") !== "futurewells.co" || !production || internal;
  const allowed = () => ready && production && !internal && !marked() && !internalPath(location.href);
  const protectedHistory = new WeakSet<History["pushState"]>();
  const settled = () => window.dispatchEvent(new Event("fw-analytics-traffic-ready"));
  window.__fwAnalyticsTraffic = { allowed, protectHistory, version: "traffic-v1" };
  if (!ready) {
    // Anonymous requests require no backend lookup. Never return identity information.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    fetch("/api/analytics/context", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(body => { if (body?.trafficClass === "internal") { internal = true; markInternal(); } })
      .catch(() => { /* Unknown stays eligible; do not guess from device or geography. */ })
      .finally(() => { clearTimeout(timeout); ready = true; settled(); });
  }
  // Stop automatic SPA pageviews BEFORE the loaded vendor can observe an admin URL.
  function protectHistory() {
  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method];
    if (protectedHistory.has(original)) continue;
    const wrapped: History["pushState"] = function(this: History, data, unused, url) {
      if (url != null) {
        let target: URL | null = null;
        try { target = new URL(String(url), location.href); } catch { /* Native history validates. */ }
        if (target?.origin === location.origin && internalPath(target.href) && !internal) {
          internal = true;
          if (production) markInternal();
          try { window.clarity?.("stop"); } catch { /* Never interrupt navigation. */ }
          if (method === "replaceState") location.replace(target.href); else location.assign(target.href);
          return;
        }
      }
      return original.call(this, data, unused, url);
    };
    protectedHistory.add(wrapped);
    history[method] = wrapped;
  }
  }
  protectHistory();
  // SDKs and Next can install their own history observers after the parser-time guard.
  document.addEventListener("load", event => {
    if (event.target instanceof HTMLScriptElement) protectHistory();
  }, true);
  window.addEventListener("click", event => {
    const anchor = event.composedPath().find(node => node instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined;
    if (!internal && anchor && new URL(anchor.href, location.href).origin === location.origin && internalPath(anchor.href)) {
      internal = true;
      if (production) markInternal();
      try { window.clarity?.("stop"); } catch { /* Keep native navigation. */ }
      event.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener("popstate", event => {
    if (!internal && internalPath(location.href)) {
      internal = true;
      if (production) markInternal();
      try { window.clarity?.("stop"); } catch { /* Keep navigation working. */ }
      event.stopImmediatePropagation();
      location.reload();
    }
  }, true);
}

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
    __fwAnalyticsTraffic?: { allowed: () => boolean; protectHistory: () => void; version: string };
  }
}
export function analyticsTrafficBootstrap() {
  return `(${installAnalyticsTrafficGuard.toString()})();`;
}
