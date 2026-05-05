'use client';

import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Users, MessageCircle, Heart, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const errorMessage = searchParams.get('message');
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            hd: 'yru.ac.th',
          },
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[var(--color-yru-pink)] via-[var(--color-yru-pink-dark)] to-[var(--color-yru-green)] relative overflow-hidden">
        {/* Animated background patterns */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        
        {/* Floating elements */}
        <div className="absolute inset-0 p-12 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Logo */}
            <div className="relative w-32 h-32 mb-8 rounded-3xl overflow-hidden">
              <Image
                src="/icon-512x512.png"
                alt={APP_NAME}
                fill
                sizes="128px"
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-4">
              {APP_NAME}
            </h1>
            <p className="text-white/80 text-lg max-w-md mb-12">
              {APP_DESCRIPTION}
            </p>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: GraduationCap, label: 'แชร์ชีทสรุป', desc: 'เรียนรู้ไปด้วยกัน' },
                { icon: Users, label: 'พี่เลี้ยงรุ่น', desc: 'พบเพื่อนใหม่' },
                { icon: MessageCircle, label: 'แลกเปลี่ยน', desc: 'แชร์ความรู้' },
                { icon: Heart, label: 'ชุมชน', desc: 'สนุกไปด้วยกัน' },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:bg-white/20 transition-all"
                >
                  <item.icon className="w-6 h-6 text-white mb-2" />
                  <p className="text-white font-medium">{item.label}</p>
                  <p className="text-white/60 text-sm">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Decorative wave SVG */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white" fillOpacity="0.1"/>
          </svg>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="relative w-20 h-20 mb-4">
              <Image
                src="/icon-512x512.png"
                alt={APP_NAME}
                fill
                sizes="80px"
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold">{APP_NAME}</h1>
            <p className="text-sm text-muted-foreground">{APP_DESCRIPTION}</p>
          </div>

          {/* Login Card */}
          <div className="rounded-3xl border border-border/20 bg-card/80 backdrop-blur-xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">ยินดีต้อนรับ! 👋</h2>
              <p className="text-muted-foreground">
                เข้าสู่ระบบเพื่อเริ่มต้นใช้งาน
              </p>
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4"
              >
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {errorMessage
                    ? decodeURIComponent(errorMessage)
                    : error === 'invalid_domain'
                    ? 'กรุณาใช้อีเมล @yru.ac.th เท่านั้น'
                    : 'เกิดข้อผิดพลาด กรุณาลองใหม่'}
                </p>
              </motion.div>
            )}

            {/* Google Login Button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                variant="outline"
                className="w-full h-14 text-base rounded-2xl border-2 border-border hover:border-[var(--color-yru-pink)] hover:bg-[var(--color-yru-pink)]/5 gap-3 transition-all group"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span className="flex-1 text-center">
                  {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
                </span>
                {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </Button>
            </motion.div>

            {/* Domain hint */}
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="px-3 py-1 bg-muted rounded-full font-medium">
                @yru.ac.th
              </span>
              <span>เท่านั้น</span>
            </div>

            {/* Divider */}
            <div className="my-8 flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">หรือ</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            {/* Features preview */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { emoji: '📚', label: 'แชร์ชีท' },
                { emoji: '💬', label: 'กระทู้' },
                { emoji: '🤝', label: 'เพื่อนใหม่' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/50 transition-colors"
                >
                  <span className="text-xl">{item.emoji}</span>
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex justify-center gap-6 text-sm text-muted-foreground">
            <a href="/terms" className="hover:text-foreground hover:underline transition-colors">
              ข้อตกลง
            </a>
            <a href="/privacy" className="hover:text-foreground hover:underline transition-colors">
              นโยบาย
            </a>
            <a href="/about" className="hover:text-foreground hover:underline transition-colors">
              เกี่ยวกับ
            </a>
          </div>

          {/* Copyright */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-muted border-t-[var(--color-yru-pink)] animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}