import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { User, Building2, Save, Loader2, Plus, Edit, Trash2 } from "lucide-react";
import type { Office, Doctor } from "@/lib/types";

export default function SettingsPage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Profile form state
  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || "",
    email: profile?.email || user?.email || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Office dialog state
  const [officeDialogOpen, setOfficeDialogOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [officeData, setOfficeData] = useState({
    name: "",
    address: "",
    phone: "",
  });

  // Doctor dialog state
  const [doctorDialogOpen, setDoctorDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [doctorData, setDoctorData] = useState({
    full_name: "",
    specialty: "",
    email: "",
    phone: "",
    office_id: "",
  });

  // Fetch offices
  const { data: offices = [] } = useQuery({
    queryKey: ["offices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("offices").select("*").order("name");
      if (error) throw error;
      return data as Office[];
    },
  });

  // Fetch doctors
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("*, office:offices(*)")
        .order("full_name");
      if (error) throw error;
      return data as (Doctor & { office: Office })[];
    },
  });

  // Update profile
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.full_name,
          email: profileData.email,
        })
        .eq("user_id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Perfil actualizado" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Office mutations
  const saveOfficeMutation = useMutation({
    mutationFn: async () => {
      if (editingOffice) {
        const { error } = await supabase
          .from("offices")
          .update(officeData)
          .eq("id", editingOffice.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("offices").insert(officeData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offices"] });
      toast({ title: editingOffice ? "Consultorio actualizado" : "Consultorio creado" });
      setOfficeDialogOpen(false);
      resetOfficeForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteOfficeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("offices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offices"] });
      toast({ title: "Consultorio eliminado" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Doctor mutations
  const saveDoctorMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: doctorData.full_name,
        specialty: doctorData.specialty || null,
        email: doctorData.email || null,
        phone: doctorData.phone || null,
        office_id: doctorData.office_id || null,
      };

      if (editingDoctor) {
        const { error } = await supabase.from("doctors").update(payload).eq("id", editingDoctor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("doctors").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors-all"] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast({ title: editingDoctor ? "Médico actualizado" : "Médico creado" });
      setDoctorDialogOpen(false);
      resetDoctorForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDoctorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("doctors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors-all"] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast({ title: "Médico eliminado" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetOfficeForm = () => {
    setEditingOffice(null);
    setOfficeData({ name: "", address: "", phone: "" });
  };

  const resetDoctorForm = () => {
    setEditingDoctor(null);
    setDoctorData({ full_name: "", specialty: "", email: "", phone: "", office_id: "" });
  };

  const openEditOffice = (office: Office) => {
    setEditingOffice(office);
    setOfficeData({
      name: office.name,
      address: office.address || "",
      phone: office.phone || "",
    });
    setOfficeDialogOpen(true);
  };

  const openEditDoctor = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setDoctorData({
      full_name: doctor.full_name,
      specialty: doctor.specialty || "",
      email: doctor.email || "",
      phone: doctor.phone || "",
      office_id: doctor.office_id || "",
    });
    setDoctorDialogOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    await updateProfileMutation.mutateAsync();
    setSavingProfile(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground">Administra tu perfil, consultorios y médicos</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Mi Perfil
          </CardTitle>
          <CardDescription>Actualiza tu información personal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nombre completo</Label>
              <Input
                id="profile-name"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              />
            </div>
            <Button
              type="submit"
              disabled={savingProfile}
              className="gap-2 flux-gradient-primary text-primary-foreground border-0"
            >
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar Cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Offices Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Consultorios
            </CardTitle>
            <CardDescription>Administra los consultorios disponibles</CardDescription>
          </div>
          <Button
            onClick={() => {
              resetOfficeForm();
              setOfficeDialogOpen(true);
            }}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent>
          {offices.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay consultorios registrados</p>
          ) : (
            <div className="space-y-2">
              {offices.map((office) => (
                <div
                  key={office.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{office.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {office.address || "Sin dirección"} {office.phone && `• ${office.phone}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditOffice(office)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteOfficeMutation.mutate(office.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Doctors Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Médicos
            </CardTitle>
            <CardDescription>Administra los médicos del sistema</CardDescription>
          </div>
          <Button
            onClick={() => {
              resetDoctorForm();
              setDoctorDialogOpen(true);
            }}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent>
          {doctors.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay médicos registrados</p>
          ) : (
            <div className="space-y-2">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                      {doctor.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{doctor.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {doctor.specialty || "Sin especialidad"}
                        {doctor.office && ` • ${doctor.office.name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDoctor(doctor)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteDoctorMutation.mutate(doctor.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Office Dialog */}
      <Dialog open={officeDialogOpen} onOpenChange={setOfficeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOffice ? "Editar Consultorio" : "Nuevo Consultorio"}</DialogTitle>
            <DialogDescription>
              {editingOffice ? "Modifica los datos del consultorio" : "Ingresa los datos del nuevo consultorio"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={officeData.name}
                onChange={(e) => setOfficeData({ ...officeData, name: e.target.value })}
                placeholder="Nombre del consultorio"
              />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input
                value={officeData.address}
                onChange={(e) => setOfficeData({ ...officeData, address: e.target.value })}
                placeholder="Dirección completa"
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={officeData.phone}
                onChange={(e) => setOfficeData({ ...officeData, phone: e.target.value })}
                placeholder="Número de teléfono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfficeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveOfficeMutation.mutate()}
              disabled={!officeData.name || saveOfficeMutation.isPending}
              className="flux-gradient-primary text-primary-foreground border-0"
            >
              {saveOfficeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Doctor Dialog */}
      <Dialog open={doctorDialogOpen} onOpenChange={setDoctorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDoctor ? "Editar Médico" : "Nuevo Médico"}</DialogTitle>
            <DialogDescription>
              {editingDoctor ? "Modifica los datos del médico" : "Ingresa los datos del nuevo médico"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre completo *</Label>
              <Input
                value={doctorData.full_name}
                onChange={(e) => setDoctorData({ ...doctorData, full_name: e.target.value })}
                placeholder="Dr. Juan Pérez"
              />
            </div>
            <div className="space-y-2">
              <Label>Especialidad</Label>
              <Input
                value={doctorData.specialty}
                onChange={(e) => setDoctorData({ ...doctorData, specialty: e.target.value })}
                placeholder="Medicina General, Cardiología, etc."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={doctorData.email}
                  onChange={(e) => setDoctorData({ ...doctorData, email: e.target.value })}
                  placeholder="doctor@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={doctorData.phone}
                  onChange={(e) => setDoctorData({ ...doctorData, phone: e.target.value })}
                  placeholder="555-1234"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Consultorio</Label>
              <select
                value={doctorData.office_id}
                onChange={(e) => setDoctorData({ ...doctorData, office_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Sin asignar</option>
                {offices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDoctorDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveDoctorMutation.mutate()}
              disabled={!doctorData.full_name || saveDoctorMutation.isPending}
              className="flux-gradient-primary text-primary-foreground border-0"
            >
              {saveDoctorMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
