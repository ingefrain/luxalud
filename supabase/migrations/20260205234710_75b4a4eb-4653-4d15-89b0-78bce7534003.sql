-- Add doctor_id column to patients table
ALTER TABLE public.patients 
ADD COLUMN doctor_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL;

-- Add index for better performance on queries filtering by doctor
CREATE INDEX idx_patients_doctor_id ON public.patients(doctor_id);