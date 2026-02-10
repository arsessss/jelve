
-- Add parent role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'parent';

-- Parent-student linking table
CREATE TABLE public.parent_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  student_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, student_id)
);
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

-- Taklif (homework) table
CREATE TABLE public.taklif (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  subject text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  grade text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.taklif ENABLE ROW LEVEL SECURITY;

-- Add target_grades to jozveh
ALTER TABLE public.jozveh ADD COLUMN IF NOT EXISTS target_grades text[] DEFAULT '{}'::text[];

-- Seed @Modir account (password will be auto-hashed on first login by auth-login edge function)
INSERT INTO public.custom_users (username, password_hash, full_name)
VALUES ('@Modir', 'Jelve14041404', 'مدیر')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM public.custom_users WHERE username = '@Modir'
ON CONFLICT DO NOTHING;

-- Update trigger for taklif
CREATE TRIGGER update_taklif_updated_at
BEFORE UPDATE ON public.taklif
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
