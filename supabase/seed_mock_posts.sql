-- สคริปต์จำลองสร้าง 25 โพสต์เพื่อทดสอบ Infinite Scroll และแสดงโฆษณา
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- ดึงแค่ ID ของใครก็ได้มา 1 คนเพื่อใช้รันสร้างโพสต์ (ถ้าไม่มีเลยจะทำงานไม่ได้)
    SELECT id INTO first_user_id FROM public.profiles LIMIT 1;
    
    IF first_user_id IS NULL THEN
        RAISE EXCEPTION 'กรุณาทำการสมัครสมาชิกหรือสร้างผู้ใช้อย่างน้อย 1 คนก่อนใชัสคริปต์นี้';
    END IF;

    -- สร้างโพสต์จำลอง 25 กระทู้รวด
    FOR i IN 1..25 LOOP
        INSERT INTO public.posts (
            author_id, 
            category_id, 
            title, 
            content, 
            content_text, 
            is_anonymous, 
            tags, 
            vote_count, 
            comment_count, 
            view_count, 
            attachments
        )
        VALUES (
            first_user_id,
            (SELECT id FROM public.categories ORDER BY random() LIMIT 1), -- สุ่มหมวดหมู่
            'กระทู้รีวิว YRU ชิตแชตที่ ' || i || ' เพื่อเช็คโฆษณาหน้าหลัก',
            '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"นี่คือเนื้อหาจำลองสำหรับทดสอบระบบ Ad Injection ของหน้าแรก (Feed) YRU Community ลองเลื่อนอ่านดูว่าเจอโฆษณามาคั่นหรือยังน้า"}]}]}'::jsonb,
            'นี่คือเนื้อหาจำลองสำหรับทดสอบระบบ Ad Injection ของหน้าแรก (Feed) YRU Community ลองเลื่อนอ่านดูว่าเจอโฆษณามาคั่นหรือยังน้า',
            false,
            ARRAY['Mock Data', 'ระบบใหม่', 'ทดสอบ']::text[],
            floor(random() * 50)::int,  -- สุ่มคะแนนโหวต
            floor(random() * 20)::int,  -- สุ่มคอมเมนต์
            floor(random() * 100)::int, -- สุ่มยอดวิว
            '[]'::jsonb
        );
    END LOOP;
END $$;
