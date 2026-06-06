
CREATE TABLE public.class_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('hazer','ghayeb')),
  marked_by uuid NOT NULL,
  marked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (class_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_attendance TO authenticated;
GRANT ALL ON public.class_attendance TO service_role;

ALTER TABLE public.class_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block direct access to class_attendance"
  ON public.class_attendance
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
