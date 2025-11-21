-- This migration creates the initial admin account
-- Note: You'll need to manually set the password through Supabase dashboard or use the signup form

-- The admin user will be created with email: administration@jelve.org
-- Password should be set to: Jelve1404

-- This is just a placeholder comment for the migration
-- The actual user creation needs to be done via auth.signUp() or Supabase dashboard

-- For now, we'll just ensure the user_roles table is ready
-- Once you create the user through signup, run this to make them admin:

-- Step 1: Sign up with email: administration@jelve.org and password: Jelve1404
-- Step 2: Then run this query replacing USER_ID with the actual user ID:

-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('USER_ID_HERE', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
