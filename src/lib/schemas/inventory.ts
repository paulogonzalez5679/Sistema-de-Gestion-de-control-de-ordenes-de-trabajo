import { z } from "zod";

/**
 * Esquemas de inventario.
 *
 * `unit_cost`, `quantity` y `reorder_point` se aceptan como número o cadena numérica para
 * tolerar formularios HTML (los inputs `type=number` entregan string). El refinamiento las
 * normaliza a número finito y no negativo.
 */

const nonNegativeNumber = z.coerce
  .number({ invalid_type_error: "Valor no válido." })
  .refine((v) => Number.isFinite(v) && v >= 0, { message: "Valor no válido: debe ser ≥ 0." });

const nonNegativeInt = z.coerce
  .number({ invalid_type_error: "Cantidad no válida." })
  .int("Cantidad no válida: debe ser entero.")
  .nonnegative("Cantidad no válida: debe ser ≥ 0.");

export const inventoryCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(200),
  sku: z.string().trim().min(1, "El SKU es obligatorio.").max(80),
  category: z.string().trim().min(1, "La categoría es obligatoria.").max(120),
  supplier: z.string().trim().min(1, "El proveedor es obligatorio.").max(160),
  unit_cost: nonNegativeNumber.default(0),
  quantity: nonNegativeInt.default(0),
  reorder_point: nonNegativeInt.default(0),
  notes: z.union([z.string().max(2000), z.null()]).optional()
});

export const inventoryUpdateSchema = inventoryCreateSchema.partial();

/**
 * Variante para `PATCH /api/inventory` (sin :id en path): permite enviar `id` en el cuerpo.
 * Si el body no incluye `id`, el handler debe leerlo de query string.
 */
export const inventoryUpdateWithIdSchema = inventoryUpdateSchema.extend({
  id: z.string().uuid("id debe ser un UUID válido.").optional()
});

export const inventoryMovementCreateSchema = z.object({
  item_id: z.string().uuid("item_id debe ser un UUID válido."),
  movement_type: z.enum(["receive", "issue", "adjustment"]),
  quantity_delta: z.coerce
    .number({ invalid_type_error: "quantity_delta no válido." })
    .int("quantity_delta debe ser entero.")
    .refine((v) => v !== 0, { message: "quantity_delta debe ser distinto de cero." }),
  reason: z.string().trim().max(240).optional(),
  work_order_id: z.string().uuid().optional()
});

export type InventoryCreatePayload = z.infer<typeof inventoryCreateSchema>;
export type InventoryUpdatePayload = z.infer<typeof inventoryUpdateSchema>;
export type InventoryMovementCreatePayload = z.infer<typeof inventoryMovementCreateSchema>;
