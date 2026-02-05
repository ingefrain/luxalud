import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  Upload,
  Trash2,
  Loader2,
  File,
  Image as ImageIcon,
  Stethoscope,
} from "lucide-react";
import type { Patient, PatientFile, Appointment, Doctor } from "@/lib/types";
import { SecureFileLink } from "@/components/dashboard/SecureFileLink";

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileDescription, setFileDescription] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch patient details with doctor
  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*, doctor:doctors(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Patient & { doctor: Doctor | null };
    },
    enabled: !!id,
  });

  // Fetch patient files
  const { data: files = [], isLoading: loadingFiles } = useQuery({
    queryKey: ["patient-files", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_files")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PatientFile[];
    },
    enabled: !!id,
  });

  // Fetch patient appointments
  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ["patient-appointments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, doctor:doctors(*)")
        .eq("patient_id", id)
        .order("appointment_date", { ascending: false });
      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!id,
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, description }: { file: File; description: string }) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `${id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("patient-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save file record with PATH (not public URL) for security
      // Signed URLs will be generated on-demand when viewing files
      const { error: dbError } = await supabase.from("patient_files").insert({
        patient_id: id,
        file_url: filePath, // Store path, not URL
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        description,
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-files", id] });
      toast({ title: "Archivo subido correctamente" });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setFileDescription("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error al subir archivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (file: PatientFile) => {
      // Extract file path from URL
      const urlParts = file.file_url.split("/");
      const filePath = urlParts.slice(-2).join("/");

      // Delete from storage
      await supabase.storage.from("patient-files").remove([filePath]);

      // Delete record
      const { error } = await supabase
        .from("patient_files")
        .delete()
        .eq("id", file.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-files", id] });
      toast({ title: "Archivo eliminado" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadDialogOpen(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    await uploadFileMutation.mutateAsync({
      file: selectedFile,
      description: fileDescription,
    });
    setUploading(false);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5" />;
    if (type === "application/pdf") return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pendiente: "bg-warning/10 text-warning",
      confirmada: "bg-info/10 text-info",
      completada: "bg-success/10 text-success",
      cancelada: "bg-destructive/10 text-destructive",
    };
    const labels: Record<string, string> = {
      pendiente: "Pendiente",
      confirmada: "Confirmada",
      completada: "Completada",
      cancelada: "Cancelada",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loadingPatient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Paciente no encontrado</p>
        <Button asChild className="mt-4">
          <Link to="/dashboard/pacientes">Volver a pacientes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard/pacientes">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{patient.full_name}</h1>
          <p className="text-muted-foreground">Expediente del paciente</p>
        </div>
      </div>

      {/* Patient Info Card */}
      <div className="flux-card p-6">
        <h2 className="text-lg font-semibold mb-4">Datos Generales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{patient.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teléfono</p>
              <p className="font-medium">{patient.phone}</p>
            </div>
          </div>
          {patient.date_of_birth && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Nacimiento</p>
                <p className="font-medium">
                  {format(new Date(patient.date_of_birth), "d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
            </div>
          )}
          {patient.gender && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Género</p>
                <p className="font-medium capitalize">{patient.gender}</p>
              </div>
            </div>
          )}
          {patient.doctor && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center text-info">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Médico Asignado</p>
                <p className="font-medium">{patient.doctor.full_name}</p>
                {patient.doctor.specialty && (
                  <p className="text-xs text-muted-foreground">{patient.doctor.specialty}</p>
                )}
              </div>
            </div>
          )}
          {patient.address && (
            <div className="flex items-center gap-3 md:col-span-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dirección</p>
                <p className="font-medium">{patient.address}</p>
              </div>
            </div>
          )}
        </div>
        {patient.notes && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Notas</p>
            <p>{patient.notes}</p>
          </div>
        )}
      </div>

      {/* Archivos Clínicos */}
      <div className="flux-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Archivos Clínicos</h2>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 flux-gradient-primary text-primary-foreground border-0"
            >
              <Upload className="h-4 w-4" />
              Subir Archivo
            </Button>
          </div>
        </div>

        {loadingFiles ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay archivos clínicos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {getFileIcon(file.file_type)}
                  </div>
                  <div>
                    <p className="font-medium">{file.file_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {file.description || "Sin descripción"} •{" "}
                      {format(new Date(file.created_at), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SecureFileLink
                    bucket="patient-files"
                    filePath={file.file_url}
                    fileName={file.file_name}
                    action="view"
                  />
                  <SecureFileLink
                    bucket="patient-files"
                    filePath={file.file_url}
                    fileName={file.file_name}
                    action="download"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteFileMutation.mutate(file)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de Citas */}
      <div className="flux-card overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Historial de Citas</h2>
        </div>
        {loadingAppointments ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay citas registradas</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Médico</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((apt) => (
                <TableRow key={apt.id}>
                  <TableCell>
                    {format(new Date(apt.appointment_date), "d MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>{apt.start_time.slice(0, 5)}</TableCell>
                  <TableCell>{apt.doctor?.full_name || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{apt.reason}</TableCell>
                  <TableCell>{getStatusBadge(apt.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Archivo Clínico</DialogTitle>
            <DialogDescription>
              Agrega una descripción para el archivo seleccionado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedFile && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                {getFileIcon(selectedFile.type)}
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                placeholder="Ej: Radiografía de tórax, Resultados de laboratorio..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="gap-2 flux-gradient-primary text-primary-foreground border-0"
            >
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              Subir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
