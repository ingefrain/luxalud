import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { Search, User, Mail, Phone, Calendar } from "lucide-react";
import type { Appointment } from "@/lib/types";

interface Patient {
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  appointment_count: number;
  last_appointment: string;
}

export default function PatientsPage() {
  const [search, setSearch] = useState("");

  // Fetch unique patients from appointments
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("patient_name, patient_email, patient_phone, appointment_date")
        .order("appointment_date", { ascending: false });

      if (error) throw error;

      // Group by email to get unique patients
      const patientsMap = new Map<string, Patient>();
      
      (data as Appointment[]).forEach((apt) => {
        const existing = patientsMap.get(apt.patient_email);
        if (existing) {
          existing.appointment_count++;
        } else {
          patientsMap.set(apt.patient_email, {
            patient_name: apt.patient_name,
            patient_email: apt.patient_email,
            patient_phone: apt.patient_phone,
            appointment_count: 1,
            last_appointment: apt.appointment_date,
          });
        }
      });

      return Array.from(patientsMap.values());
    },
  });

  const filteredPatients = patients.filter((patient) =>
    patient.patient_name.toLowerCase().includes(search.toLowerCase()) ||
    patient.patient_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
        <p className="text-muted-foreground">
          Lista de pacientes que han agendado citas
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="flux-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Citas</TableHead>
              <TableHead>Última Cita</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No se encontraron pacientes</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients.map((patient) => (
                <TableRow key={patient.patient_email}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                        {patient.patient_name.charAt(0)}
                      </div>
                      <span className="font-medium">{patient.patient_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        {patient.patient_email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {patient.patient_phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      <Calendar className="h-3 w-3" />
                      {patient.appointment_count} {patient.appointment_count === 1 ? "cita" : "citas"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(patient.last_appointment).toLocaleDateString("es-MX")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
