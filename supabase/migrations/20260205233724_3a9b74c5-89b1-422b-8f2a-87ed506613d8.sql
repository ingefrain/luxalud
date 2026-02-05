-- Drop the restrictive SELECT policy on appointments
DROP POLICY IF EXISTS "Staff can view their doctor appointments" ON public.appointments;

-- Create new permissive policy allowing all authenticated users to view all appointments
CREATE POLICY "All staff can view all appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (true);