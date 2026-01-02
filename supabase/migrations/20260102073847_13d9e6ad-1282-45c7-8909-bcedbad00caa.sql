-- Create group_admins table for chat group admin management
CREATE TABLE public.group_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on group_admins table
ALTER TABLE public.group_admins ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_group_admins_conversation_id ON public.group_admins(conversation_id);
CREATE INDEX idx_group_admins_user_id ON public.group_admins(user_id);