-- Create grade_periods table for custom titles/dates
CREATE TABLE public.grade_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  grade TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grade_periods ENABLE ROW LEVEL SECURITY;

-- Create new student_period_grades table to link grades to periods
CREATE TABLE public.student_period_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.grade_periods(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, period_id, subject)
);

-- Enable RLS
ALTER TABLE public.student_period_grades ENABLE ROW LEVEL SECURITY;

-- Add group_picture column to conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS group_picture TEXT;