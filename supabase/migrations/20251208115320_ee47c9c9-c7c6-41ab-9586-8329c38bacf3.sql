-- Create student_grades table for subject-specific grades
CREATE TABLE public.student_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject)
);

-- Enable RLS
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow reading student_grades" 
ON public.student_grades 
FOR SELECT 
USING (true);

CREATE POLICY "Allow inserting student_grades" 
ON public.student_grades 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow updating student_grades" 
ON public.student_grades 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow deleting student_grades" 
ON public.student_grades 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_student_grades_updated_at
BEFORE UPDATE ON public.student_grades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add file_url column to jozveh for file uploads
ALTER TABLE public.jozveh ADD COLUMN file_url TEXT;

-- Create storage bucket for jozveh files
INSERT INTO storage.buckets (id, name, public) VALUES ('jozveh-files', 'jozveh-files', true);

-- Storage policies for jozveh-files bucket
CREATE POLICY "Allow public read jozveh files" ON storage.objects FOR SELECT USING (bucket_id = 'jozveh-files');
CREATE POLICY "Allow authenticated upload jozveh files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'jozveh-files');
CREATE POLICY "Allow authenticated delete jozveh files" ON storage.objects FOR DELETE USING (bucket_id = 'jozveh-files');