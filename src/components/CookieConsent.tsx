'use client';

import { useEffect, useState } from 'react';
import { X, Settings, Shield, BarChart3, Megaphone, ExternalLink, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useCookieConsent, type ConsentPreferences } from '@/hooks/useCookieConsent';

const COOKIE_CATEGORIES = [
  {
    id: 'necessary' as const,
    label: 'คุกกี้ที่จำเป็น',
    description: 'จำเป็นสำหรับการทำงานของเว็บไซต์ เช่น ระบบล็อกอิน ความปลอดภัย',
    icon: Shield,
    required: true,
  },
  {
    id: 'analytics' as const,
    label: 'คุกกี้สถิติ',
    description: 'เก็บข้อมูลพฤติกรรมการใช้งานเพื่อพัฒนาเว็บไซต์ให้ดีขึ้น',
    icon: BarChart3,
    required: false,
  },
  {
    id: 'marketing' as const,
    label: 'คุกกี้การตลาด',
    description: 'ใช้เพื่อแสดงโฆษณาที่ตรงกับความสนใจของคุณ เช่น การยิงโฆษณาตามคณะที่คุณศึกษา (Faculty Targeting)',
    icon: Megaphone,
    required: false,
  },
];

export function CookieConsent() {
  const {
    preferences,
    isBannerVisible,
    isModalOpen,
    acceptAll,
    rejectAll,
    savePreferences,
    openSettings,
    closeSettings,
  } = useCookieConsent();

  const [localPrefs, setLocalPrefs] = useState<ConsentPreferences>(preferences);

  useEffect(() => {
    setLocalPrefs(preferences);
  }, [preferences]);

  if (!isBannerVisible && !isModalOpen) return null;

  const handleSave = () => {
    savePreferences(localPrefs);
  };

  const handleCategoryToggle = (category: keyof ConsentPreferences, checked: boolean) => {
    setLocalPrefs((prev) => ({ ...prev, [category]: checked }));
  };

  return (
    <>
      {/* Floating Banner */}
      {isBannerVisible && (
        <div className="fixed inset-x-4 bottom-4 z-[100] animate-slide-up">
          <div className="cookie-consent-banner max-w-5xl mx-auto rounded-2xl overflow-hidden">
            <div className="cookie-consent-content">
              <div className="cookie-consent-header">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[var(--color-yru-green-dark)]" />
                  <h2 className="text-lg font-bold text-foreground">เราใช้คุกกี้เพื่อปรับปรุงประสบการณ์ของคุณ</h2>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                เราจะเก็บข้อมูลการใช้งานเพื่อแสดงเนื้อหาที่เหมาะสม รวมถึงโฆษณาที่ตรงกับความสนใจของคุณ เช่น การแสดงโฆษณาตามคฆะที่คุณกำลังศึกษาอยู่
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <a
                  href="/privacy-policy"
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 flex items-center gap-1"
                >
                  นโยบายความเป็นส่วนตัว
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="cookie-consent-actions">
              <Button
                variant="outline"
                size="lg"
                onClick={rejectAll}
                className="flex-1 rounded-xl border-2 border-border/60 hover:bg-muted/50 font-medium h-12"
              >
                ปฏิเสธทั้งหมด
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={openSettings}
                className="flex-1 rounded-xl bg-muted/40 hover:bg-muted/60 font-medium h-12"
              >
                <Settings className="h-4 w-4 mr-2" />
                ตั้งค่า
              </Button>
              <Button
                size="lg"
                onClick={acceptAll}
                className="flex-1 rounded-xl bg-[var(--color-yru-pink)] hover:bg-[var(--color-yru-pink-dark)] text-white font-medium h-12 shadow-lg shadow-[var(--color-yru-pink)]/20"
              >
                ยอมรับทั้งหมด
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeSettings} />
          <div className="cookie-modal relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl animate-scale-in">
            <div className="cookie-modal-content">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--color-yru-pink)]/10 rounded-xl">
                    <Settings className="h-5 w-5 text-[var(--color-yru-pink)]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">ตั้งค่าคุกกี้</h2>
                    <p className="text-sm text-muted-foreground">เลือกประเภทคุกกี้ที่คุณต้องการอนุญาต</p>
                  </div>
                </div>
                <button
                  onClick={closeSettings}
                  className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
                  aria-label="ปิด"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4">
                {COOKIE_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const isDisabled = category.required;
                  const isChecked = isDisabled ? true : localPrefs[category.id];

                  return (
                    <div
                      key={category.id}
                      className={`cookie-category-item rounded-xl p-4 ${
                        isDisabled ? 'bg-muted/30 opacity-75' : 'bg-card'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-xl shrink-0 ${
                          category.id === 'necessary' ? 'bg-[var(--color-yru-green)]/10' :
                          category.id === 'analytics' ? 'bg-blue-500/10' :
                          'bg-[var(--color-yru-pink)]/10'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            category.id === 'necessary' ? 'text-[var(--color-yru-green-dark)]' :
                            category.id === 'analytics' ? 'text-blue-600' :
                            'text-[var(--color-yru-pink)]'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">{category.label}</h3>
                              {isDisabled && (
                                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-yru-green-dark)] bg-[var(--color-yru-green)]/10 px-2 py-0.5 rounded-full">
                                  จำเป็น
                                </span>
                              )}
                            </div>
                            <Switch
                              checked={isChecked}
                              onCheckedChange={(checked) => handleCategoryToggle(category.id, checked)}
                              disabled={isDisabled}
                              aria-label={category.label}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                            {category.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Marketing Focus Note */}
              <div className="mt-4 p-4 bg-[var(--color-yru-pink)]/5 border border-[var(--color-yru-pink)]/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Megaphone className="h-4 w-4 text-[var(--color-yru-pink)] mt-0.5" />
                  <p className="text-sm text-foreground leading-relaxed">
                    <strong>Marketing Cookies</strong> ช่วยให้เราแสดงโฆษณาที่ตรงกับคณะที่คุณกำลังศึกษา
                    ทำให้คุณเห็นข้อเสนอที่เกี่ยวข้องกับคุณมากขึ้น เช่น ติวเตอร์ หอพัก ร้านอาหารในยะลา ฯลฯ
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-border/60">
                <Button
                  variant="outline"
                  onClick={closeSettings}
                  className="flex-1 rounded-xl h-11"
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 rounded-xl bg-[var(--color-yru-pink)] hover:bg-[var(--color-yru-pink-dark)] text-white h-11"
                >
                  <Check className="h-4 w-4 mr-2" />
                  บันทึกการตั้งค่า
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-4">
                คุณสามารถเปลี่ยนแปลงการตั้งค่าได้ตลอดเวลา หรือ{' '}
                <a href="/privacy-policy" className="underline underline-offset-2 hover:text-foreground">
                  ดูนโยบายความเป็นส่วนตัวฉบับเต็ม
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}