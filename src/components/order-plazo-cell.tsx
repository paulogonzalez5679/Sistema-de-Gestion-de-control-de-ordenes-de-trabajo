"use client";

import { useEffect, useState } from "react";
import {
  computeLiveExecutionPlazo,
  getOrderFinishPunctuality,
  isLateForUnstartedWorkOrder,
  isPendingForUnstartedWorkOrder
} from "@/lib/order-workflow";
import type { WorkOrderStatus } from "@/lib/types";

const TICK_MS = 15_000;

const EXECUTION_CLOCK_STATUSES: WorkOrderStatus[] = ["in_progress", "paused"];

function isExecutionClockActive(status: WorkOrderStatus): boolean {
  return EXECUTION_CLOCK_STATUSES.includes(status);
}

export function OrderPlazoCell({
  completedAt,
  scheduledStart,
  scheduledEnd,
  checkInAt,
  status
}: {
  completedAt: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  checkInAt: string | null;
  status: WorkOrderStatus;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (completedAt) {
    const p = getOrderFinishPunctuality(completedAt, scheduledEnd);
    if (p === "no_estimate") return <span className="orders-cell-muted">Sin estimado</span>;
    if (p === "on_time") return <span className="orders-punctuality orders-punctuality--on-time">A tiempo</span>;
    return <span className="orders-punctuality orders-punctuality--late">Atrasado</span>;
  }

  if (isExecutionClockActive(status)) {
    if (!checkInAt) {
      return <span className="orders-cell-muted">—</span>;
    }

    if (!scheduledEnd) {
      return <span className="orders-cell-muted">Sin estimado</span>;
    }

    const live = computeLiveExecutionPlazo(now, checkInAt, scheduledEnd);
    if (live === "on_time") return <span className="orders-punctuality orders-punctuality--on-time">A tiempo</span>;
    if (live === "soon") return <span className="orders-punctuality orders-punctuality--soon">Próximo a expirar</span>;
    return <span className="orders-punctuality orders-punctuality--late">Atrasado</span>;
  }

  if (isPendingForUnstartedWorkOrder(status, scheduledStart, now)) {
    return <span className="orders-punctuality orders-punctuality--pending">Pendiente</span>;
  }

  if (isLateForUnstartedWorkOrder(status, scheduledStart, now)) {
    return <span className="orders-punctuality orders-punctuality--late">Atrasado</span>;
  }

  return <span className="orders-cell-muted">—</span>;
}
