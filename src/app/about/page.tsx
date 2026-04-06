// เพิ่มการ Import Suspense จาก React
import { Suspense } from 'react'; 

import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Shield, Users, MessageSquare, Heart, Zap, Mail, Github, Globe } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'เกี่ยวกับเรา | YRU Community',
  description: 'ชุมชนออนไลน์สำหรับนักศึกษามหาวิทยาลัยราชภัฏยะลา',
};

// ... (ส่วน FEATURES และ RULES คงเดิม)
const FEATURES = [
  {
    icon: BookOpen,
    title: 'ตั้งกระทู้และแชร์ความรู้',
    description: 'สร้างกระทู้ แบ่งปันความรู้ รีวิววิชา และแลกเปลี่ยนประสบการณ์',
  },
  {
    icon: MessageSquare,
    title: 'แสดงความคิดเห็น',
    description: 'คอมเมนต์แบบ 3 ชั้น โหวตเห็นด้วย/ไม่เห็นด้วย และตอบกลับกันได้',
  },
  {
    icon: Users,
    title: 'ติดตามและเชื่อมต่อ',
    description: 'ติดตามเพื่อน ดูฟีดเฉพาะคนที่ติดตาม และส่งข้อความส่วนตัว',
  },
  {
    icon: Heart,
    title: 'รีแอคและโหวต',
    description: 'รีแอคโพสต์ด้วย 6 อีโมจิ และโหวตคอมเมนต์สไตล์ Reddit',
  },
  {
    icon: Shield,
    title: 'ไม่ระบุตัวตนได้',
    description: 'ตั้งกระทู้และคอมเมนต์แบบไม่เปิดเผยตัวตนได้',
  },
  {
    icon: Zap,
    title: 'ระบบเลเวลและ EXP',
    description: 'สะสม EXP จากการมีส่วนร่วม ปลดล็อกเลเวลและแบดจ์',
  },
];

const RULES = [
  { num: '1', title: 'ให้เกียรติซึ่งกันและกัน', desc: 'ไม่ใช้คำหยาบคาย ดูถูก หรือคุกคามผู้อื่น' },
  { num: '2', title: 'ไม่โพสต์เนื้อหาผิดกฎหมาย', desc: 'ไม่แชร์ข้อมูลเท็จ หมิ่นประมาท หรือเนื้อหาที่ผิดกฎหมาย' },
  { num: '3', title: 'ไม่สแปม', desc: 'ไม่โพสต์ซ้ำๆ โฆษณาเกินควร หรือส่งข้อความไม่พึงประสงค์' },
  { num: '4', title: 'ใช้หมวดหมู่ให้ถูกต้อง', desc: 'เลือกหมวดหมู่ที่เหมาะสมกับเนื้อหากระทู้' },
  { num: '5', title: 'รายงานเนื้อหาไม่เหมาะสม', desc: 'ช่วยกันดูแลชุมชนโดยรายงานเนื้อหาที่ละเมิดกฎ' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ครอบ Header ด้วย Suspense */}
      <Suspense fallback={<div className="h-16" />}>
        <Header />
      </Suspense>

      <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
        {/* Hero */}
        <section className="text-center py-12">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-[var(--color-yru-pink)] to-[var(--color-yru-pink-dark)] mb-6 shadow-lg">
            <Globe className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-[var(--color-yru-pink)] to-[var(--color-yru-pink-dark)]">
            YRU Community
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">
            ชุมชนออนไลน์สำหรับนักศึกษามหาวิทยาลัยราชภัฏยะลา
            <br />
            พื้นที่แบ่งปันความรู้ ประสบการณ์ และเชื่อมต่อระหว่างนักศึกษา
          </p>
        </section>

        <Separator className="my-8" />

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">ฟีเจอร์หลัก</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-yru-pink)]/10">
                      <Icon className="h-5 w-5 text-[var(--color-yru-pink)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{feature.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <Separator className="my-8" />

        {/* Rules */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">กฎชุมชน</h2>
          <div className="space-y-3">
            {RULES.map((rule) => (
              <div
                key={rule.num}
                className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-yru-pink)] text-sm font-bold text-white">
                  {rule.num}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{rule.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator className="my-8" />

        {/* CTA */}
        <section className="text-center py-8 rounded-2xl border bg-gradient-to-b from-[var(--color-yru-pink-light)]/30 to-transparent">
          <h2 className="text-xl font-bold mb-2">เข้าร่วมชุมชนเลย!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            เริ่มต้นตั้งกระทู้แรกของคุณ หรือเข้าร่วมสนทนากับเพื่อนนักศึกษา
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/post/create">
              <Button className="rounded-full gap-2 bg-gradient-to-r from-[var(--color-yru-pink)] to-[var(--color-yru-pink-dark)] text-white">
                <BookOpen className="h-4 w-4" /> ตั้งกระทู้ใหม่
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="rounded-full gap-2">
                <Globe className="h-4 w-4" /> ดูฟีดหลัก
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-muted-foreground space-y-2">
          <p>YRU Community © {new Date().getFullYear()}</p>
          <p>สร้างด้วย ❤️ สำหรับนักศึกษามหาวิทยาลัยราชภัฏยะลา</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <Link href="/terms" className="hover:text-[var(--color-yru-pink)] transition-colors">
              ข้อกำหนดการใช้งาน
            </Link>
            <span className="text-muted-foreground/30">|</span>
            <Link href="/privacy" className="hover:text-[var(--color-yru-pink)] transition-colors">
              นโยบายความเป็นส่วนตัว
            </Link>
          </div>
        </div>
      </main>

      {/* ครอบ MobileNav ด้วย Suspense */}
      <Suspense fallback={null}>
        <MobileNav />
      </Suspense>
    </div>
  );
}