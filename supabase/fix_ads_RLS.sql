-- ให้สิทธิ์การใช้งาน Table ads แก่ Role ต่างๆ
GRANT SELECT ON TABLE public.ads TO anon;
GRANT ALL ON TABLE public.ads TO authenticated;
GRANT ALL ON TABLE public.ads TO service_role;

-- แก้ไข Policy เพื่อให้มีเงื่อนไข WITH CHECK สำหรับการ UPDATE/INSERT ด้วย
DROP POLICY IF EXISTS "Allow admins full access to ads" ON public.ads;

CREATE POLICY "Allow admins full access to ads"
ON public.ads 
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
