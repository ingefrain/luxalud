import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2, UserCog, Stethoscope } from "lucide-react";
import type { Doctor, AppRole } from "@/lib/types";

type ExtendedAppRole = AppRole | "admin";

interface DashboardUser {
  id: string;
  email: string;
  full_name: string | null;
  roles: ExtendedAppRole[];
  assigned_doctors: string[];
}

export default function UserAssignmentsPage() {
  const [selectedUser, setSelectedUser] = useState<DashboardUser | null>(null);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users with their assignments
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users-with-assignments"],
    queryFn: async () => {
      // Get all user_roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Get profiles
      const userIds = [...new Set(userRoles.map((r) => r.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Get assignments - using raw query since types might not be updated yet
      const { data: assignments, error: assignmentsError } = await supabase
        .from("user_doctor_assignments")
        .select("user_id, doctor_id");

      if (assignmentsError) {
        console.error("Assignments error:", assignmentsError);
        // If table doesn't exist in types yet, continue with empty assignments
      }

      // Build users map
      const usersMap = new Map<string, DashboardUser>();

      for (const role of userRoles) {
        const profile = profiles.find((p) => p.user_id === role.user_id);
        if (!usersMap.has(role.user_id)) {
          usersMap.set(role.user_id, {
            id: role.user_id,
            email: profile?.email || "Sin email",
            full_name: profile?.full_name || null,
            roles: [],
            assigned_doctors: [],
          });
        }
        usersMap.get(role.user_id)!.roles.push(role.role as ExtendedAppRole);
      }

      // Add assignments
      if (assignments) {
        for (const assignment of assignments) {
          const user = usersMap.get(assignment.user_id);
          if (user) {
            user.assigned_doctors.push(assignment.doctor_id);
          }
        }
      }

      return Array.from(usersMap.values());
    },
  });

  // Fetch all doctors
  const { data: doctors } = useQuery({
    queryKey: ["all-doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data as Doctor[];
    },
  });

  // Update assignments mutation
  const updateAssignmentsMutation = useMutation({
    mutationFn: async ({
      userId,
      doctorIds,
    }: {
      userId: string;
      doctorIds: string[];
    }) => {
      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from("user_doctor_assignments")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (doctorIds.length > 0) {
        const { error: insertError } = await supabase
          .from("user_doctor_assignments")
          .insert(
            doctorIds.map((doctor_id) => ({
              user_id: userId,
              doctor_id,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      toast({
        title: "Asignaciones actualizadas",
        description: "Los doctores han sido asignados correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["users-with-assignments"] });
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openAssignmentDialog = (user: DashboardUser) => {
    setSelectedUser(user);
    setSelectedDoctorIds([...user.assigned_doctors]);
  };

  const handleDoctorToggle = (doctorId: string) => {
    setSelectedDoctorIds((prev) =>
      prev.includes(doctorId)
        ? prev.filter((id) => id !== doctorId)
        : [...prev, doctorId]
    );
  };

  const handleSaveAssignments = () => {
    if (!selectedUser) return;
    updateAssignmentsMutation.mutate({
      userId: selectedUser.id,
      doctorIds: selectedDoctorIds,
    });
  };

  const getRoleLabel = (role: ExtendedAppRole) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "medico":
        return "Médico";
      case "asistente":
        return "Asistente";
      default:
        return role;
    }
  };

  const getDoctorNames = (doctorIds: string[]) => {
    if (!doctors || doctorIds.length === 0) return "Sin asignar";
    return doctorIds
      .map((id) => doctors.find((d) => d.id === id)?.full_name || "Desconocido")
      .join(", ");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Link2 className="h-6 w-6" />
          Asignación Usuario-Doctor
        </h1>
        <p className="text-muted-foreground">
          Define qué doctores puede gestionar cada usuario
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Usuarios y sus Doctores Asignados
          </CardTitle>
          <CardDescription>
            Haz clic en "Asignar" para modificar los doctores que puede
            gestionar cada usuario
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay usuarios registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Doctores Asignados</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.full_name || "Sin nombre"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.map((role) => (
                          <Badge key={role} variant="outline">
                            {getRoleLabel(role)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {getDoctorNames(user.assigned_doctors)}
                      </div>
                      {user.assigned_doctors.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {user.assigned_doctors.length} doctor(es)
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAssignmentDialog(user)}
                      >
                        <Stethoscope className="h-4 w-4 mr-1" />
                        Asignar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Doctores</DialogTitle>
            <DialogDescription>
              Este usuario puede ver y gestionar las citas de:
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-medium">
                  {selectedUser.full_name || "Sin nombre"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedUser.email}
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {doctors?.map((doctor) => (
                  <label
                    key={doctor.id}
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedDoctorIds.includes(doctor.id)}
                      onCheckedChange={() => handleDoctorToggle(doctor.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{doctor.full_name}</div>
                      {doctor.specialty && (
                        <div className="text-sm text-muted-foreground">
                          {doctor.specialty}
                        </div>
                      )}
                    </div>
                  </label>
                ))}

                {(!doctors || doctors.length === 0) && (
                  <div className="text-center py-4 text-muted-foreground">
                    No hay doctores disponibles
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedUser(null)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveAssignments}
                  disabled={updateAssignmentsMutation.isPending}
                >
                  {updateAssignmentsMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
