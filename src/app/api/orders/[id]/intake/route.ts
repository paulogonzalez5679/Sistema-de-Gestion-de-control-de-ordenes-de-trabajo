import { NextRequest } from "next/server";
import { badRequest, internalError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { gateOrderById } from "@/lib/order-access";
import {
  getOrderIntake,
  intakePhotoPublicUrl,
  saveOrderIntake
} from "@/lib/local-storage/intake-photos";
import { recordAuditEvent } from "@/modules/audit/audit.service";

type Params = { params: Promise<{ id: string }> };

function mapIntakeResponse(manifest: NonNullable<Awaited<ReturnType<typeof getOrderIntake>>>) {
  return {
    intakeConditionNotes: manifest.intakeConditionNotes,
    photos: manifest.photos.map((photo) => ({
      filename: photo.filename,
      mimeType: photo.mimeType,
      sizeBytes: photo.sizeBytes,
      uploadedAt: photo.uploadedAt,
      url: intakePhotoPublicUrl(manifest.orderId, photo.filename)
    })),
    updatedAt: manifest.updatedAt
  };
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.read");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const gate = await gateOrderById(auth.profile, id);
    if (!gate.ok) return gate.response;

    const manifest = await getOrderIntake(id);
    if (!manifest) {
      return ok({ intakeConditionNotes: "", photos: [], updatedAt: null });
    }
    return ok(mapIntakeResponse(manifest));
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

    const form = await request.formData();
    const notesRaw = form.get("intake_condition_notes");
    const intakeConditionNotes = typeof notesRaw === "string" ? notesRaw : "";

    const photoEntries = form.getAll("photos");
    const files: { buffer: Buffer; declaredMime?: string }[] = [];

    for (const entry of photoEntries) {
      if (!(entry instanceof File) || entry.size === 0) continue;
      const arrayBuffer = await entry.arrayBuffer();
      files.push({
        buffer: Buffer.from(arrayBuffer),
        declaredMime: entry.type || undefined
      });
    }

    let manifest;
    try {
      manifest = await saveOrderIntake({
        orderId: id,
        intakeConditionNotes,
        files
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el ingreso.";
      return badRequest(message);
    }

    await recordAuditEvent({
      actorId: auth.profile.id,
      action: "order.intake_recorded",
      entityType: "work_order",
      entityId: id,
      workOrderId: id,
      summary: `${auth.profile.full_name} registró el ingreso de ${gate.order.order_number} (${manifest.photos.length} foto(s)).`,
      metadata: {
        order_number: gate.order.order_number,
        photo_count: manifest.photos.length
      }
    });

    return ok(mapIntakeResponse(manifest), { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
