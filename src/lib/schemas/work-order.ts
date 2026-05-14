import { z } from "zod";

/**
 * Esquemas Zod del agregado "orden de trabajo".
 *
 * Reglas comunes:
 * - Las fechas se aceptan como ISO 8601 string; la verificación de formato vive en
 *   `assertIsoDate` para devolver mensajes locales en español.
 * - Los campos opcionales en la BD (notas, descuento, status) se aceptan también opcionales aquí,
 *   pero el endpoint puede exigirlos si su contrato lo requiere.
 */

const isoDate = z.string().min(1).refine((v) => !Number.isNaN(Date.parse(v)), {
  message: "Fecha no válida (se espera ISO 8601)."
});

const priority = z.enum(["low", "normal", "high", "urgent"]);
const initialStatus = z.enum(["draft", "assigned"]);

export const orderHeaderSchema = z
  .object({
    order_number: z.string().trim().min(1).max(40).optional(),
    client_id: z.string().uuid("client_id debe ser un UUID válido."),
    vehicle_id: z.string().uuid("vehicle_id debe ser un UUID válido."),
    assigned_to: z.string().uuid("assigned_to debe ser un UUID válido."),
    status: initialStatus.optional(),
    priority,
    scheduled_start: isoDate,
    scheduled_end: isoDate,
    notes: z.string().trim().min(1, "Las notas son obligatorias.").max(2000),
    discount_amount: z.number().min(0).optional()
  })
  .refine((d) => Date.parse(d.scheduled_end) > Date.parse(d.scheduled_start), {
    path: ["scheduled_end"],
    message: "El fin programado debe ser posterior al inicio."
  });

export const serviceLineSchema = z.object({
  service_id: z.string().uuid("service_id debe ser un UUID válido."),
  price: z.number().min(0, "El precio no puede ser negativo.")
});

export const productLineSchema = z.object({
  item_id: z.string().uuid("item_id debe ser un UUID válido."),
  quantity: z.number().int().positive("La cantidad debe ser un entero positivo."),
  unit_price: z.number().min(0).optional()
});

export const createWorkOrderBundleSchema = z.object({
  order: orderHeaderSchema,
  services: z.array(serviceLineSchema).min(1, "Se requiere al menos un servicio."),
  products: z.array(productLineSchema).max(200).optional()
});

export type CreateWorkOrderBundlePayload = z.infer<typeof createWorkOrderBundleSchema>;
