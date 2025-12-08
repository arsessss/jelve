-- Create jozveh table for storing grade-specific documents
CREATE TABLE public.jozveh (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jozveh ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow reading jozveh" 
ON public.jozveh 
FOR SELECT 
USING (true);

CREATE POLICY "Allow inserting jozveh" 
ON public.jozveh 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow updating jozveh" 
ON public.jozveh 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow deleting jozveh" 
ON public.jozveh 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_jozveh_updated_at
BEFORE UPDATE ON public.jozveh
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();