-- Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('profile-pictures', 'jozveh-files', 'chat-files');

-- Drop existing permissive policies for these buckets
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload chat files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read jozveh files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload jozveh files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete jozveh files" ON storage.objects;

-- No SELECT policies => reads only work via signed URLs minted by service role (edge functions)

-- INSERT (uploads) — keep working from client (anon) since custom auth is used
CREATE POLICY "Uploads to profile-pictures"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'profile-pictures');

CREATE POLICY "Updates to profile-pictures"
ON storage.objects FOR UPDATE TO public
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Uploads to chat-files"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'chat-files');

CREATE POLICY "Uploads to jozveh-files"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'jozveh-files');

-- Explicit deny-all policies on sensitive tables (defense in depth; access goes through edge functions with service role)
-- Skipping tables already covered. Adding restrictive policies for tables flagged by scanner.

-- contact_messages: keep public INSERT, deny SELECT to anon/authenticated
CREATE POLICY "Block direct reads on contact_messages"
ON public.contact_messages FOR SELECT TO anon, authenticated
USING (false);

-- custom_users
CREATE POLICY "Block direct access to custom_users"
ON public.custom_users FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

-- user_sessions
CREATE POLICY "Block direct access to user_sessions"
ON public.user_sessions FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

-- user_roles
CREATE POLICY "Block direct access to user_roles"
ON public.user_roles FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

-- students / parent_students / student_grades / student_period_grades
CREATE POLICY "Block direct access to students"
ON public.students FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block direct access to parent_students"
ON public.parent_students FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block direct access to student_grades"
ON public.student_grades FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block direct access to student_period_grades"
ON public.student_period_grades FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

-- conversations / participants / group_admins / messages
CREATE POLICY "Block direct access to conversations"
ON public.conversations FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block direct access to conversation_participants"
ON public.conversation_participants FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block direct access to group_admins"
ON public.group_admins FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block direct access to messages"
ON public.messages FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

-- taklif, akhbar, jozveh, online_classes, pish_sabtenam, grade_periods
CREATE POLICY "Block direct access to taklif"
ON public.taklif FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block direct access to akhbar"
ON public.akhbar FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block direct access to jozveh"
ON public.jozveh FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block direct access to online_classes"
ON public.online_classes FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block direct access to pish_sabtenam"
ON public.pish_sabtenam FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block direct access to grade_periods"
ON public.grade_periods FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);