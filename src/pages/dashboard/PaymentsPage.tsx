import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Search,
  Plus,
  DollarSign,
  Receipt,
  Loader2,
  FileText,
  CreditCard,
  Banknote,
  Building,
  HelpCircle,
  Upload,
} from "lucide-react";
import type { Payment, Patient, PaymentMethod } from "@/lib/types";
import { SecureFileLink } from "@/components/dashboard/SecureFileLink";

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    patient_id: "",
    appointment_id: "",
    amount: "",
    payment_method: "efectivo" as PaymentMethod,
    payment_date: format(new Date(), "yyyy-MM-dd"),
    reference: "",
    notes: "",
  });

  // Fetch payments with patient info
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, patient:patients(*)")
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data as (Payment & { patient: Patient })[];
    },
  });

  // Fetch patients for select
  const { data: patients = [] } = useQuery({
    queryKey: ["patients-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data as Patient[];
    },
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      let receiptPath = null;

      // Upload receipt if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const filePath = `${formData.patient_id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("payment-receipts")
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        // Store path, not public URL - signed URLs generated on-demand
        receiptPath = filePath;
      }

      const { error } = await supabase.from("payments").insert({
        patient_id: formData.patient_id,
        appointment_id: formData.appointment_id || null,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        reference: formData.reference || null,
        notes: formData.notes || null,
        receipt_url: receiptPath, // Store path for secure access
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "Pago registrado correctamente" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al registrar pago",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      patient_id: "",
      appointment_id: "",
      amount: "",
      payment_method: "efectivo",
      payment_date: format(new Date(), "yyyy-MM-dd"),
      reference: "",
      notes: "",
    });
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_id || !formData.amount) {
      toast({
        title: "Campos requeridos",
        description: "Selecciona un paciente e ingresa el monto",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    await createPaymentMutation.mutateAsync();
    setUploading(false);
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case "efectivo":
        return <Banknote className="h-4 w-4" />;
      case "tarjeta":
        return <CreditCard className="h-4 w-4" />;
      case "transferencia":
        return <Building className="h-4 w-4" />;
      default:
        return <HelpCircle className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    const labels: Record<PaymentMethod, string> = {
      efectivo: "Efectivo",
      tarjeta: "Tarjeta",
      transferencia: "Transferencia",
      otro: "Otro",
    };
    return labels[method];
  };

  const filteredPayments = payments.filter(
    (payment) =>
      payment.patient?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      payment.reference?.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate totals
  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const thisMonthPayments = payments.filter(
    (p) =>
      new Date(p.payment_date).getMonth() === new Date().getMonth() &&
      new Date(p.payment_date).getFullYear() === new Date().getFullYear()
  );
  const thisMonthAmount = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ingresos</h1>
          <p className="text-muted-foreground">Control de pagos y comprobantes</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-2 flux-gradient-primary text-primary-foreground border-0"
        >
          <Plus className="h-4 w-4" />
          Registrar Pago
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flux-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Acumulado</p>
              <p className="text-2xl font-bold text-foreground">
                ${totalAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <div className="flux-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Este Mes</p>
              <p className="text-2xl font-bold text-foreground">
                ${thisMonthAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <div className="flux-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center text-info">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Transacciones</p>
              <p className="text-2xl font-bold text-foreground">{payments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por paciente o referencia..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="flux-card overflow-hidden">
        {loadingPayments ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Comprobante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay pagos registrados</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.payment_date), "d MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                          {payment.patient?.full_name.charAt(0)}
                        </div>
                        <span className="font-medium">{payment.patient?.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-success">
                      ${Number(payment.amount).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(payment.payment_method)}
                        <span>{getPaymentMethodLabel(payment.payment_method)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.reference || "—"}
                    </TableCell>
                    <TableCell>
                      {payment.receipt_url ? (
                        <SecureFileLink
                          bucket="payment-receipts"
                          filePath={payment.receipt_url}
                          fileName={`comprobante-${payment.id.slice(0, 8)}.pdf`}
                          action="view"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>Ingresa los detalles del pago recibido</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Select
                value={formData.patient_id}
                onValueChange={(v) => setFormData({ ...formData, patient_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="pl-10"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(v) =>
                  setFormData({ ...formData, payment_method: v as PaymentMethod })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Referencia (opcional)</Label>
              <Input
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Número de transacción, folio, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Comprobante (opcional)</Label>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 flex-1"
                >
                  <Upload className="h-4 w-4" />
                  {selectedFile ? selectedFile.name : "Subir archivo"}
                </Button>
                {selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedFile(null)}
                  >
                    ×
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observaciones adicionales..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={uploading}
                className="gap-2 flux-gradient-primary text-primary-foreground border-0"
              >
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
