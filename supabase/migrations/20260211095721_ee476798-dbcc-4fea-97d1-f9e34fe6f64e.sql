
-- Fix 1: Enable RLS on custom_users to prevent public access to password hashes
ALTER TABLE public.custom_users ENABLE ROW LEVEL SECURITY;

-- Fix 2: Enable RLS on parent_students to prevent public access to relationships
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

-- Fix 3: contact_messages already has RLS enabled, but the SELECT policy is missing
-- which is correct (no public reads). However, verify RLS is on:
-- (Already enabled based on existing INSERT policy)
