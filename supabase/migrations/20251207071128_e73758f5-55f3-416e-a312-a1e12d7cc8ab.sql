-- Create online_classes table for class links that admins can publish to specific grades
CREATE TABLE public.online_classes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grade text NOT NULL,
  title text NOT NULL,
  link text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.online_classes ENABLE ROW LEVEL SECURITY;

-- Create permissive policies
CREATE POLICY "Allow reading online_classes" ON public.online_classes FOR SELECT USING (true);
CREATE POLICY "Allow inserting online_classes" ON public.online_classes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updating online_classes" ON public.online_classes FOR UPDATE USING (true);
CREATE POLICY "Allow deleting online_classes" ON public.online_classes FOR DELETE USING (true);

-- Add profile_picture column to custom_users
ALTER TABLE public.custom_users ADD COLUMN IF NOT EXISTS profile_picture text;

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile pictures
CREATE POLICY "Anyone can view profile pictures" ON storage.objects FOR SELECT USING (bucket_id = 'profile-pictures');
CREATE POLICY "Anyone can upload profile pictures" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-pictures');
CREATE POLICY "Anyone can update profile pictures" ON storage.objects FOR UPDATE USING (bucket_id = 'profile-pictures');
CREATE POLICY "Anyone can delete profile pictures" ON storage.objects FOR DELETE USING (bucket_id = 'profile-pictures');

-- Add update trigger for online_classes
CREATE TRIGGER update_online_classes_updated_at
BEFORE UPDATE ON public.online_classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();