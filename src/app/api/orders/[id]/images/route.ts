import { NextRequest } from "next/server";
import { badRequest, internalError, ok } from "@/lib/api-response";
import {
  parseBase64ImagePayload,
  validateOrderImageBuffer
} from "@/lib/image-bytes";
import { requirePermission } from "@/lib/permissions";
import { gateOrderById } from "@/lib/order-access";
import { offsetForPage, parsePageParam } from "@/lib/pagination";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import { addOrderImage, getOrderImagesPage } from "@/modules/orders/order.service";

type Params = { params: Promise<{ id: string }> };

const DEFAULT_IMAGES_PAGE = 6;

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.read");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const gate = await gateOrderById(auth.profile, id);
    if (!gate.ok) return gate.response;

    const page = parsePageParam(request.nextUrl.searchParams.get("page") ?? undefined);
    const pageSize = Math.min(
      30,
      Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? DEFAULT_IMAGES_PAGE) || DEFAULT_IMAGES_PAGE)
    );
    const offset = offsetForPage(page, pageSize);
    const { images, total } = await getOrderImagesPage(id, { limit: pageSize, offset });
    return ok({ items: images, total, page, pageSize });
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.upload_image");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const gate = await gateOrderById(auth.profile, id);
    if (!gate.ok) return gate.response;

    const body = await request.json();
    if (!body?.base64_data || typeof body.base64_data !== "string") {
      return badRequest("base64_data is required");
    }

    const buffer = parseBase64ImagePayload(body.base64_data);
    if (!buffer) {
      return badRequest("base64_data no es válido.");
    }

    const validated = validateOrderImageBuffer(buffer);
    if ("error" in validated) {
      return badRequest(validated.error);
    }

    const profile = auth.profile;
    const uploadedBy = profile.id;
    const base64ForStorage = `data:${validated.mimeType};base64,${buffer.toString("base64")}`;

    const created = await addOrderImage({
      work_order_id: id,
      base64_data: base64ForStorage,
      caption: body.caption ?? null,
      uploaded_by: uploadedBy
    });

    const order = gate.order;
    await recordAuditEvent({
      actorId: uploadedBy,
      action: "order.image_uploaded",
      entityType: "work_order",
      entityId: id,
      workOrderId: id,
      summary: `${profile.full_name} subió una imagen en ${order.order_number}.`,
      metadata: {
        order_number: order.order_number,
        caption: body.caption ?? null,
        image_id: created.id
      }
    });

    return ok(created, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
