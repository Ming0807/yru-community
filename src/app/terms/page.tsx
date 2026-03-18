import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';

export const metadata: Metadata = {
  title: 'ข้อตกลงการใช้งาน',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24 sm:pb-8">
        <article className="prose prose-sm max-w-none">
          <h1 className="text-2xl font-bold mb-6">ข้อตกลงการใช้งาน</h1>
          <p className="text-muted-foreground text-sm mb-4">
            ปรับปรุงล่าสุด: มีนาคม 2026
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">1. การยอมรับข้อตกลง</h2>
          <p>
            การใช้งาน YRU Community (&quot;แพลตฟอร์ม&quot;) หมายถึงคุณยอมรับข้อตกลงการใช้งานนี้ทั้งหมด
            หากคุณไม่เห็นด้วยกับข้อตกลงใดๆ กรุณาหยุดใช้งานแพลตฟอร์ม
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">2. คุณสมบัติผู้ใช้</h2>
          <p>
            แพลตฟอร์มนี้สงวนสิทธิ์สำหรับนักศึกษาและบุคลากรของมหาวิทยาลัยราชภัฏยะลา
            ที่มีอีเมล @yru.ac.th เท่านั้น
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">3. เนื้อหาที่ห้ามโพสต์</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>เนื้อหาที่ผิดกฎหมาย หมิ่นประมาท หรือคุกคามผู้อื่น</li>
            <li>สแปม โฆษณาเกินจริง หรือข้อมูลเท็จ</li>
            <li>เนื้อหาลามกอนาจาร</li>
            <li>การเปิดเผยข้อมูลส่วนบุคคลของผู้อื่นโดยไม่ได้รับอนุญาต</li>
            <li>เนื้อหาที่ละเมิดลิขสิทธิ์หรือทรัพย์สินทางปัญญา</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6 mb-3">4. การโพสต์แบบไม่ระบุตัวตน</h2>
          <p>
            แม้ว่าคุณจะสามารถโพสต์แบบไม่ระบุตัวตนได้ แต่ระบบยังคงบันทึกข้อมูลผู้โพสต์ไว้ในฐานข้อมูล
            เพื่อใช้ในการตรวจสอบกรณีที่มีการรายงานเนื้อหาที่ไม่เหมาะสม
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">5. การระงับบัญชี</h2>
          <p>
            ทีมงานสงวนสิทธิ์ในการระงับบัญชีผู้ใช้ที่ละเมิดข้อตกลงนี้
            โดยไม่ต้องแจ้งให้ทราบล่วงหน้า
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">6. การเปลี่ยนแปลงข้อตกลง</h2>
          <p>
            ทีมงานขอสงวนสิทธิ์ในการเปลี่ยนแปลงข้อตกลงนี้ได้ตลอดเวลา
            การใช้งานต่อหลังจากมีการเปลี่ยนแปลงถือว่าคุณยอมรับข้อตกลงใหม่
          </p>
        </article>
      </main>
      <MobileNav />
    </div>
  );
}
