import { Metadata } from 'next';
import { Shield, Cookie, Eye, BarChart3, Megaphone, Lock, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'นโยบายความเป็นส่วนตัว',
  description: 'นโยบายความเป็นส่วนตัวของ YRU Community - เรียนรู้ว่าเราเก็บข้อมูลอย่างไรและเพราะอะไร',
};

const sections = [
  {
    id: 'information-collection',
    title: 'การเก็บข้อมูล',
    icon: Eye,
    content: `เราเก็บข้อมูลที่คุณให้โดยตรง เช่น:
• ข้อมูลโปรไฟล์ (ชื่อ, อีเมล, คณะที่ศึกษา)
• เนื้อหาที่คุณโพสต์ (กระทู้, ความคิดเห็น)
• การโต้ตอบกับผู้ใช้อื่น (การติดตาม, การให้คะแนน)

เราเก็บข้อมูลการใช้งานแบบไม่ระบุตัวตน (Anonymous) ผ่านคุกกี้สถิติเพื่อปรับปรุงเว็บไซต์ เช่น หน้าที่เข้าชมบ่อย ความถี่ในการใช้งาน และข้อผิดพลาดที่เกิดขึ้น`,
  },
  {
    id: 'cookies',
    title: 'การใช้คุกกี้',
    icon: Cookie,
    content: `เราใช้คุกกี้ 3 ประเภท:

**คุกกี้ที่จำเป็น** - สำหรับการทำงานพื้นฐาน เช่น การล็อกอินและความปลอดภัย (เปิดไว้ตลอด)

**คุกกี้สถิติ** - ช่วยให้เราเข้าใจว่าผู้ใช้ใช้งานเว็บไซต์อย่างไร เพื่อปรับปรุงประสบการณ์

**คุกกี้การตลาด** - ใช้เพื่อแสดงโฆษณาที่ตรงกับความสนใจของคุณ เช่น การยิงโฆษณาตามคณะที่คุณศึกษา (Faculty Targeting)`,
  },
  {
    id: 'data-usage',
    title: 'การใช้ข้อมูล',
    icon: BarChart3,
    content: `เราใช้ข้อมูลของคุณเพื่อ:
• จัดหาและปรับปรุงบริการ
• ปรับแต่งเนื้อหาตามความสนใจของคุณ
• แสดงโฆษณาที่เกี่ยวข้องกับคณะของคุณ
• ป้องกันการฉ้อโกงและละเมิด
• ติดต่อคุณเมื่อจำเป็น`,
  },
  {
    id: 'advertising',
    title: 'การโฆษณาและ Faculty Targeting',
    icon: Megaphone,
    content: `YRU Community อาจแสดงโฆษณาที่ตรงกับความสนใจของคุณ โดยเฉพาะการยิงโฆษณาตามคณะที่คุณกำลังศึกษา (Faculty Targeting)

ระบบโฆษณาของเรา:
• อาจใช้ข้อมูลคณะที่คุณศึกษาเพื่อแสดงโฆษณาที่เกี่ยวข้อง
• ติดตามการเข้าชมโฆษณาเพื่อวัดผลและปรับปรุง
• ไม่แชร์ข้อมูลส่วนตัวกับผู้ลงโฆษณาโดยตรง
• คุณสามารถปฏิเสธคุกกี้การตลาดได้ตลอดเวลา`,
  },
  {
    id: 'data-protection',
    title: 'การปกป้องข้อมูล',
    icon: Lock,
    content: `เราปกป้องข้อมูลของคุณโดย:
• เข้ารหัสข้อมูลระหว่างส่งและรับ (HTTPS)
• จำกัดการเข้าถึงข้อมูลเฉพาะผู้ที่ต้องการ
• เก็บข้อมูลการใช้งานไม่เกิน 90 วัน
• ไม่เก็บข้อมูลส่วนบุคคลที่ไม่จำเป็น`,
  },
  {
    id: 'your-rights',
    title: 'สิทธิของคุณ',
    icon: Shield,
    content: `คุณมีสิทธิ:
• เข้าถึงข้อมูลส่วนตัวของคุณ
• แก้ไขข้อมูลที่ไม่ถูกต้อง
• ลบข้อมูลของคุณ (ตามเงื่อนไข)
• เปลี่ยนแปลงการตั้งค่าคุกกี้ได้ตลอดเวลา
• ติดต่อเราเมื่อมีคำถามเกี่ยวกับข้อมูลของคุณ`,
  },
  {
    id: 'data-retention',
    title: 'การเก็บรักษาข้อมูล',
    icon: Trash2,
    content: `เราเก็บรักษาข้อมูลของคุณตามระยะเวลาต่อไปนี้:
• ข้อมูลบัญชี: ตลอดการใช้งานบริการ + 90 วันหลังลบบัญชี
• ข้อมูลการใช้งาน (Anonymous): 90 วัน
• ข้อมูลคุกกี้: 1 ปี หรือจนกว่าคุณจะลบ

หมายเหตุ: ข้อมูลบางส่วนอาจถูกเก็บไว้นานกว่านี้เพื่อวัตถุประสงค์ทางกฎหมาย`,
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[var(--color-yru-pink)]/10 via-background to-[var(--color-yru-green)]/10 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(232,139,156,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(126,200,164,0.1),transparent_50%)]" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-yru-pink)]/10 text-[var(--color-yru-pink)] text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            นโยบายความเป็นส่วนตัว
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            ความเป็นส่วนตัวของคุณ <br className="hidden md:block" />
            <span className="text-[var(--color-yru-pink)]">คือสิ่งสำคัญของเรา</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            เรียนรู้ว่าเราเก็บข้อมูลอะไร ใช้อย่างไร และเราปกป้องข้อมูลของคุณอย่างไร
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            อัปเดตล่าสุด: เมษายน 2569
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="space-y-8">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.id} className="card-shadow border-border/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-[var(--color-yru-pink)]/10 rounded-xl">
                      <Icon className="h-5 w-5 text-[var(--color-yru-pink)]" />
                    </div>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground leading-relaxed">
                    {section.content}
                  </pre>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Contact */}
        <Card className="mt-8 card-shadow border-border/40 bg-gradient-to-br from-[var(--color-yru-pink)]/5 to-[var(--color-yru-green)]/5">
          <CardContent className="py-8 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">มีคำถามเกี่ยวกับความเป็นส่วนตัว?</h3>
            <p className="text-muted-foreground text-sm mb-4">
              ติดต่อทีมงานของเราได้ตลอดเวลาที่ privacy@yrucommunity.ac.th
            </p>
            <a
              href="mailto:privacy@yrucommunity.ac.th"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-yru-pink)] text-white font-medium hover:bg-[var(--color-yru-pink-dark)] transition-colors"
            >
              <Shield className="h-4 w-4" />
              ติดต่อเรา
            </a>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}