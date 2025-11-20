-- Create contact messages table
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all messages
CREATE POLICY "Authenticated users can view all messages" 
ON public.contact_messages 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create policy for anyone to insert messages
CREATE POLICY "Anyone can insert messages" 
ON public.contact_messages 
FOR INSERT 
WITH CHECK (true);

-- Create admin user credentials (username: SIM, password: SIM)
-- This will be handled through Supabase Auth with email: SIM@jelve.org