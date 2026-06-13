import { NextRequest } from "next/server";
import { internalError, notFound } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { readIntakePhotoFile } from "@/lib/local-storage/intake-photos";
import { getOrderById } from "@/modules/orders/order.service";

type Params = { params: Promise<{ orderId: string; filename: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.read");
    if ("denied" in auth) return auth.denied;

    const { orderId, filename } = await params;
    const order = await getOrderById(orderId);
    if (!order) return notFound("Order");

    const file = await readIntakePhotoFile(orderId, decodeURIComponent(filename));
    if (!file) return notFound("Image");

    return new Response(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Cache-Control": "private, max-age=3600"
      }
    });
  } catch (error) {
    return internalError(error);
  }
}
