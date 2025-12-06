-- Create site_content table for storing editable content
CREATE TABLE public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- Create addresses table for storing school addresses
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  sort_order int DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Permissive policies (security enforced at app level via customAuth)
CREATE POLICY "Allow reading site_content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "Allow updating site_content" ON public.site_content FOR UPDATE USING (true);
CREATE POLICY "Allow inserting site_content" ON public.site_content FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow reading addresses" ON public.addresses FOR SELECT USING (true);
CREATE POLICY "Allow updating addresses" ON public.addresses FOR UPDATE USING (true);
CREATE POLICY "Allow inserting addresses" ON public.addresses FOR INSERT WITH CHECK (true);

-- Allow deleting messages
CREATE POLICY "Allow deleting messages" ON public.contact_messages FOR DELETE USING (true);

-- Insert default content
INSERT INTO public.site_content (key, value) VALUES 
  ('main_title', 'مجتمع آموزشی جلوه'),
  ('main_description', 'تربیت نسلی موفق با آموزش باکیفیت');

-- Insert default addresses
INSERT INTO public.addresses (title, address, phone, sort_order) VALUES
  ('دوره اول پسرانه', 'مهرشهر، بلوار شهرداری، خ 110، پلاک 890', '026-33423481', 1),
  ('دوره دوم پسرانه', 'مهرشهر، بلوار شهرداری، خ 206، پلاک 485', '026-33408785', 2),
  ('دوره دوم دخترانه', 'مهرشهر، بلوار شهرداری، خ 209، پلاک 165', '026-33400994', 3);