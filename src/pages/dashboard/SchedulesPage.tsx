import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Clock, Trash2, Loader2 } from "lucide-react";
import type { Doctor, Schedule } from "@/lib/types";

const daysOfWeek = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export default function SchedulesPage() {
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    day_of_week: 1,
    start_time: "09:00",
    end_time: "18:00",
    slot_duration: 30,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Fetch schedules for selected doctor
  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ["schedules", selectedDoctor],
    queryFn: async () => {
      if (!selectedDoctor) return [];
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("doctor_id", selectedDoctor)
        .order("day_of_week");
      if (error) throw error;
      return data as Schedule[];
    },
    enabled: !!selectedDoctor,
  });

  // Create schedule
  const createSchedule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("schedules").insert({
        doctor_id: selectedDoctor,
        ...newSchedule,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setDialogOpen(false);
      toast({
        title: "Horario creado",
        description: "El bloque horario ha sido agregado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle schedule active status
  const toggleSchedule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("schedules")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });

  // Delete schedule
  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast({
        title: "Horario eliminado",
        description: "El bloque horario ha sido eliminado.",
      });
    },
  });

  const getDayLabel = (dayValue: number) => {
    return daysOfWeek.find((d) => d.value === dayValue)?.label || "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Horarios</h1>
          <p className="text-muted-foreground">
            Gestiona los horarios disponibles de cada médico
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedDoctor} className="gap-2 flux-gradient-primary text-primary-foreground border-0">
              <Plus className="h-4 w-4" />
              Agregar Horario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Bloque Horario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Día de la semana</Label>
                <Select
                  value={newSchedule.day_of_week.toString()}
                  onValueChange={(v) => setNewSchedule({ ...newSchedule, day_of_week: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora inicio</Label>
                  <Input
                    type="time"
                    value={newSchedule.start_time}
                    onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora fin</Label>
                  <Input
                    type="time"
                    value={newSchedule.end_time}
                    onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Duración de cita (minutos)</Label>
                <Select
                  value={newSchedule.slot_duration.toString()}
                  onValueChange={(v) => setNewSchedule({ ...newSchedule, slot_duration: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">60 minutos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full flux-gradient-primary text-primary-foreground border-0"
                onClick={() => createSchedule.mutate()}
                disabled={createSchedule.isPending}
              >
                {createSchedule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Horario
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Doctor Selection */}
      <div className="max-w-md">
        <Label className="mb-2 block">Selecciona un médico</Label>
        <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar médico..." />
          </SelectTrigger>
          <SelectContent>
            {doctors.map((doctor) => (
              <SelectItem key={doctor.id} value={doctor.id}>
                {doctor.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Schedules Grid */}
      {selectedDoctor && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingSchedules ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay horarios configurados para este médico</p>
            </div>
          ) : (
            schedules.map((schedule) => (
              <Card key={schedule.id} className={!schedule.is_active ? "opacity-60" : ""}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-semibold">
                    {getDayLabel(schedule.day_of_week)}
                  </CardTitle>
                  <Switch
                    checked={schedule.is_active}
                    onCheckedChange={(checked) =>
                      toggleSchedule.mutate({ id: schedule.id, is_active: checked })
                    }
                  />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-lg font-medium text-primary mb-2">
                    <Clock className="h-5 w-5" />
                    {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Citas de {schedule.slot_duration} minutos
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteSchedule.mutate(schedule.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
