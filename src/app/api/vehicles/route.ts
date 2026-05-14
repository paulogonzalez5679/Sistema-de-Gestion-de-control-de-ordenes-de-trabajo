import { NextRequest } from "next/server";
import { badRequest, internalError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import {
  createVehicle,
  getAllVehicles,
  getVehicleByPlate
} from "@/modules/vehicles/vehicle.service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission("vehicles.read");
    if ("denied" in auth) return auth.denied;

    const clientId = request.nextUrl.searchParams.get("clientId") ?? undefined;
    const plate = request.nextUrl.searchParams.get("plate");
    if (plate) {
      const vehicle = await getVehicleByPlate(plate);
      return ok(vehicle);
    }
    const vehicles = await getAllVehicles(clientId);
    return ok(vehicles);
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("vehicles.create");
    if ("denied" in auth) return auth.denied;

    const body = await request.json();
    if (!body?.client_id || !body?.make || !body?.model || !body?.plate) {
      return badRequest("client_id, make, model and plate are required");
    }
    const created = await createVehicle({
      client_id: body.client_id,
      make: body.make,
      model: body.model,
      year: body.year ?? null,
      color: body.color ?? null,
      plate: body.plate,
      vin: body.vin ?? null,
      mileage: body.mileage ?? null,
      car_registration_photo: body.car_registration_photo ?? null
    });
    const actor = auth.profile;
    await recordAuditEvent({
      actorId: actor.id,
      action: "vehicle.created",
      entityType: "vehicle",
      entityId: created.id,
      workOrderId: null,
      summary: `${actor.full_name} registró el vehículo ${created.plate} (${created.make} ${created.model}).`,
      metadata: { vehicle_id: created.id, client_id: created.client_id, plate: created.plate }
    });
    return ok(created, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
