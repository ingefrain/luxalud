-- Fix storage policies for patient-files bucket
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload patient files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view patient files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete patient files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update patient files" ON storage.objects;

-- Create new policies that verify patient-staff assignment
-- SELECT: Staff can only view files for patients assigned to their doctors (or medicos can see all)
CREATE POLICY "Staff can view assigned patient files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'patient-files' AND
  (
    public.has_role(auth.uid(), 'medico'::public.app_role) OR
    EXISTS (
      SELECT 1 FROM public.patient_files pf
      JOIN public.appointments a ON a.patient_id = pf.patient_id
      WHERE pf.file_url = storage.objects.name
      AND a.doctor_id IN (SELECT public.get_user_doctor_ids())
    )
  )
);

-- INSERT: Staff can only upload files for patients assigned to their doctors
CREATE POLICY "Staff can upload assigned patient files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patient-files' AND
  (
    public.has_role(auth.uid(), 'medico'::public.app_role) OR
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.patient_id = (storage.foldername(name))[1]::uuid
      AND a.doctor_id IN (SELECT public.get_user_doctor_ids())
    )
  )
);

-- UPDATE: Staff can only update files for patients assigned to their doctors
CREATE POLICY "Staff can update assigned patient files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'patient-files' AND
  (
    public.has_role(auth.uid(), 'medico'::public.app_role) OR
    EXISTS (
      SELECT 1 FROM public.patient_files pf
      JOIN public.appointments a ON a.patient_id = pf.patient_id
      WHERE pf.file_url = storage.objects.name
      AND a.doctor_id IN (SELECT public.get_user_doctor_ids())
    )
  )
)
WITH CHECK (
  bucket_id = 'patient-files' AND
  (
    public.has_role(auth.uid(), 'medico'::public.app_role) OR
    EXISTS (
      SELECT 1 FROM public.patient_files pf
      JOIN public.appointments a ON a.patient_id = pf.patient_id
      WHERE pf.file_url = storage.objects.name
      AND a.doctor_id IN (SELECT public.get_user_doctor_ids())
    )
  )
);

-- DELETE: Only medicos can delete patient files
CREATE POLICY "Medicos can delete patient files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'patient-files' AND
  public.has_role(auth.uid(), 'medico'::public.app_role)
);

-- Fix storage policies for payment-receipts bucket
DROP POLICY IF EXISTS "Authenticated users can upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update payment receipts" ON storage.objects;

-- SELECT: Staff can only view receipts for their doctors' payments
CREATE POLICY "Staff can view assigned payment receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts' AND
  (
    public.has_role(auth.uid(), 'medico'::public.app_role) OR
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.receipt_path = storage.objects.name
      AND (p.doctor_id IN (SELECT public.get_user_doctor_ids()) OR p.doctor_id = public.get_user_doctor_id())
    )
  )
);

-- INSERT: Staff can only upload receipts for their doctors' payments
CREATE POLICY "Staff can upload assigned payment receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts' AND
  (
    public.has_role(auth.uid(), 'medico'::public.app_role) OR
    -- Allow upload during payment creation (path follows pattern doctor_id/timestamp.ext)
    (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_doctor_ids())
    OR (storage.foldername(name))[1]::uuid = public.get_user_doctor_id()
  )
);

-- UPDATE: Staff can only update receipts for their doctors' payments
CREATE POLICY "Staff can update assigned payment receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-receipts' AND
  (
    public.has_role(auth.uid(), 'medico'::public.app_role) OR
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.receipt_path = storage.objects.name
      AND (p.doctor_id IN (SELECT public.get_user_doctor_ids()) OR p.doctor_id = public.get_user_doctor_id())
    )
  )
)
WITH CHECK (
  bucket_id = 'payment-receipts' AND
  (
    public.has_role(auth.uid(), 'medico'::public.app_role) OR
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.receipt_path = storage.objects.name
      AND (p.doctor_id IN (SELECT public.get_user_doctor_ids()) OR p.doctor_id = public.get_user_doctor_id())
    )
  )
);

-- DELETE: Only medicos can delete payment receipts
CREATE POLICY "Medicos can delete payment receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-receipts' AND
  public.has_role(auth.uid(), 'medico'::public.app_role)
);