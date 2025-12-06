-- Drop existing restrictive policies on user_roles that use auth.uid()
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Create new policies that allow public access for custom auth system
CREATE POLICY "Allow reading roles for login" 
ON public.user_roles 
FOR SELECT 
USING (true);

CREATE POLICY "Allow inserting roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow deleting roles" 
ON public.user_roles 
FOR DELETE 
USING (true);