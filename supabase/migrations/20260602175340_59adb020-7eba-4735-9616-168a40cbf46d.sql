-- Extend online_classes for in-site live classes
ALTER TABLE public.online_classes
  ALTER COLUMN link DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS description text;

-- Validate mode via trigger (avoid CHECK to keep flexible)
CREATE OR REPLACE FUNCTION public.validate_online_class_mode()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.mode NOT IN ('internal', 'external') THEN
    RAISE EXCEPTION 'mode must be internal or external';
  END IF;
  IF NEW.mode = 'external' AND (NEW.link IS NULL OR length(trim(NEW.link)) = 0) THEN
    RAISE EXCEPTION 'external classes require a link';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_online_class_mode_trigger ON public.online_classes;
CREATE TRIGGER validate_online_class_mode_trigger
  BEFORE INSERT OR UPDATE ON public.online_classes
  FOR EACH ROW EXECUTE FUNCTION public.validate_online_class_mode();

-- Participants table for attendance log
CREATE TABLE IF NOT EXISTS public.online_class_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  is_teacher boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ocp_class ON public.online_class_participants(class_id);
CREATE INDEX IF NOT EXISTS idx_ocp_user_open ON public.online_class_participants(user_id) WHERE left_at IS NULL;

-- All access via edge functions (service role); block direct client access
GRANT ALL ON public.online_class_participants TO service_role;

ALTER TABLE public.online_class_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block direct access to online_class_participants"
ON public.online_class_participants
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);