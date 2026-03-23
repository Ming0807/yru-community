-- Create ads table
CREATE TABLE public.ads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    target_url TEXT NOT NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    position TEXT CHECK (position IN ('feed', 'sidebar')) NOT NULL,
    revenue NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active ads
CREATE POLICY "Allow public read access to active ads"
ON public.ads FOR SELECT
USING (is_active = true);

-- Allow admins full access
CREATE POLICY "Allow admins full access to ads"
ON public.ads FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Create storage bucket for ad banners
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ads', 'ads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ads bucket
-- Public read access
CREATE POLICY "Public can view ad images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ads');

-- Admins can upload ad images
CREATE POLICY "Admins can upload ad images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'ads' AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Admins can update/delete ad images
CREATE POLICY "Admins can update and delete ad images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'ads' AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
CREATE POLICY "Admins can update and delete ad images (delete)"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'ads' AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
