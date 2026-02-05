-- Drop the restrictive SELECT policy on patients
DROP POLICY IF EXISTS "Staff can view patients with appointments" ON public.patients;

-- Create new permissive policy allowing all authenticated users to view all patients
CREATE POLICY "All staff can view all patients"
ON public.patients FOR SELECT
TO authenticated
USING (true);