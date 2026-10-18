"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import "@/lib/analytics-traffic";

export function useCustomerAnalytics() {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const update = () => setAllowed(Boolean(window.__fwAnalyticsTraffic?.allowed()));
    window.__fwAnalyticsTraffic?.protectHistory();
    update();
    window.addEventListener("fw-analytics-traffic-ready", update);
    return () => window.removeEventListener("fw-analytics-traffic-ready", update);
  }, [pathname]);
  return allowed && typeof window !== "undefined" && Boolean(window.__fwAnalyticsTraffic?.allowed());
}
