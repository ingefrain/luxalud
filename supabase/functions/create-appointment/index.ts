import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting (per IP, 5 requests per hour)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  
  if (entry.count >= RATE_LIMIT) {
    return true;
  }
  
  entry.count++;
  return false;
}

// Validation patterns
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[\d\s()+-]{8,20}$/;
const nameRegex = /^[a-zA-ZÀ-ÿ\s'.,-]{2,100}$/;

interface BookingRequest {
  doctor_id: string;
  office_id?: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  reason: string;
  notes?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  type: "presencial" | "virtual";
}

function validateRequest(data: BookingRequest): string | null {
  if (!data.doctor_id || typeof data.doctor_id !== "string") {
    return "ID de médico inválido";
  }
  
  if (!data.patient_name || !nameRegex.test(data.patient_name)) {
    return "Nombre inválido (2-100 caracteres, solo letras)";
  }
  
  if (!data.patient_email || !emailRegex.test(data.patient_email)) {
    return "Correo electrónico inválido";
  }
  
  if (!data.patient_phone || !phoneRegex.test(data.patient_phone)) {
    return "Teléfono inválido (8-20 dígitos)";
  }
  
  if (!data.reason || data.reason.length < 3 || data.reason.length > 500) {
    return "Motivo de consulta inválido (3-500 caracteres)";
  }
  
  if (data.notes && data.notes.length > 2000) {
    return "Notas demasiado largas (máx 2000 caracteres)";
  }
  
  if (!data.appointment_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.appointment_date)) {
    return "Fecha de cita inválida";
  }
  
  if (!data.start_time || !/^\d{2}:\d{2}$/.test(data.start_time)) {
    return "Hora de inicio inválida";
  }
  
  if (!data.end_time || !/^\d{2}:\d{2}$/.test(data.end_time)) {
    return "Hora de fin inválida";
  }
  
  if (!data.duration || data.duration < 15 || data.duration > 180) {
    return "Duración inválida (15-180 minutos)";
  }
  
  if (!["presencial", "virtual"].includes(data.type)) {
    return "Tipo de cita inválido";
  }
  
  return null;
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting by IP
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    
    if (isRateLimited(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Demasiadas solicitudes. Intenta de nuevo en una hora." }),
        { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const data: BookingRequest = await req.json();
    
    // Validate input
    const validationError = validateRequest(data);
    if (validationError) {
      return new Response(
        JSON.stringify({ error: validationError }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const normalizedEmail = normalizeEmail(data.patient_email);
    const normalizedPhone = normalizePhone(data.patient_phone);

    // Check for duplicate appointment (same doctor, date, time)
    const { data: existingAppointment } = await supabase
      .from("appointments")
      .select("id")
      .eq("doctor_id", data.doctor_id)
      .eq("appointment_date", data.appointment_date)
      .eq("start_time", data.start_time)
      .neq("status", "cancelada")
      .maybeSingle();

    if (existingAppointment) {
      return new Response(
        JSON.stringify({ error: "Este horario ya no está disponible. Por favor, selecciona otro." }),
        { 
          status: 409, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Find or create patient
    let patientId: string;
    
    // Check by email first
    const { data: existingPatient } = await supabase
      .from("patients")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingPatient) {
      patientId = existingPatient.id;
    } else {
      // Check by phone
      const { data: patientByPhone } = await supabase
        .from("patients")
        .select("id")
        .eq("phone", normalizedPhone)
        .maybeSingle();

      if (patientByPhone) {
        patientId = patientByPhone.id;
      } else {
        // Create new patient
        const { data: newPatient, error: patientError } = await supabase
          .from("patients")
          .insert({
            full_name: data.patient_name.trim(),
            email: normalizedEmail,
            phone: normalizedPhone,
          })
          .select("id")
          .single();

        if (patientError) {
          console.error("Error creating patient:", patientError);
          return new Response(
            JSON.stringify({ error: "Error al registrar paciente" }),
            { 
              status: 500, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
        
        patientId = newPatient.id;
      }
    }

    // Create appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        doctor_id: data.doctor_id,
        office_id: data.office_id || null,
        patient_id: patientId,
        patient_name: data.patient_name.trim(),
        patient_email: normalizedEmail,
        patient_phone: normalizedPhone,
        reason: data.reason.trim(),
        notes: data.notes?.trim() || null,
        appointment_date: data.appointment_date,
        start_time: data.start_time,
        end_time: data.end_time,
        duration: data.duration,
        type: data.type,
        status: "pendiente",
      })
      .select("id, confirmation_token")
      .single();

    if (appointmentError) {
      console.error("Error creating appointment:", appointmentError);
      return new Response(
        JSON.stringify({ error: "Error al crear la cita" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        appointment_id: appointment.id,
        message: "Cita creada exitosamente" 
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
