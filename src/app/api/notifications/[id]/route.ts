import { NextRequest } from "next/server";
import { internalError, notFound, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import {
  deleteNotification,
  getNotificationById,
  updateNotification
} from "@/modules/notifications/notification.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("notifications.read");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const notification = await getNotificationById(id);
    if (!notification) return notFound("Notification");
    return ok(notification);
  } catch (error) {
    return internalError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("notifications.update");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const body = await request.json();
    const updated = await updateNotification(id, body);
    if (!updated) return notFound("Notification");
    return ok(updated);
  } catch (error) {
    return internalError(error);
  }
}

export async function PUT(request: NextRequest, ctx: Params) {
  return PATCH(request, ctx);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("notifications.delete");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const removed = await deleteNotification(id);
    if (!removed) return notFound("Notification");
    return ok({ success: true });
  } catch (error) {
    return internalError(error);
  }
}
