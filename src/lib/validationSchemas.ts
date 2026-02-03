import { z } from "zod";

// Common validation patterns
const namePattern = /^[a-zA-ZÀ-ÿ\s'.,-]+$/;
const phonePattern = /^[\d\s()+-]{8,20}$/;

// Error messages in Spanish
const errorMessages = {
  required: "Este campo es requerido",
  email: "Ingresa un correo electrónico válido",
  phone: "Ingresa un número de teléfono válido (8-20 dígitos)",
  name: "El nombre solo puede contener letras y espacios",
  minLength: (min: number) => `Debe tener al menos ${min} caracteres`,
  maxLength: (max: number) => `No puede exceder ${max} caracteres`,
  positiveNumber: "El monto debe ser mayor a 0",
};

// Booking/Appointment schema
export const bookingSchema = z.object({
  patient_name: z
    .string()
    .trim()
    .min(2, errorMessages.minLength(2))
    .max(100, errorMessages.maxLength(100))
    .regex(namePattern, errorMessages.name),
  patient_email: z
    .string()
    .trim()
    .email(errorMessages.email)
    .max(255, errorMessages.maxLength(255)),
  patient_phone: z
    .string()
    .trim()
    .regex(phonePattern, errorMessages.phone),
  reason: z
    .string()
    .trim()
    .min(3, errorMessages.minLength(3))
    .max(500, errorMessages.maxLength(500)),
  notes: z
    .string()
    .max(2000, errorMessages.maxLength(2000))
    .optional()
    .nullable(),
});

// Patient schema
export const patientSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, errorMessages.minLength(2))
    .max(100, errorMessages.maxLength(100))
    .regex(namePattern, errorMessages.name),
  email: z
    .string()
    .trim()
    .email(errorMessages.email)
    .max(255, errorMessages.maxLength(255)),
  phone: z
    .string()
    .trim()
    .regex(phonePattern, errorMessages.phone),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(["masculino", "femenino", "otro", ""]).optional().nullable(),
  address: z.string().max(500, errorMessages.maxLength(500)).optional().nullable(),
  notes: z.string().max(2000, errorMessages.maxLength(2000)).optional().nullable(),
});

// Payment schema
export const paymentSchema = z.object({
  patient_id: z.string().uuid(errorMessages.required),
  amount: z
    .number()
    .positive(errorMessages.positiveNumber)
    .max(9999999.99, "El monto es demasiado alto"),
  payment_method: z.enum(["efectivo", "tarjeta", "transferencia", "otro"]),
  payment_date: z.string().min(1, errorMessages.required),
  reference: z.string().max(100, errorMessages.maxLength(100)).optional().nullable(),
  notes: z.string().max(500, errorMessages.maxLength(500)).optional().nullable(),
  appointment_id: z.string().uuid().optional().nullable(),
});

// Office schema
export const officeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, errorMessages.minLength(2))
    .max(100, errorMessages.maxLength(100)),
  address: z.string().max(200, errorMessages.maxLength(200)).optional().nullable(),
  phone: z
    .string()
    .regex(phonePattern, errorMessages.phone)
    .optional()
    .nullable()
    .or(z.literal("")),
});

// Doctor schema
export const doctorSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, errorMessages.minLength(2))
    .max(100, errorMessages.maxLength(100))
    .regex(namePattern, errorMessages.name),
  specialty: z.string().max(100, errorMessages.maxLength(100)).optional().nullable(),
  email: z
    .string()
    .trim()
    .email(errorMessages.email)
    .max(255, errorMessages.maxLength(255))
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(phonePattern, errorMessages.phone)
    .optional()
    .nullable()
    .or(z.literal("")),
});

// Type exports
export type BookingFormData = z.infer<typeof bookingSchema>;
export type PatientFormData = z.infer<typeof patientSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type OfficeFormData = z.infer<typeof officeSchema>;
export type DoctorFormData = z.infer<typeof doctorSchema>;

// Validation helper
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join(".");
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  
  return { success: false, errors };
}
