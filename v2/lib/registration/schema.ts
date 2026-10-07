import { z } from "zod";

export const registrationSchema = z.object({
  slug: z.string().min(1),
  firstName: z.string().trim().min(2, "Nombre requerido").max(60),
  lastName: z.string().trim().min(2, "Apellido requerido").max(60),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?\d{7,15}$/, "Teléfono inválido"),
  cedula: z
    .string()
    .trim()
    .regex(/^\d{6,15}$/, "Cédula: solo dígitos (6–15)"),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  gender: z.enum(["masculino", "femenino", "otro"]),
  distanceId: z.string().min(1, "Selecciona una modalidad"),
  participantTypeKey: z.string().trim().optional(),
  teamName: z.string().trim().max(80).optional().or(z.literal("")),
  shirtSize: z.enum(["S", "M", "L", "XL", "XXL"]).optional(),
  code: z.string().trim().toUpperCase().optional().or(z.literal("")),
  termsAccepted: z.literal(true, { error: "Debes aceptar los términos" }),
  method: z.enum(["yappy", "transferencia", "efectivo", "code"]),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export function isPanamaMobile(v: string): boolean {
  return /^6\d{7}$/.test(v.replace(/\D/g, ""));
}

export const SHIRT_SIZES = ["S", "M", "L", "XL", "XXL"] as const;
