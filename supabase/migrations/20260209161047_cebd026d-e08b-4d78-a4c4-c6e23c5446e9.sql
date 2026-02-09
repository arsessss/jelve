
-- Create pish_sabtenam table
CREATE TABLE public.pish_sabtenam (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_number integer NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  image_url text,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pish_sabtenam ENABLE ROW LEVEL SECURITY;

-- Create validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_pish_sabtenam_unit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.unit_number < 1 OR NEW.unit_number > 3 THEN
    RAISE EXCEPTION 'unit_number must be between 1 and 3';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_pish_sabtenam_unit_trigger
BEFORE INSERT OR UPDATE ON public.pish_sabtenam
FOR EACH ROW
EXECUTE FUNCTION public.validate_pish_sabtenam_unit();

-- Seed the 3 units
INSERT INTO public.pish_sabtenam (unit_number, title, content) VALUES
  (1, 'واحد ۱', ''),
  (2, 'واحد ۲', ''),
  (3, 'واحد ۳', '');
