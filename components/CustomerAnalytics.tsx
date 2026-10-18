"use client";
import type { ReactNode } from "react";
import { useCustomerAnalytics } from "@/lib/use-customer-analytics";

// No vendor scripts or automatic pageviews until browser classification allows them.
export function CustomerAnalytics({ children }: { children: ReactNode }) {
  return useCustomerAnalytics() ? <>{children}</> : null;
}
