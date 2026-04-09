import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';

export const metadata: Metadata = {
  title: 'นโยบายความเป็นส่วนตัว',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24 sm:pb-8">
        <article className="prose prose-sm max-w-none">
          <h1 className="text-2xl font-bold mb-6">
            นโยบายความเป็นส่วนตัว (PDPA)
          </h1>
          <p className="text-muted-foreground text-sm mb-4">
            ปรับปรุงล่าสุด: มีนาคม 2026
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">1. ข้อมูลที่เราเก็บรวบรวม</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>ข้อมูลจาก Google Account: ชื่อ, อีเมล @yru.ac.th, รูปโปรไฟล์</li>
            <li>ข้อมูลที่คุณระบุ: คณะ, สาขา, ชื่อที่แสดง</li>
            <li>เนื้อหาที่คุณสร้าง: กระทู้, ความคิดเห็น, ไฟล์ที่อัปโหลด</li>
            <li>ข้อมูลการใช้งาน: การโหวต, การบันทึก, การรายงาน</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6 mb-3">2. วัตถุประสงค์ในการใช้ข้อมูล</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>ยืนยันตัวตนว่าเป็นนักศึกษา/บุคลากร มรย.</li>
            <li>แสดงโปรไฟล์ในกระทู้และความคิดเห็น</li>
            <li>ปรับปรุงคุณภาพแพลตฟอร์ม</li>
            <li>ตรวจสอบและจัดการเนื้อหาที่ถูกรายงาน</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6 mb-3">3. การแบ่งปันข้อมูล</h2>
          <p>
            เราจะไม่ขาย แลกเปลี่ยน หรือเปิดเผยข้อมูลส่วนบุคคลของคุณให้กับบุคคลภายนอก
            ยกเว้นกรณีที่กฎหมายกำหนด
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">4. การโพสต์แบบไม่ระบุตัวตน</h2>
          <p>
            หากคุณเลือก &quot;โพสต์แบบไม่ระบุตัวตน&quot; ชื่อและรูปโปรไฟล์จะไม่แสดงสาธารณะ
            แต่ข้อมูลยังคงถูกเก็บไว้ในระบบเพื่อวัตถุประสงค์ด้านความปลอดภัย
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">5. สิทธิ์ของคุณ</h2>
          <p>ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) คุณมีสิทธิ์:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>เข้าถึงข้อมูลส่วนบุคคลของคุณ</li>
            <li>แก้ไขข้อมูลให้ถูกต้อง</li>
            <li>ขอลบข้อมูล/บัญชี</li>
            <li>คัดค้านการประมวลผลข้อมูล</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6 mb-3">6. การลบบัญชี</h2>
          <p>
            คุณสามารถร้องขอลบบัญชีได้ที่หน้าโปรไฟล์ของคุณ
            ทีมงานจะดำเนินการลบข้อมูลทั้งหมดภายใน 7 วันทำการ
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">7. ความปลอดภัยของข้อมูล</h2>
          <p>
            เราใช้มาตรการรักษาความปลอดภัยตามมาตรฐาน รวมถึง Row Level Security (RLS)
            และการเข้ารหัสข้อมูลเพื่อปกป้องข้อมูลส่วนบุคคลของคุณ
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">8. ติดต่อเรา</h2>
          <p>
            หากมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัว กรุณาติดต่อทีมงาน YRU Community
          </p>
        </article>
      </main>
      <MobileNav />
    </div>
  );
}
