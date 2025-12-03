-- Create custom users table for username/password auth (no email)
CREATE TABLE public.custom_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.custom_users ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can attempt to read for login verification (we'll handle auth in code)
CREATE POLICY "Allow login checks" ON public.custom_users
FOR SELECT USING (true);

-- Policy: Admins can insert new users
CREATE POLICY "Admins can insert users" ON public.custom_users
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.custom_users cu
    JOIN public.user_roles ur ON cu.id = ur.user_id
    WHERE ur.role = 'admin'
  )
);

-- Update students table to reference custom_users instead
ALTER TABLE public.students 
DROP CONSTRAINT IF EXISTS students_user_id_fkey;

-- Update user_roles to work with custom_users
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Insert admin user (password: Jelve1404 - we'll hash in app)
INSERT INTO public.custom_users (id, username, password_hash, full_name)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Administration',
  'Jelve1404',
  'مدیر سیستم'
);

-- Add admin role for the admin user
INSERT INTO public.user_roles (user_id, role)
VALUES ('a0000000-0000-0000-0000-000000000001', 'admin');