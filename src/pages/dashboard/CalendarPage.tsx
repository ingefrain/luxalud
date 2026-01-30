import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import type { Appointment, Doctor } from "@/lib/types";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch doctors
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data as Doctor[];
    },
  });

  // Fetch appointments for the week
  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", "calendar", format(weekStart, "yyyy-MM-dd"), selectedDoctor],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select("*, doctor:doctors(*)")
        .gte("appointment_date", format(weekStart, "yyyy-MM-dd"))
        .lte("appointment_date", format(weekEnd, "yyyy-MM-dd"))
        .order("start_time");

      if (selectedDoctor !== "all") {
        query = query.eq("doctor_id", selectedDoctor);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Appointment & { doctor: Doctor })[];
    },
  });

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter((apt) => 
      isSameDay(parseISO(apt.appointment_date), day)
    );
  };

  const statusColors = {
    pendiente: "bg-warning/20 border-warning text-warning-foreground",
    confirmada: "bg-success/20 border-success text-success-foreground",
    cancelada: "bg-destructive/20 border-destructive text-destructive-foreground",
    completada: "bg-muted border-muted-foreground/30 text-muted-foreground",
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am to 7pm

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
          <p className="text-muted-foreground">
            Vista semanal de citas
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos los médicos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los médicos</SelectItem>
              {doctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  {doctor.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date())}
              className="px-4"
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Week View */}
      <div className="flux-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day Headers */}
            <div className="grid grid-cols-8 border-b border-border">
              <div className="p-3 text-center text-sm font-medium text-muted-foreground border-r border-border">
                Hora
              </div>
              {weekDays.map((day) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toString()}
                    className={`p-3 text-center border-r border-border last:border-r-0 ${
                      isToday ? "bg-primary/5" : ""
                    }`}
                  >
                    <p className={`text-sm font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {format(day, "EEE", { locale: es })}
                    </p>
                    <p className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                      {format(day, "d")}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Time Grid */}
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-border last:border-b-0 min-h-[80px]">
                <div className="p-2 text-center text-sm text-muted-foreground border-r border-border flex items-start justify-center">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                {weekDays.map((day) => {
                  const dayAppointments = getAppointmentsForDay(day).filter((apt) => {
                    const aptHour = parseInt(apt.start_time.split(":")[0]);
                    return aptHour === hour;
                  });

                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={`p-1 border-r border-border last:border-r-0 ${
                        isSameDay(day, new Date()) ? "bg-primary/5" : ""
                      }`}
                    >
                      {dayAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          className={`p-2 rounded-md border text-xs mb-1 cursor-pointer transition-all hover:scale-[1.02] ${
                            statusColors[apt.status]
                          }`}
                        >
                          <p className="font-semibold truncate">{apt.start_time.slice(0, 5)}</p>
                          <p className="truncate">{apt.patient_name}</p>
                          {apt.doctor && (
                            <p className="text-[10px] opacity-70 truncate">Dr. {apt.doctor.full_name}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-warning/20 border border-warning" />
          <span className="text-muted-foreground">Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-success/20 border border-success" />
          <span className="text-muted-foreground">Confirmada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-destructive/20 border border-destructive" />
          <span className="text-muted-foreground">Cancelada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted border border-muted-foreground/30" />
          <span className="text-muted-foreground">Completada</span>
        </div>
      </div>
    </div>
  );
}
