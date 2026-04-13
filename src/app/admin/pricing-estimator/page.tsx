'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calculator, Loader2, Check, Info, AlertTriangle } from 'lucide-react';

interface Package {
  id: string;
  name: string;
  tier: string;
  base_price: number;
  color: string;
  targeting_included: string[];
}

interface EstimationResult {
  package: {
    id: string;
    name: string;
    tier: string;
    base_price_per_day: number;
  };
  duration: {
    days: number;
    fee: number;
  };
  targeting: {
    faculties: { count: number; fee: number; list: string[] };
    interests: { count: number; fee: number; list: string[] };
  };
  addons: {
    premium_placement: { included: boolean; fee: number };
    hero_banner: { included: boolean; fee: number };
  };
  pricing: {
    subtotal: number;
    discount_percent: number;
    discount_amount: number;
    total_estimate: number;
    currency: string;
    formatted: string;
  };
  valid_until: string;
  available_faculties: string[];
}

export default function AdminPricingEstimatorPage() {
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [durationDays, setDurationDays] = useState(30);
  const [selectedFaculties, setSelectedFaculties] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [includePremium, setIncludePremium] = useState(false);
  const [includeHeroBanner, setIncludeHeroBanner] = useState(false);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [isCustomPriceEnabled, setIsCustomPriceEnabled] = useState(false);
  const [customFinalPrice, setCustomFinalPrice] = useState<number | null>(null);

  const { data: packages = [], isLoading: packagesLoading } = useQuery<Package[]>({
    queryKey: ['admin', 'packages'],
    queryFn: async () => {
      const res = await fetch('/api/admin/packages?active=true');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: estimation, isLoading: estimationLoading, refetch } = useQuery<{ estimation: EstimationResult }>({
    queryKey: ['admin', 'pricing-estimate', selectedPackageId, durationDays, selectedFaculties, selectedInterests, includePremium, includeHeroBanner, manualDiscount],
    queryFn: async () => {
      const res = await fetch('/api/admin/pricing-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_id: selectedPackageId,
          duration_days: durationDays,
          target_faculties: selectedFaculties,
          target_interests: selectedInterests,
          include_premium_placement: includePremium,
          include_hero_banner: includeHeroBanner,
          custom_discount_percent: manualDiscount,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!selectedPackageId,
  });

  const selectedPackage = packages.find((p) => p.id === selectedPackageId);

  const allInterests = useMemo(() => {
    const interests = new Set<string>();
    interests.add('ติวเตอร์');
    interests.add('หอพัก');
    interests.add('ร้านอาหาร');
    interests.add('อุปกรณ์การเรียน');
    interests.add('กีฬา');
    interests.add('ท่องเที่ยว');
    interests.add('สุขภาพ');
    interests.add('เทคโนโลยี');
    return Array.from(interests).sort();
  }, []);

  const handleFacultyToggle = (faculty: string) => {
    setSelectedFaculties((prev) =>
      prev.includes(faculty) ? prev.filter((f) => f !== faculty) : [...prev, faculty]
    );
  };

  const handleInterestToggle = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const finalPrice = isCustomPriceEnabled && customFinalPrice !== null
    ? customFinalPrice
    : estimation?.estimation?.pricing?.total_estimate || 0;

  if (packagesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-[var(--color-yru-pink)]/10">
          <Calculator className="h-5 w-5 text-[var(--color-yru-pink)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">เครื่องมือประเมินราคาโฆษณา</h1>
          <p className="text-sm text-muted-foreground">
            คำนวณราคาเบื้องต้นสำหรับลูกค้า (ราคาสุดท้ายต้องผ่านการอนุมัติจากแอดมิน)
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration Panel */}
        <Card className="card-shadow border-border/40">
          <CardHeader>
            <CardTitle>ตั้งค่าการคำนวณ</CardTitle>
            <CardDescription>เลือกแพ็กเกจและกำหนดเป้าหมาย</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Package Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">เลือกแพ็กเกจ</label>
              <div className="grid grid-cols-2 gap-3">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedPackageId === pkg.id
                        ? 'border-[var(--color-yru-pink)] bg-[var(--color-yru-pink)]/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: pkg.color || '#888' }}
                      />
                      <span className="font-medium">{pkg.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatCurrency(pkg.base_price)}/วัน
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium">ระยะเวลา (วัน)</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-32"
                  min={1}
                />
                <div className="flex gap-2">
                  {[7, 14, 30, 90].map((days) => (
                    <Button
                      key={days}
                      variant={durationDays === days ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDurationDays(days)}
                      className="rounded-lg"
                    >
                      {days} วัน
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Faculty Targeting (Killer Feature!) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">กำหนดเป้าหมายตามคณะ</label>
                <Badge className="bg-red-500/10 text-red-600 text-xs">Killer Feature!</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                เลือกคณะที่ต้องการเข้าถึง (คิดค่าบริการเพิ่ม 20% ต่อคณะ)
              </p>
              <div className="flex flex-wrap gap-2 p-3 border rounded-xl bg-muted/10 min-h-[80px]">
                {(estimation?.estimation?.available_faculties || []).map((faculty) => (
                  <button
                    key={faculty}
                    onClick={() => handleFacultyToggle(faculty)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedFaculties.includes(faculty)
                        ? 'bg-green-500/10 border-green-500/30 text-green-600 font-medium'
                        : 'bg-background hover:bg-muted/50 border-border'
                    }`}
                  >
                    {selectedFaculties.includes(faculty) && <Check className="w-3 h-3 inline mr-1" />}
                    {faculty}
                  </button>
                ))}
              </div>
              {selectedFaculties.length > 0 && (
                <p className="text-xs text-green-600">
                  +{formatCurrency(estimation?.estimation?.targeting?.faculties?.fee || 0)} ({selectedFaculties.length} คณะ)
                </p>
              )}
            </div>

            {/* Interest Targeting */}
            <div className="space-y-2">
              <label className="text-sm font-medium">กำหนดเป้าหมายตามความสนใจ</label>
              <p className="text-xs text-muted-foreground">
                เลือกหัวข้อที่เกี่ยวข้อง (คิดค่าบริการเพิ่ม 10% ต่อหัวข้อ)
              </p>
              <div className="flex flex-wrap gap-2 p-3 border rounded-xl bg-muted/10 min-h-[60px]">
                {allInterests.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => handleInterestToggle(interest)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedInterests.includes(interest)
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 font-medium'
                        : 'bg-background hover:bg-muted/50 border-border'
                    }`}
                  >
                    {selectedInterests.includes(interest) && <Check className="w-3 h-3 inline mr-1" />}
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            {/* Add-ons */}
            <div className="space-y-2">
              <label className="text-sm font-medium">บริการเพิ่มเติม</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={includePremium}
                    onChange={(e) => setIncludePremium(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="font-medium">ตำแหน่งพิเศษ (Premium Placement)</span>
                    <p className="text-xs text-muted-foreground">แสดงในตำแหน่งที่เด่นกว่าปกติ (+15%)</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeHeroBanner}
                    onChange={(e) => setIncludeHeroBanner(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="font-medium">Hero Banner</span>
                    <p className="text-xs text-muted-foreground">แบนเนอร์ขนาดใหญ่บนสุด (+25%)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Manual Discount */}
            <div className="space-y-2">
              <label className="text-sm font-medium">ส่วนลดพิเศษ (%)</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={manualDiscount}
                  onChange={(e) => setManualDiscount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  className="w-32"
                  min={0}
                  max={100}
                />
                <span className="text-sm text-muted-foreground">%</span>
                <div className="flex gap-2 ml-auto">
                  {[0, 10, 20, 30].map((d) => (
                    <Button
                      key={d}
                      variant={manualDiscount === d ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setManualDiscount(d)}
                      className="rounded-lg"
                    >
                      {d}%
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={() => refetch()}
              disabled={!selectedPackageId || estimationLoading}
              className="w-full rounded-xl"
            >
              {estimationLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4 mr-2" />
              )}
              คำนวณราคาใหม่
            </Button>
          </CardContent>
        </Card>

        {/* Result Panel */}
        <Card className="card-shadow border-border/40">
          <CardHeader>
            <CardTitle>ผลการประเมินราคา</CardTitle>
            <CardDescription>
              ราคานี้เป็นเพียงการประเมินเบื้องต้น ต้องได้รับการอนุมัติจากแอดมิน
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selectedPackageId ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calculator className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">เลือกแพ็กเกจเพื่อเริ่มการคำนวณ</p>
              </div>
            ) : estimationLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : estimation ? (
              <>
                {/* Total Price */}
                <div className="text-center p-6 bg-gradient-to-r from-[var(--color-yru-pink)]/10 to-[var(--color-yru-green)]/10 rounded-2xl border border-[var(--color-yru-pink)]/20">
                  <p className="text-sm text-muted-foreground mb-1">ราคาประเมินทั้งหมด</p>
                  <p className="text-4xl font-bold text-[var(--color-yru-pink)]">
                    {formatCurrency(finalPrice)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    ({durationDays} วัน)
                  </p>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">รายละเอียดราคา</p>
                  <div className="space-y-2 p-4 bg-muted/30 rounded-xl text-sm">
                    <div className="flex justify-between">
                      <span>{selectedPackage?.name} x {durationDays} วัน</span>
                      <span>{formatCurrency(estimation.estimation.duration.fee)}</span>
                    </div>

                    {estimation.estimation.targeting.faculties.fee > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>ค่ากำหนดเป้าหมายตามคณะ ({estimation.estimation.targeting.faculties.count} คณะ)</span>
                        <span>+{formatCurrency(estimation.estimation.targeting.faculties.fee)}</span>
                      </div>
                    )}

                    {estimation.estimation.targeting.interests.fee > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>ค่ากำหนดเป้าหมายตามความสนใจ ({estimation.estimation.targeting.interests.count} หัวข้อ)</span>
                        <span>+{formatCurrency(estimation.estimation.targeting.interests.fee)}</span>
                      </div>
                    )}

                    {estimation.estimation.addons.premium_placement.fee > 0 && (
                      <div className="flex justify-between text-purple-600">
                        <span>Premium Placement</span>
                        <span>+{formatCurrency(estimation.estimation.addons.premium_placement.fee)}</span>
                      </div>
                    )}

                    {estimation.estimation.addons.hero_banner.fee > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Hero Banner</span>
                        <span>+{formatCurrency(estimation.estimation.addons.hero_banner.fee)}</span>
                      </div>
                    )}

                    <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                      <span>รวม</span>
                      <span>{formatCurrency(estimation.estimation.pricing.subtotal)}</span>
                    </div>

                    {estimation.estimation.pricing.discount_amount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>ส่วนลด ({estimation.estimation.pricing.discount_percent}%)</span>
                        <span>-{formatCurrency(estimation.estimation.pricing.discount_amount)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Price Override */}
                <div className="p-4 border rounded-xl bg-yellow-500/5 border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      ปรับราคาตามดุลยพินิจ
                    </span>
                  </div>
                  <label className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={isCustomPriceEnabled}
                      onChange={(e) => {
                        setIsCustomPriceEnabled(e.target.checked);
                        if (!e.target.checked) setCustomFinalPrice(null);
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">เปิดใช้ราคาที่กำหนดเอง</span>
                  </label>
                  {isCustomPriceEnabled && (
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        value={customFinalPrice ?? ''}
                        onChange={(e) => setCustomFinalPrice(parseFloat(e.target.value) || 0)}
                        placeholder="กรอกราคาที่ตกลง"
                        className="w-40"
                      />
                      <span className="text-sm text-muted-foreground">บาท</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex items-start gap-2 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-sm">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-blue-800 dark:text-blue-200">
                    <p className="font-medium">ข้อสำคัญ</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      <li>• ราคานี้เป็นเพียงการประเมิน ต้องได้รับการอนุมัติจากแอดมิน</li>
                      <li>• สามารถปรับราคาสุดท้ายได้ตามดุลยพินิจ (ส่วนลดพิเศษ, แพ็กเกจดีล)</li>
                      <li>• ราคามีผลถึง {new Date(estimation.estimation.valid_until).toLocaleDateString('th-TH')}</li>
                    </ul>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Targeting Summary */}
      {selectedFaculties.length > 0 && (
        <Card className="card-shadow border-green-500/20 bg-gradient-to-r from-green-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Killer Feature: Faculty Targeting
                </p>
                <p className="text-sm text-green-600/80 mt-1">
                  แพ็กเกจนี้จะแสดงเฉพาะผู้ใช้ที่อยู่ในคณะ: {selectedFaculties.join(', ')}
                </p>
                <p className="text-xs text-green-600/60 mt-2">
                  ตัวอย่าง: ร้านติวเตอร์สามารถเจาะกลุ่มนักศึกษาคณะครุศาสตร์โดยตรง - สิ่งที่ Facebook/Google ทำไม่ได้!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}