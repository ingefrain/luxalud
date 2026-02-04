import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, UserCog, Users } from "lucide-react";
import type { AppRole } from "@/lib/types";

type ExtendedAppRole = AppRole | "admin";

interface DashboardUser {
  id: string;
  email: string;
  full_name: string | null;
  roles: ExtendedAppRole[];
  created_at: string;
}

export default function UsersPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<ExtendedAppRole>("asistente");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users with roles
  const { data: users, isLoading } = useQuery({
    queryKey: ["dashboard-users"],
    queryFn: async () => {
      // Get all user_roles with profile info
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at");

      if (rolesError) throw rolesError;

      // Get profiles for these users
      const userIds = [...new Set(userRoles.map((r) => r.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Group roles by user
      const usersMap = new Map<string, DashboardUser>();
      
      for (const role of userRoles) {
        const profile = profiles.find((p) => p.user_id === role.user_id);
        if (!usersMap.has(role.user_id)) {
          usersMap.set(role.user_id, {
            id: role.user_id,
            email: profile?.email || "Sin email",
            full_name: profile?.full_name || null,
            roles: [],
            created_at: role.created_at,
          });
        }
        usersMap.get(role.user_id)!.roles.push(role.role as ExtendedAppRole);
      }

      return Array.from(usersMap.values());
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      role: ExtendedAppRole;
      full_name?: string;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) {
        throw new Error("No hay sesión activa");
      }

      const response = await supabase.functions.invoke("create-user", {
        body: userData,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard-users"] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear usuario",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserName("");
    setNewUserRole("asistente");
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate({
      email: newUserEmail,
      password: newUserPassword,
      role: newUserRole,
      full_name: newUserName || undefined,
    });
  };

  const getRoleBadgeVariant = (role: ExtendedAppRole) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "medico":
        return "default";
      case "asistente":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: ExtendedAppRole) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "medico":
        return "Médico";
      case "asistente":
        return "Asistente";
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground">
            Administra los usuarios del dashboard
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>
                Crea un usuario con acceso al dashboard. La contraseña debe ser
                cambiada por el usuario en su primer inicio de sesión.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Juan Pérez"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña temporal *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol *</Label>
                <Select
                  value={newUserRole}
                  onValueChange={(v) => setNewUserRole(v as ExtendedAppRole)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asistente">Asistente</SelectItem>
                    <SelectItem value="medico">Médico</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Crear Usuario
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Usuarios del Dashboard
          </CardTitle>
          <CardDescription>
            Lista de usuarios con acceso al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Fecha de creación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || "Sin nombre"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.map((role) => (
                          <Badge
                            key={role}
                            variant={getRoleBadgeVariant(role)}
                          >
                            {getRoleLabel(role)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString("es-MX")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
