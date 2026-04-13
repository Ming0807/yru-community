'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  AVAILABLE_INTERESTS,
  AVAILABLE_YEARS,
  DEFAULT_CAMPAIGN_FORM,
  type AdCampaign,
  type AdCampaignFormData,
  type AdPackage,
} from '@/types/advertising';
import { Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingCampaign: AdCampaign | null;
  formData: AdCampaignFormData;
  onFormChange: (data: AdCampaignFormData) => void;
  onSubmit: () => void;
  packages: AdPackage[];
  isSubmitting?: boolean;
}

export function CampaignDialog({
  isOpen,
  onClose,
  editingCampaign,
  formData,
  onFormChange,
  onSubmit,
  packages,
  isSubmitting,
}: Props) {
  const toggleArrayItem = <T extends string | number>(
    arr: T[],
    item: T,
    setter: (v: T[]) => void
  ) => {
    if (arr.includes(item)) {
      setter(arr.filter((i) => i !== item));
    } else {
      setter([...arr, item]);
    }
  };

  const handleChange = (field: keyof AdCampaignFormData, value: unknown) => {
    onFormChange({ ...formData, [field]: value });
  };

  const handleClose = () => {
    onFormChange(DEFAULT_CAMPAIGN_FORM);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <Card className="relative z-10 w-full max-w-[700px] max-h-[90vh] overflow-hidden">
        <CardHeader>
          <CardTitle>
            {editingCampaign ? 'แก้ไขแคมเปญโฆษณา' : 'สร้างแคมเปญใหม่'}
          </CardTitle>
          <CardDescription>ปรับแต่งรายละเอียดแคมเปญของคุณ</CardDescription>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            <FormSection title="ข้อมูลพื้นฐาน">
              <FormField label="ชื่อแคมเปญ" required>
                <Input
                  value={formData.campaign_name}
                  onChange={(e) => handleChange('campaign_name', e.target.value)}
                  placeholder="เช่น โปรโมชันร้านติวเตอร์"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="ผู้ลงโฆษณา">
                  <Input
                    value={formData.advertiser_name}
                    onChange={(e) => handleChange('advertiser_name', e.target.value)}
                    placeholder="ชื่อบริษัท/ร้านค้า"
                  />
                </FormField>
                <FormField label="ติดต่อ">
                  <Input
                    value={formData.advertiser_contact}
                    onChange={(e) => handleChange('advertiser_contact', e.target.value)}
                    placeholder="เบอร์โทร/อีเมล"
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="แพ็กเกจและราคา">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="แพ็กเกจ" required>
                  <select
                    value={formData.package_id}
                    onChange={(e) => handleChange('package_id', e.target.value)}
                    className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">เลือกแพ็กเกจ</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.tier})
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="ราคาสุดท้าย (บาท)">
                  <Input
                    type="number"
                    value={formData.final_price}
                    onChange={(e) => handleChange('final_price', parseInt(e.target.value) || 0)}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="ระยะเวลา">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="วันที่เริ่ม">
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                  />
                </FormField>
                <FormField label="วันที่สิ้นสุด">
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="การกำหนดเป้าหมาย">
              <FormField label="เป้าหมายตามความสนใจ">
                <CheckboxGroup
                  options={AVAILABLE_INTERESTS.map((i) => ({ value: i, label: i }))}
                  selected={formData.target_interests}
                  onChange={(values) => handleChange('target_interests', values)}
                />
              </FormField>
              <FormField label="เป้าหมายตามชั้นปี">
                <CheckboxGroup
                  options={AVAILABLE_YEARS.map((y) => ({ value: y, label: `ปี ${y}` }))}
                  selected={formData.target_years}
                  onChange={(values) => handleChange('target_years', values)}
                />
              </FormField>
            </FormSection>

            <FormSection title="หมายเหตุ">
              <Input
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="บันทึกเพิ่มเติม..."
              />
            </FormSection>

            <div className="flex items-center gap-4 pt-4 border-t">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.status === 'active'}
                  onChange={(e) =>
                    handleChange('status', e.target.checked ? 'active' : 'paused')
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">เปิดใช้งานทันที</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button variant="outline" onClick={handleClose} className="rounded-xl">
              ยกเลิก
            </Button>
            <Button
              onClick={onSubmit}
              disabled={isSubmitting || !formData.campaign_name}
              className="rounded-xl bg-[var(--color-yru-pink)] hover:bg-[var(--color-yru-pink-dark)] text-white"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCampaign ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างแคมเปญ'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function CheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: { value: string | number; label: string }[];
  selected: (string | number)[];
  onChange: (values: (string | number)[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 p-3 border rounded-xl bg-muted/10">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`flex items-center gap-1.5 text-sm cursor-pointer border px-2.5 py-1.5 rounded-lg transition-colors ${
            selected.includes(opt.value)
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-600'
              : 'bg-background hover:bg-muted/50 border-border'
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(opt.value)}
            onChange={() => {
              if (selected.includes(opt.value)) {
                onChange(selected.filter((v) => v !== opt.value));
              } else {
                onChange([...selected, opt.value]);
              }
            }}
            className="hidden"
          />
          {selected.includes(opt.value) && <Check className="h-3 w-3" />}
          {opt.label}
        </label>
      ))}
    </div>
  );
}