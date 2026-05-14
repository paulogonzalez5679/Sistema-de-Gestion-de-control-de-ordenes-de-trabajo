import { NextRequest } from "next/server";
import { internalError, notFound, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { deleteVehicle, getVehicleById, updateVehicle } from "@/modules/vehicles/vehicle.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("vehicles.read");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const vehicle = await getVehicleById(id);
    if (!vehicle) return notFound("Vehicle");
    return ok(vehicle);
  } catch (error) {
    return internalError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("vehicles.update");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const body = await request.json();
    const updated = await updateVehicle(id, body);
    if (!updated) return notFound("Vehicle");
    return ok(updated);
  } catch (error) {
    return internalError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  return PATCH(request, { params });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("vehicles.delete");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const removed = await deleteVehicle(id);
    if (!removed) return notFound("Vehicle");
    return ok({ success: true });
  } catch (error) {
    return internalError(error);
  }
}
