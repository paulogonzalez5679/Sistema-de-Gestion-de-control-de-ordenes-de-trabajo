import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido.").max(254),
  password: z.string().min(1, "La contraseña es obligatoria.").max(256)
});
