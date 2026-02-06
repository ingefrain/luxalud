import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useAvailableSlots } from "@/hooks/useAvailableSlots";
import { Header } from "@/components/public/Header";
import { Footer } from "@/components/public/Footer";
import { format, addDays, isBefore, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, User, Mail, Phone, FileText, Video, Building2, CheckCircle2, ArrowLeft, ArrowRight, Loader2, Search, UserPlus, UserCheck } from "lucide-react";
import type { Doctor, Office, AppointmentType, Patient } from "@/lib/types";
import { bookingSchema, validateForm } from "@/lib/validationSchemas";

type Step = 1 | 2 | 3 | 4;
type PatientType = "new" | "existing";

export default function Booking() {
  const [step, setStep] = useState<Step>(1);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [appointmentType, setAppointmentType] = useState<AppointmentType>("presencial");
  const [duration, setDuration] = useState(30);
  
  // Patient type selection
  const [patientType, setPatientType] = useState<PatientType>("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);
  
  const [formData, setFormData] = useState({
    patient_name: "",
    patient_email: "",
    patient_phone: "",
    reason: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  // Fetch doctors
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("*, office:offices(*)")
        .eq("is_active", true);
      if (error) throw error;
      return data as (Doctor & { office: Office })[];
    },
  });

  // Fetch offices
  const { data: offices = [] } = useQuery({
    queryKey: ["offices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("offices").select("*");
      if (error) throw error;
      return data as Office[];
    },
  });

  // Use the real availability hook
  const { data: availableSlots = [], isLoading: loadingSlots } = useAvailableSlots({
    doctorId: selectedDoctor?.id,
    date: selectedDate,
    duration,
  });

  // Handle patient type change
  const handlePatientTypeChange = (type: PatientType) => {
    setPatientType(type);
    setSearchQuery("");
    setFoundPatient(null);
    // Reset form data when switching types to avoid stale data
    setFormData({
      patient_name: "",
      patient_email: "",
      patient_phone: "",
      reason: formData.reason, // Keep reason as it's appointment-specific
      notes: formData.notes,   // Keep notes as it's appointment-specific
    });
  };

  // Search for existing patient
  const handleSearchPatient = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Campo vacío",
        description: "Ingresa un correo electrónico o número de teléfono para buscar",
        variant: "destructive",
      });
      return;
    }

    setSearchingPatient(true);
    setFoundPatient(null);

    try {
      // Normalize the search query
      const normalizedQuery = searchQuery.trim().toLowerCase();
      const phoneQuery = searchQuery.replace(/\D/g, ""); // Remove non-digits for phone search

      // Search by email or phone
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .or(`email.ilike.${normalizedQuery},phone.ilike.%${phoneQuery}%`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFoundPatient(data as Patient);
        setFormData({
          patient_name: data.full_name,
          patient_email: data.email,
          patient_phone: data.phone,
          reason: formData.reason,
          notes: formData.notes,
        });
        toast({
          title: "Paciente encontrado",
          description: `Se encontró a ${data.full_name}`,
        });
      } else {
        toast({
          title: "Paciente no encontrado",
          description: "No se encontró ningún paciente con ese correo o teléfono. Puedes registrarte como paciente nuevo.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error en la búsqueda",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSearchingPatient(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return;
    
    // Validate form data
    const validation = validateForm(bookingSchema, formData);
    if (validation.success === false) {
      const firstError = Object.values(validation.errors)[0];
      toast({
        title: "Datos inválidos",
        description: firstError,
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    try {
      const startTime = selectedTime;
      const [hours, minutes] = startTime.split(":").map(Number);
      const endTimeDate = new Date();
      endTimeDate.setHours(hours, minutes + duration, 0, 0);
      const endTime = format(endTimeDate, "HH:mm");

      // Use edge function for secure appointment creation with rate limiting
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-appointment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            doctor_id: selectedDoctor.id,
            office_id: selectedOffice || null,
            patient_name: formData.patient_name.trim(),
            patient_email: formData.patient_email.trim().toLowerCase(),
            patient_phone: formData.patient_phone.trim(),
            reason: formData.reason.trim(),
            notes: formData.notes?.trim() || null,
            appointment_date: format(selectedDate, "yyyy-MM-dd"),
            start_time: startTime,
            end_time: endTime,
            duration,
            type: appointmentType,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al crear la cita");
      }

      setSubmitted(true);
      toast({
        title: "¡Cita agendada!",
        description: "Recibirás un correo de confirmación pronto.",
      });
    } catch (error: any) {
      toast({
        title: "Error al agendar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="flux-card max-w-lg w-full p-8 text-center animate-slide-up">
            <div className="w-20 h-20 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              ¡Cita Agendada Exitosamente!
            </h1>
            <p className="text-muted-foreground mb-6">
              Hemos enviado un correo de confirmación a <strong>{formData.patient_email}</strong>.
              Por favor, revisa tu bandeja de entrada y haz clic en el enlace de confirmación.
            </p>
            <div className="flux-card bg-muted/50 p-4 mb-6 text-left">
              <h3 className="font-semibold mb-3">Detalles de tu cita:</h3>
              <ul className="space-y-2 text-sm">
                <li><strong>Médico:</strong> {selectedDoctor?.full_name}</li>
                <li><strong>Fecha:</strong> {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</li>
                <li><strong>Hora:</strong> {selectedTime}</li>
                <li><strong>Modalidad:</strong> {appointmentType === "presencial" ? "Presencial" : "Virtual"}</li>
              </ul>
            </div>
            <Button asChild className="flux-gradient-primary text-primary-foreground border-0">
              <a href="/">Volver al Inicio</a>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="container max-w-4xl">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      s === step
                        ? "flux-gradient-primary text-primary-foreground flux-shadow-glow"
                        : s < step
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s < step ? "✓" : s}
                  </div>
                  {s < 4 && (
                    <div
                      className={`w-16 md:w-24 h-1 mx-2 rounded ${
                        s < step ? "bg-success" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between max-w-2xl mx-auto mt-2 text-xs text-muted-foreground">
              <span>Médico</span>
              <span>Fecha/Hora</span>
              <span>Datos</span>
              <span>Confirmar</span>
            </div>
          </div>

          <div className="flux-card p-6 md:p-8 animate-fade-in">
            {/* Step 1: Select Doctor */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-foreground">Selecciona tu médico</h2>
                  <p className="text-muted-foreground mt-2">
                    Elige el especialista con quien deseas agendar tu consulta
                  </p>
                </div>

                {loadingDoctors ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : doctors.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay médicos disponibles en este momento.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {doctors.map((doctor) => (
                      <button
                        key={doctor.id}
                        onClick={() => {
                          setSelectedDoctor(doctor);
                          setSelectedOffice(doctor.office_id || "");
                        }}
                        className={`p-4 rounded-xl border-2 text-left transition-all hover:border-primary ${
                          selectedDoctor?.id === doctor.id
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                            {doctor.full_name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{doctor.full_name}</h3>
                            {doctor.specialty && (
                              <p className="text-sm text-primary">{doctor.specialty}</p>
                            )}
                            {doctor.office && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {doctor.office.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!selectedDoctor}
                    className="gap-2 flux-gradient-primary text-primary-foreground border-0"
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Select Date & Time */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-foreground">Selecciona fecha y hora</h2>
                  <p className="text-muted-foreground mt-2">
                    Elige el día y horario que mejor te convenga
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Calendar */}
                  <div>
                    <Label className="mb-3 block">Fecha de la cita</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setSelectedTime("");
                      }}
                      disabled={(date) =>
                        isBefore(date, new Date()) || isAfter(date, addDays(new Date(), 60))
                      }
                      locale={es}
                      className="rounded-lg border"
                    />
                  </div>

                  {/* Time Slots & Options */}
                  <div className="space-y-6">
                    <div>
                      <Label className="mb-3 block">Modalidad de cita</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setAppointmentType("presencial")}
                          className={`p-4 rounded-lg border-2 flex items-center gap-3 transition-all ${
                            appointmentType === "presencial"
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Building2 className="h-5 w-5 text-primary" />
                          <span className="font-medium">Presencial</span>
                        </button>
                        <button
                          onClick={() => setAppointmentType("virtual")}
                          className={`p-4 rounded-lg border-2 flex items-center gap-3 transition-all ${
                            appointmentType === "virtual"
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Video className="h-5 w-5 text-primary" />
                          <span className="font-medium">Virtual</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-3 block">Duración</Label>
                      <Select value={duration.toString()} onValueChange={(v) => setDuration(Number(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="60">60 minutos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedDate && (
                      <div>
                        <Label className="mb-3 block">Horarios disponibles</Label>
                        {loadingSlots ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="ml-2 text-sm text-muted-foreground">Cargando horarios...</span>
                          </div>
                        ) : availableSlots.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4">
                            No hay horarios disponibles para esta fecha. Por favor, selecciona otra fecha.
                          </p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                            {availableSlots.map((time) => (
                              <button
                                key={time}
                                onClick={() => setSelectedTime(time)}
                                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                  selectedTime === time
                                    ? "flux-gradient-primary text-primary-foreground"
                                    : "bg-muted hover:bg-primary/10"
                                }`}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Atrás
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!selectedDate || !selectedTime}
                    className="gap-2 flux-gradient-primary text-primary-foreground border-0"
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Patient Info */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-foreground">Tus datos</h2>
                  <p className="text-muted-foreground mt-2">
                    Completa la información para agendar tu cita
                  </p>
                </div>

                {/* Patient Type Selector */}
                <div className="mb-6">
                  <Label className="mb-3 block">¿Eres paciente nuevo o ya estás registrado?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handlePatientTypeChange("new")}
                      className={`p-4 rounded-lg border-2 flex items-center gap-3 transition-all ${
                        patientType === "new"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <UserPlus className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <span className="font-medium block">Paciente nuevo</span>
                        <span className="text-xs text-muted-foreground">Primera vez en la clínica</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handlePatientTypeChange("existing")}
                      className={`p-4 rounded-lg border-2 flex items-center gap-3 transition-all ${
                        patientType === "existing"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <UserCheck className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <span className="font-medium block">Ya estoy registrado</span>
                        <span className="text-xs text-muted-foreground">He tenido citas antes</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Existing Patient Search */}
                {patientType === "existing" && (
                  <div className="flux-card bg-muted/30 p-4 space-y-4">
                    <Label className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-primary" />
                      Buscar mi registro
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Correo electrónico o teléfono"
                        onKeyDown={(e) => e.key === "Enter" && handleSearchPatient()}
                      />
                      <Button 
                        onClick={handleSearchPatient} 
                        disabled={searchingPatient}
                        className="shrink-0"
                      >
                        {searchingPatient ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {foundPatient && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/30">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <div>
                          <p className="font-medium text-foreground">{foundPatient.full_name}</p>
                          <p className="text-sm text-muted-foreground">{foundPatient.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Patient Form - Show for new patients OR after finding existing patient */}
                {(patientType === "new" || foundPatient) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Nombre completo *
                      </Label>
                      <Input
                        id="name"
                        value={formData.patient_name}
                        onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                        placeholder="Tu nombre completo"
                        required
                        disabled={patientType === "existing" && !!foundPatient}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        Teléfono *
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.patient_phone}
                        onChange={(e) => setFormData({ ...formData, patient_phone: e.target.value })}
                        placeholder="+52 55 1234 5678"
                        required
                        disabled={patientType === "existing" && !!foundPatient}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Correo electrónico *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.patient_email}
                        onChange={(e) => setFormData({ ...formData, patient_email: e.target.value })}
                        placeholder="tu@email.com"
                        required
                        disabled={patientType === "existing" && !!foundPatient}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="reason" className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Motivo de la consulta *
                      </Label>
                      <Input
                        id="reason"
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        placeholder="Describe brevemente el motivo de tu visita"
                        required
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="notes">Notas adicionales (opcional)</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Información adicional que consideres relevante..."
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Atrás
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    disabled={
                      !formData.patient_name || 
                      !formData.patient_email || 
                      !formData.patient_phone || 
                      !formData.reason ||
                      (patientType === "existing" && !foundPatient)
                    }
                    className="gap-2 flux-gradient-primary text-primary-foreground border-0"
                  >
                    Revisar Cita
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-foreground">Confirma tu cita</h2>
                  <p className="text-muted-foreground mt-2">
                    Revisa los detalles antes de confirmar
                  </p>
                </div>

                <div className="flux-card bg-muted/30 p-6 space-y-4">
                  <div className="flex items-center gap-4 pb-4 border-b border-border">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                      {selectedDoctor?.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{selectedDoctor?.full_name}</h3>
                      {selectedDoctor?.specialty && (
                        <p className="text-sm text-primary">{selectedDoctor.specialty}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Fecha:</span>
                      <p className="font-medium">
                        {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hora:</span>
                      <p className="font-medium">{selectedTime}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Modalidad:</span>
                      <p className="font-medium flex items-center gap-2">
                        {appointmentType === "presencial" ? (
                          <>
                            <Building2 className="h-4 w-4" /> Presencial
                          </>
                        ) : (
                          <>
                            <Video className="h-4 w-4" /> Virtual
                          </>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duración:</span>
                      <p className="font-medium">{duration} minutos</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Paciente:</span> {formData.patient_name}</p>
                    <p><span className="text-muted-foreground">Email:</span> {formData.patient_email}</p>
                    <p><span className="text-muted-foreground">Teléfono:</span> {formData.patient_phone}</p>
                    <p><span className="text-muted-foreground">Motivo:</span> {formData.reason}</p>
                    {formData.notes && (
                      <p><span className="text-muted-foreground">Notas:</span> {formData.notes}</p>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  Al confirmar, recibirás un correo electrónico con un enlace para validar tu cita.
                  La cita solo será confirmada cuando hagas clic en dicho enlace.
                </p>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Atrás
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="gap-2 flux-gradient-primary text-primary-foreground border-0 px-8"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Confirmar Cita
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Time slot generation is now handled by the useAvailableSlots hook
