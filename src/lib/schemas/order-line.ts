import { z } from "zod";
import { productLineSchema, serviceLineSchema } from "@/lib/schemas/work-order";

/** Cuerpo para `PUT /api/orders/:id/services`. */
export const setOrderServicesSchema = z.object({
  items: z.array(serviceLineSchema).min(1, "Se requiere al menos un servicio.")
});

/** Cuerpo para `POST /api/orders/:id/products`. */
export const addOrderProductSchema = productLineSchema;

export type SetOrderServicesPayload = z.infer<typeof setOrderServicesSchema>;
export type AddOrderProductPayload = z.infer<typeof addOrderProductSchema>;
