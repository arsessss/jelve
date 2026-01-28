-- Create akhbar (news/announcements) table
CREATE TABLE public.akhbar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  target_grades text[] DEFAULT '{}',
  is_published boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.akhbar ENABLE ROW LEVEL SECURITY;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_akhbar_updated_at
BEFORE UPDATE ON public.akhbar
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();