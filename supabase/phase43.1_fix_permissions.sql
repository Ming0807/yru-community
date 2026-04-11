-- สคริปต์นี้ใช้สำหรับปลดล็อกตารางที่สร้างขึ้นใหม่หรือตารางที่ยังมีปัญหาเรื่อง Permission
-- ทำให้ Service Role, Authenticated และ Anon สามารถใช้งาน Select, Insert, Update, Delete ตามลำดับ
-- และปลดล็อกสิทธิ์ให้กับ Sequence (สำหรับการสร้าง id อัตโนมัติด้วย SERIAL หรือ BIGSERIAL)

-- 1. ตารางการตั้งค่าระบบ (Site Settings)
GRANT ALL ON TABLE public.site_settings TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 2. ตารางตัวกรองคำหยาบ (Word Filters)
GRANT ALL ON TABLE public.word_filters TO anon, authenticated, service_role;

-- 3. ตารางระบบเหรียญตรา (Badges และ User Badges)
GRANT ALL ON TABLE public.badges TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_badges TO anon, authenticated, service_role;

-- 4. ตารางประวัติการทำงานของแอดมิน (Audit Logs)
GRANT ALL ON TABLE public.audit_logs TO anon, authenticated, service_role;

-- 5. ตารางโปรไฟล์ผู้ใช้งาน (Profiles)
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;

-- 6. ตารางประกาศระบบ (Announcements)
GRANT ALL ON TABLE public.announcements TO anon, authenticated, service_role;

-- คำแนะนำเพิ่มเติม:
-- หากในอนาคตมีการสร้างตารางใหม่ (เช่น ตารางรายงาน report_logs หรือตารางโฆษณา ads)
-- อย่าลืมเพิ่มคำสั่ง GRANT ALL ON TABLE public.ชื่อตาราง TO anon, authenticated, service_role; เข้าไปด้วยทุกครั้ง
