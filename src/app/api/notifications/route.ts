import { NextRequest } from "next/server";
import { badRequest, internalError, ok } from "@/lib/api-response";
import { DEFAULT_LIST_PAGE_SIZE, offsetForPage, parsePageParam } from "@/lib/pagination";
import { requirePermission } from "@/lib/permissions";
import { createNotification, listNotificationsPage } from "@/modules/notifications/notification.service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission("notifications.read");
    if ("denied" in auth) return auth.denied;

    const unreadOnly = request.nextUrl.searchParams.get("unreadOnly") === "true";
    const search = request.nextUrl.searchParams.get("search") ?? undefined;
    const page = parsePageParam(request.nextUrl.searchParams.get("page") ?? undefined);
    const pageSize = Math.min(
      100,
      Math.max(
        1,
        Number(request.nextUrl.searchParams.get("pageSize") ?? DEFAULT_LIST_PAGE_SIZE) || DEFAULT_LIST_PAGE_SIZE
      )
    );
    const offset = offsetForPage(page, pageSize);
    const { items, total } = await listNotificationsPage({
      limit: pageSize,
      offset,
      unreadOnly,
      search,
      operatorRewardNotificationsOnly: auth.profile.role === "operator"
    });
    return ok({ items, total, page, pageSize });
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("notifications.create_admin");
    if ("denied" in auth) return auth.denied;

    const body = await request.json();
    if (!body?.title || !body?.body) return badRequest("title and body are required");
    const created = await createNotification({
      title: body.title,
      body: body.body,
      severity: body.severity ?? "info",
      user_id: body.user_id ?? null,
      work_order_id: body.work_order_id ?? null,
      is_read: Boolean(body.is_read)
    });
    return ok(created, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
