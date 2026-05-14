import { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, conflict, internalError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import {
  createClient,
  deleteClient,
  getClientByCedulaNorm,
  normalizeCedulaDigits
} from "@/modules/clients/client.service";
import { createVehicle, getVehicleByPlate } from "@/modules/vehicles/vehicle.service";

const clientPartSchema = z.object({
  full_name: z.string().trim().min(1, "El nombre es obligatorio.").max(200),
  phone: z.string().trim().min(3, "El teléfono es obligatorio.").max(40),
  email: z
    .union([z.string().email().max(320), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === undefined || v === null || v === "" ? null : v)),
  cedula: z.string().trim().min(1, "La cédula o RUC es obligatorio.").max(32)
});

const vehiclePartSchema = z.object({
  plate: z
    .string()
    .trim()
    .min(1, "La matrícula es obligatoria.")
    .max(24)
    .transform((s) => s.toUpperCase()),
  make: z.string().trim().min(1, "La marca es obligatoria.").max(120),
  model: z.string().trim().min(1, "El modelo es obligatorio.").max(120),
  color: z
    .union([z.string().max(80), z.literal(""), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return null;
      const t = v.trim();
      return t === "" ? null : t;
    }),
  year: z
    .union([z.number().int().min(1900).max(2100), z.null()])
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? null : v)),
  car_registration_photo: z
    .string()
    .min(80, "La foto del vehículo es obligatoria.")
    .max(12_000_000, "La imagen es demasiado grande.")
});

const bodySchema = z.object({
  client: clientPartSchema,
  vehicle: vehiclePartSchema
});

function isUniqueViolation(err: unknown): boolean {
  const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code?: string }).code) : "";
  return code === "23505";
}

/**
 * Alta atómica: solo persiste cliente y vehículo juntos cuando el flujo está completo
 * (datos de persona + vehículo + foto). Si falla el vehículo, se revierte el cliente.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("clients.create");
    if ("denied" in auth) return auth.denied;

    const body: unknown = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos de registro inválidos.";
      return badRequest(msg);
    }

    const { client: cIn, vehicle: vIn } = parsed.data;
    const cedulaNorm = normalizeCedulaDigits(cIn.cedula);
    if (!cedulaNorm) {
      return badRequest("Introduce una cédula o RUC válido (al menos un número).");
    }
    const existingByCedula = await getClientByCedulaNorm(cedulaNorm);
    if (existingByCedula) {
      return conflict("Ya existe un cliente con esta cédula o RUC.", { existing_client_id: existingByCedula.id });
    }

    const plateTaken = await getVehicleByPlate(vIn.plate);
    if (plateTaken) {
      return badRequest("Ya existe un vehículo registrado con esa matrícula.");
    }

    const createdClient = await createClient({
      full_name: cIn.full_name,
      phone: cIn.phone,
      email: cIn.email ?? null,
      cedula: cIn.cedula.trim(),
      is_verified: false,
      notes: null
    });

    let createdVehicle;
    try {
      createdVehicle = await createVehicle({
        client_id: createdClient.id,
        plate: vIn.plate,
        make: vIn.make,
        model: vIn.model,
        color: vIn.color ?? null,
        year: vIn.year ?? null,
        vin: null,
        mileage: null,
        car_registration_photo: vIn.car_registration_photo
      });
    } catch (vehErr) {
      try {
        await deleteClient(createdClient.id);
      } catch {
        /* best-effort rollback */
      }
      if (isUniqueViolation(vehErr)) {
        return badRequest("Ya existe un vehículo registrado con esa matrícula o VIN duplicado.");
      }
      throw vehErr;
    }

    const actor = auth.profile;
    await recordAuditEvent({
      actorId: actor.id,
      action: "client.created",
      entityType: "client",
      entityId: createdClient.id,
      workOrderId: null,
      summary: `${actor.full_name} registró al cliente «${createdClient.full_name}».`,
      metadata: { client_id: createdClient.id, phone: createdClient.phone }
    });
    await recordAuditEvent({
      actorId: actor.id,
      action: "vehicle.created",
      entityType: "vehicle",
      entityId: createdVehicle.id,
      workOrderId: null,
      summary: `${actor.full_name} registró el vehículo ${createdVehicle.plate} (${createdVehicle.make} ${createdVehicle.model}).`,
      metadata: { vehicle_id: createdVehicle.id, client_id: createdVehicle.client_id, plate: createdVehicle.plate }
    });

    return ok({ client: createdClient, vehicle: createdVehicle }, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
