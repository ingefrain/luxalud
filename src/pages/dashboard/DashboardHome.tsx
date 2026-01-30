import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Users, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp } from "lucide-react";
import type { Appointment } from "@/lib/types";

export default function DashboardHome() {
  const { profile } = useAuth();
  const today = new Date();

  // Fetch today's appointments
  const { data: todayAppointments = [] } = useQuery({
    queryKey: ["appointments", "today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, doctor:doctors(*)")
        .eq("appointment_date", format(today, "yyyy-MM-dd"))
        .order("start_time");
      if (error) throw error;
      return data as Appointment[];
    },
  });

  // Fetch week's stats
  const { data: weekAppointments = [] } = useQuery({
    queryKey: ["appointments", "week"],
    queryFn: async () => {
      const start = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
      const end = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .gte("appointment_date", start)
        .lte("appointment_date", end);
      if (error) throw error;
      return data as Appointment[];
    },
  });

  const stats = {
    today: todayAppointments.length,
    confirmed: weekAppointments.filter((a) => a.status === "confirmada").length,
    pending: weekAppointments.filter((a) => a.status === "pendiente").length,
    cancelled: weekAppointments.filter((a) => a.status === "cancelada").length,
  };

  const statusColors = {
    pendiente: "bg-warning/10 text-warning border-warning/20",
    confirmada: "bg-success/10 text-success border-success/20",
    cancelada: "bg-destructive/10 text-destructive border-destructive/20",
    completada: "bg-muted text-muted-foreground border-muted",
  };

  const statusIcons = {
    pendiente: AlertCircle,
    confirmada: CheckCircle,
    cancelada: XCircle,
    completada: CheckCircle,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          ¡Bienvenido, {profile?.full_name?.split(" ")[0] || "Usuario"}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Citas Hoy"
          value={stats.today}
          icon={Calendar}
          color="primary"
        />
        <StatsCard
          title="Confirmadas"
          value={stats.confirmed}
          icon={CheckCircle}
          color="success"
        />
        <StatsCard
          title="Pendientes"
          value={stats.pending}
          icon={AlertCircle}
          color="warning"
        />
        <StatsCard
          title="Canceladas"
          value={stats.cancelled}
          icon={XCircle}
          color="destructive"
        />
      </div>

      {/* Today's Appointments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Citas de Hoy</CardTitle>
          <span className="text-sm text-muted-foreground">
            {todayAppointments.length} citas
          </span>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay citas programadas para hoy</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((appointment) => {
                const StatusIcon = statusIcons[appointment.status];
                return (
                  <div
                    key={appointment.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Clock className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {appointment.start_time.slice(0, 5)}
                        </span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-muted-foreground">
                          {appointment.end_time.slice(0, 5)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground font-medium truncate">
                        {appointment.patient_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {appointment.reason}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                          statusColors[appointment.status]
                        }`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: "primary" | "success" | "warning" | "destructive";
}

function StatsCard({ title, value, icon: Icon, color }: StatsCardProps) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
