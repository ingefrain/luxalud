-- Migration 2: Create user_doctor_assignments table for N:N relationship
CREATE TABLE public.user_doctor_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, doctor_id)
);

-- Enable RLS
ALTER TABLE public.user_doctor_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins/medicos can manage assignments
CREATE POLICY "Admins can manage all assignments"
ON public.user_doctor_assignments
FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'medico'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'medico'));

-- Users can view their own assignments
CREATE POLICY "Users can view their own assignments"
ON public.user_doctor_assignments
FOR SELECT
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_doctor_assignments_user_id ON public.user_doctor_assignments(user_id);
CREATE INDEX idx_user_doctor_assignments_doctor_id ON public.user_doctor_assignments(doctor_id);

-- Create helper function to get all doctor IDs for current user
CREATE OR REPLACE FUNCTION public.get_user_doctor_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT doctor_id 
    FROM public.user_doctor_assignments 
    WHERE user_id = auth.uid()
$$;