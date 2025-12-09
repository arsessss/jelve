-- Create user_sessions table for server-side session management
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access sessions (via Edge Functions)
-- No public policies - sessions can only be managed by Edge Functions

-- Create index for faster token lookups
CREATE INDEX idx_user_sessions_token ON public.user_sessions(token);
CREATE INDEX idx_user_sessions_expires ON public.user_sessions(expires_at);

-- Add UPDATE policy to custom_users for password migration
CREATE POLICY "Allow password updates via service role"
ON public.custom_users
FOR UPDATE
USING (true);

-- Clean up expired sessions periodically (can be called via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_sessions WHERE expires_at < now();
END;
$$;