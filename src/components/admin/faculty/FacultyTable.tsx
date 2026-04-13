'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { FacultyStats } from '@/types/advertising';

interface Props {
  data: FacultyStats[];
  title?: string;
}

type SortField = 'faculty' | 'userCount' | 'activeUsers' | 'postCount' | 'adRevenue' | 'adClicks';
type SortOrder = 'asc' | 'desc';

function SortIconComponent({ field, sortField, sortOrder }: { field: SortField; sortField: SortField; sortOrder: SortOrder }) {
  if (sortField !== field) {
    return <ArrowUpDown className="h-3 w-3 text-muted-foreground ml-1 inline" />;
  }
  return sortOrder === 'asc' ? (
    <ArrowUp className="h-3 w-3 text-[var(--color-yru-pink)] ml-1 inline" />
  ) : (
    <ArrowDown className="h-3 w-3 text-[var(--color-yru-pink)] ml-1 inline" />
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return num.toLocaleString('th-TH');
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function FacultyTable({ data, title = 'รายละเอียดตามคณะ' }: Props) {
  const [sortField, setSortField] = useState<SortField>('activeUsers');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let aVal: number | string = a[sortField];
    let bVal: number | string = b[sortField];
    if (sortField === 'faculty') {
      aVal = a.faculty.toLowerCase();
      bVal = b.faculty.toLowerCase();
    }
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  return (
    <Card className="card-shadow border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
<table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border/60">
            <tr>
              <th
                className="px-4 py-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('faculty')}
              >
                <span className="flex items-center">
                  คณะ
                  <SortIconComponent field="faculty" sortField={sortField} sortOrder={sortOrder} />
                </span>
              </th>
              <th
                className="px-4 py-3 text-right font-medium cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('userCount')}
              >
                <span className="flex items-center justify-end">
                  ผู้ใช้ทั้งหมด
                  <SortIconComponent field="userCount" sortField={sortField} sortOrder={sortOrder} />
                </span>
              </th>
              <th
                className="px-4 py-3 text-right font-medium cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('activeUsers')}
              >
                <span className="flex items-center justify-end">
                  Active (30 วัน)
                  <SortIconComponent field="activeUsers" sortField={sortField} sortOrder={sortOrder} />
                </span>
              </th>
              <th
                className="px-4 py-3 text-right font-medium cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('postCount')}
              >
                <span className="flex items-center justify-end">
                  โพสต์
                  <SortIconComponent field="postCount" sortField={sortField} sortOrder={sortOrder} />
                </span>
              </th>
              <th className="px-4 py-3 text-right font-medium">Engagement</th>
              <th
                className="px-4 py-3 text-right font-medium cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('adClicks')}
              >
                <span className="flex items-center justify-end">
                  คลิกโฆษณา
                  <SortIconComponent field="adClicks" sortField={sortField} sortOrder={sortOrder} />
                </span>
              </th>
              <th
                className="px-4 py-3 text-right font-medium cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('adRevenue')}
              >
                <span className="flex items-center justify-end">
                  รายได้โฆษณา
                  <SortIconComponent field="adRevenue" sortField={sortField} sortOrder={sortOrder} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  ไม่มีข้อมูลคณะ
                </td>
              </tr>
            ) : (
              sortedData.map((faculty, index) => (
                <tr key={faculty.faculty} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[var(--color-yru-pink)]/10 text-[var(--color-yru-pink)] text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="font-medium">{faculty.faculty}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatNumber(faculty.userCount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium text-green-600">
                      {formatNumber(faculty.activeUsers)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatNumber(faculty.postCount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-medium ${
                        faculty.engagementRate >= 50
                          ? 'text-green-600'
                          : faculty.engagementRate >= 20
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {formatPercent(faculty.engagementRate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatNumber(faculty.adClicks)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[var(--color-yru-pink)]">
                    {faculty.adRevenue > 0 ? formatCurrency(faculty.adRevenue) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </CardContent>
    </Card>
  );
}