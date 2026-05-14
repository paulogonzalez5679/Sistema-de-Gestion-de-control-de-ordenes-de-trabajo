import { z } from "zod";

/** Esquemas para administración del catálogo de recompensas y canjes. */

export const rewardCreateSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(160),
  description: z
    .union([z.string().max(1000), z.null()])
    .optional()
    .transform((v) => (typeof v === "string" ? v.trim() || null : v ?? null)),
  points_required: z.coerce
    .number({ invalid_type_error: "points_required no válido." })
    .int("points_required debe ser entero.")
    .min(1, "points_required debe ser ≥ 1."),
  is_active: z.boolean().optional(),
  sort_order: z.coerce
    .number({ invalid_type_error: "sort_order no válido." })
    .int("sort_order debe ser entero.")
    .optional()
});

export const rewardUpdateSchema = rewardCreateSchema.partial();

export const catalogRedeemSchema = z.object({
  rewardId: z.string().uuid("rewardId debe ser un UUID válido.")
});

export type RewardCreatePayload = z.infer<typeof rewardCreateSchema>;
export type RewardUpdatePayload = z.infer<typeof rewardUpdateSchema>;
export type CatalogRedeemPayload = z.infer<typeof catalogRedeemSchema>;
