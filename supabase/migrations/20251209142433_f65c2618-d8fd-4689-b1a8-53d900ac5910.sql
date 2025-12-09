-- Drop existing overly permissive policies on sensitive tables
DROP POLICY IF EXISTS "Allow login checks" ON public.custom_users;
DROP POLICY IF EXISTS "Allow password updates via service role" ON public.custom_users;
DROP POLICY IF EXISTS "Allow user creation" ON public.custom_users;

DROP POLICY IF EXISTS "Allow reading roles for login" ON public.user_roles;
DROP POLICY IF EXISTS "Allow inserting roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow deleting roles" ON public.user_roles;

DROP POLICY IF EXISTS "Allow reading students" ON public.students;
DROP POLICY IF EXISTS "Allow inserting students" ON public.students;
DROP POLICY IF EXISTS "Allow updating students" ON public.students;
DROP POLICY IF EXISTS "Allow deleting students" ON public.students;

DROP POLICY IF EXISTS "Allow reading student_grades" ON public.student_grades;
DROP POLICY IF EXISTS "Allow inserting student_grades" ON public.student_grades;
DROP POLICY IF EXISTS "Allow updating student_grades" ON public.student_grades;
DROP POLICY IF EXISTS "Allow deleting student_grades" ON public.student_grades;

DROP POLICY IF EXISTS "Allow reading online_classes" ON public.online_classes;
DROP POLICY IF EXISTS "Allow inserting online_classes" ON public.online_classes;
DROP POLICY IF EXISTS "Allow updating online_classes" ON public.online_classes;
DROP POLICY IF EXISTS "Allow deleting online_classes" ON public.online_classes;

DROP POLICY IF EXISTS "Allow reading jozveh" ON public.jozveh;
DROP POLICY IF EXISTS "Allow inserting jozveh" ON public.jozveh;
DROP POLICY IF EXISTS "Allow updating jozveh" ON public.jozveh;
DROP POLICY IF EXISTS "Allow deleting jozveh" ON public.jozveh;

DROP POLICY IF EXISTS "Authenticated users can view all messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Anyone can insert messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Allow deleting messages" ON public.contact_messages;

-- Create restrictive policies for custom_users (NO public access - only service role via Edge Functions)
-- No policies = no public access, only service role can access

-- Create restrictive policies for user_roles (NO public access - only service role via Edge Functions)
-- No policies = no public access, only service role can access

-- Create restrictive policies for user_sessions (keep as is - no policies)
-- Already has no policies

-- Create restrictive policies for students (NO public access - only via secure API)
-- No policies = only service role can access

-- Create restrictive policies for student_grades (NO public access - only via secure API)
-- No policies = only service role can access

-- Create restrictive policies for online_classes (NO public access - only via secure API)
-- No policies = only service role can access

-- Create restrictive policies for jozveh (NO public access - only via secure API)
-- No policies = only service role can access

-- Contact messages: Allow public insert only (for contact form)
CREATE POLICY "Anyone can submit contact form" ON public.contact_messages
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Site content: Public read only (for displaying content)
DROP POLICY IF EXISTS "Allow reading site_content" ON public.site_content;
DROP POLICY IF EXISTS "Allow updating site_content" ON public.site_content;
DROP POLICY IF EXISTS "Allow inserting site_content" ON public.site_content;

CREATE POLICY "Public can read site content" ON public.site_content
FOR SELECT TO anon, authenticated
USING (true);

-- Addresses: Public read only (for displaying addresses)
DROP POLICY IF EXISTS "Allow reading addresses" ON public.addresses;
DROP POLICY IF EXISTS "Allow updating addresses" ON public.addresses;
DROP POLICY IF EXISTS "Allow inserting addresses" ON public.addresses;

CREATE POLICY "Public can read addresses" ON public.addresses
FOR SELECT TO anon, authenticated
USING (true);