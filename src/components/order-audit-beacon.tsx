"use client";

import { useEffect } from "react";

type AuditContext = "assigned" | "active" | "summary";

export function OrderAuditBeacon({ orderId, context }: { orderId: string; context: AuditContext }) {
  useEffect(() => {
    void fetch(`/api/orders/${orderId}/audit-view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context })
    });
  }, [orderId, context]);

  return null;
}
