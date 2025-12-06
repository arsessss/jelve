-- Drop existing restrictive policies that rely on auth.uid()
DROP POLICY IF EXISTS "Admins can insert students" ON public.students;
DROP POLICY IF EXISTS "Admins can delete students" ON public.students;
DROP POLICY IF EXISTS "Admins can update students" ON public.students;
DROP POLICY IF EXISTS "Admins can view all students" ON public.students;
DROP POLICY IF EXISTS "Students can view their own data" ON public.students;

-- Create new permissive policies (security enforced at application level via customAuth)
CREATE POLICY "Allow reading students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow inserting students" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updating students" ON public.students FOR UPDATE USING (true);
CREATE POLICY "Allow deleting students" ON public.students FOR DELETE USING (true);