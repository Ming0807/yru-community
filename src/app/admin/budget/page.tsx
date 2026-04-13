'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Wallet, RefreshCw, AlertTriangle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  BudgetOverviewCards,
  BudgetTable,
} from '@/components/admin/budget';
import type { BudgetOverview, BudgetPacing, BudgetAlert } from '@/types/advertising';

interface BudgetData {
  overview: BudgetOverview;
  campaigns: BudgetPacing[];
  alerts: BudgetAlert[];
}

export default function BudgetPacingPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<BudgetData>({
    queryKey: ['admin', 'budget-pacing'],
    queryFn: async () => {
      const res = await fetch('/api/admin/budget');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    staleTime: 1000 * 60 * 2,
  });

  const pauseMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await fetch(`/api/admin/campaigns?id=${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'budget-pacing'] });
      toast.success('หยุดแคมเปญชั่วคราว');
    },
    onError: () => toast.error('ไม่สามารถหยุดแคมเปญได้'),
  });

  const resumeMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await fetch(`/api/admin/campaigns?id=${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'budget-pacing'] });
      toast.success('กลับมาใช้งานแคมเปญ');
    },
    onError: () => toast.error('ไม่สามารถกลับมาใช้งานได้'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 bg-red-500/10 rounded-full mb-4">
          <Wallet className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="font-semibold text-lg mb-2">ไม่สามารถโหลดข้อมูลงบประมาณ</h3>
        <p className="text-muted-foreground text-sm mb-4">
          กรุณาลองใหม่อีกครั้ง
        </p>
        <Button onClick={() => refetch()} variant="outline" className="rounded-xl gap-2">
          <RefreshCw className="h-4 w-4" />
          ลองใหม่
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Wallet className="h-7 w-7 text-[var(--color-yru-pink)]" />
            งบประมาณและการใช้งบ
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            ติดตามและจัดการงบประมาณโฆษณาของแต่ละแคมเปญ
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-xl"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Alerts */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert, index) => (
            <Card
              key={index}
              className={`border-l-4 ${
                alert.severity === 'critical' ? 'border-l-red-500' : 'border-l-yellow-500'
              } bg-muted/30`}
            >
              <CardContent className="flex items-start gap-3 py-3">
                <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                  alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                }`} />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{alert.campaignName}</p>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-lg">
                  {alert.suggestedAction}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Overview Cards */}
      <BudgetOverviewCards data={data.overview} />

      {/* Budget Table */}
      <BudgetTable
        data={data.campaigns}
        onPauseCampaign={(id) => pauseMutation.mutate(id)}
        onResumeCampaign={(id) => resumeMutation.mutate(id)}
      />

      {/* Tips */}
      <Card className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-border/40">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground">เคล็ดลับการจัดการงบ</h3>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• <strong>On Track (ตามแผน)</strong> - อัตราการใช้งบเป็นไปตามที่คาดการณ์ไว้</li>
                <li>• <strong>Over Budget (ใช้งบเร็ว)</strong> - ควรลดงบรายวันหรือหยุดชั่วคราว</li>
                <li>• <strong>Under Budget (ใช้งบต่ำ)</strong> - อาจปรับเพิ่มงบเพื่อเพิ่มประสิทธิภาพ</li>
                <li>• <strong>Exhausted (หมดงบ)</strong> - งบหมดแล้ว ระบบจะหยุดแสดงโฆษณาโดยอัตโนมัติ</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}