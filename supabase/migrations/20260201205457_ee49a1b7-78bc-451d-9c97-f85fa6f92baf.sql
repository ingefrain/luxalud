-- =============================================
-- PATIENTS TABLE
-- =============================================
CREATE TABLE public.patients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can manage patients" 
ON public.patients 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PATIENT FILES TABLE
-- =============================================
CREATE TABLE public.patient_files (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    description TEXT,
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_files ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can manage patient files" 
ON public.patient_files 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- =============================================
-- PAYMENTS TABLE
-- =============================================
CREATE TYPE public.payment_method AS ENUM ('efectivo', 'tarjeta', 'transferencia', 'otro');

CREATE TABLE public.payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method public.payment_method NOT NULL DEFAULT 'efectivo',
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference TEXT,
    receipt_url TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can manage payments" 
ON public.payments 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('patient-files', 'patient-files', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
    ('payment-receipts', 'payment-receipts', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

-- Storage policies for patient-files
CREATE POLICY "Authenticated users can upload patient files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'patient-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view patient files"
ON storage.objects FOR SELECT
USING (bucket_id = 'patient-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete patient files"
ON storage.objects FOR DELETE
USING (bucket_id = 'patient-files' AND auth.role() = 'authenticated');

-- Storage policies for payment-receipts
CREATE POLICY "Authenticated users can upload payment receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view payment receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete payment receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-receipts' AND auth.role() = 'authenticated');

-- =============================================
-- LINK APPOINTMENTS TO PATIENTS
-- =============================================
ALTER TABLE public.appointments 
ADD COLUMN patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX idx_patient_files_patient_id ON public.patient_files(patient_id);
CREATE INDEX idx_payments_patient_id ON public.payments(patient_id);
CREATE INDEX idx_payments_appointment_id ON public.payments(appointment_id);