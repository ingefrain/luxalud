import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Appointment, Doctor, AppointmentStatus } from "@/lib/types";

export default function AppointmentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", "list", statusFilter, dateFilter?.toString()],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select("*, doctor:doctors(*)")
        .order("appointment_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "pendiente" | "confirmada" | "cancelada" | "completada");
      }

      if (dateFilter) {
        query = query.eq("appointment_date", format(dateFilter, "yyyy-MM-dd"));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Appointment & { doctor: Doctor })[];
    },
  });

  // Update appointment status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: "Estado actualizado",
        description: "El estado de la cita ha sido actualizado.",
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

  const filteredAppointments = appointments.filter((apt) =>
    apt.patient_name.toLowerCase().includes(search.toLowerCase()) ||
    apt.patient_email.toLowerCase().includes(search.toLowerCase())
  );

  // Agrupar citas por doctor
  const appointmentsByDoctor = filteredAppointments.reduce((acc, apt) => {
    const doctorId = apt.doctor_id;
    const doctorName = apt.doctor?.full_name || "Sin asignar";
    
    if (!acc[doctorId]) {
      acc[doctorId] = {
        doctorName,
        appointments: []
      };
    }
    acc[doctorId].appointments.push(apt);
    return acc;
  }, {} as Record<string, { doctorName: string; appointments: typeof filteredAppointments }>);

  const statusColors: Record<string, string> = {
    pendiente: "bg-warning/10 text-warning border-warning/20",
    confirmada: "bg-success/10 text-success border-success/20",
    cancelada: "bg-destructive/10 text-destructive border-destructive/20",
    completada: "bg-muted text-muted-foreground border-muted",
  };

  const statusIcons: Record<string, React.ElementType> = {
    pendiente: AlertCircle,
    confirmada: CheckCircle,
    cancelada: XCircle,
    completada: CheckCircle,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Citas</h1>
          <p className="text-muted-foreground">
            Gestiona todas las citas del consultorio
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="confirmada">Confirmada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
            <SelectItem value="completada">Completada</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto gap-2">
              <CalendarIcon className="h-4 w-4" />
              {dateFilter ? format(dateFilter, "dd/MM/yyyy") : "Filtrar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={dateFilter}
              onSelect={setDateFilter}
              locale={es}
            />
            {dateFilter && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setDateFilter(undefined)}
                >
                  Limpiar filtro
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Citas agrupadas por doctor */}
      {Object.keys(appointmentsByDoctor).length === 0 ? (
        <div className="flux-card p-12 text-center text-muted-foreground">
          <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No hay citas registradas</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(appointmentsByDoctor).map(([doctorId, { doctorName, appointments: doctorAppointments }]) => (
            <div key={doctorId} className="flux-card overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b border-border">
                <h3 className="font-semibold text-foreground">{doctorName}</h3>
                <p className="text-sm text-muted-foreground">{doctorAppointments.length} cita(s)</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctorAppointments.map((apt) => {
                    const StatusIcon = statusIcons[apt.status];
                    return (
                      <TableRow key={apt.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{apt.patient_name}</p>
                            <p className="text-sm text-muted-foreground">{apt.patient_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(apt.appointment_date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          {apt.start_time.slice(0, 5)} - {apt.end_time.slice(0, 5)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {apt.type}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                              statusColors[apt.status]
                            }`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => updateStatus.mutate({ id: apt.id, status: "confirmada" })}
                              >
                                <CheckCircle className="h-4 w-4 mr-2 text-success" />
                                Confirmar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatus.mutate({ id: apt.id, status: "completada" })}
                              >
                                <CheckCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                                Marcar completada
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatus.mutate({ id: apt.id, status: "cancelada" })}
                                className="text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancelar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
