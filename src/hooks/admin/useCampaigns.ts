'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AdCampaign, AdPackage, AdCampaignFormData } from '@/types/advertising';

export function useCampaigns(statusFilter?: string) {
  const queryClient = useQueryClient();

  const campaignsQuery = useQuery<AdCampaign[]>({
    queryKey: ['admin', 'campaigns', statusFilter],
    queryFn: async () => {
      const url = statusFilter
        ? `/api/admin/campaigns?status=${statusFilter}`
        : '/api/admin/campaigns';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    },
  });

  const packagesQuery = useQuery<AdPackage[]>({
    queryKey: ['admin', 'packages', true],
    queryFn: async () => {
      const res = await fetch('/api/admin/packages?active=true');
      if (!res.ok) throw new Error('Failed to fetch packages');
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AdCampaignFormData }) => {
      const res = await fetch(`/api/admin/campaigns?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update campaign');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/campaigns?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (!res.ok) throw new Error('Failed to approve campaign');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/campaigns?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to cancel campaign');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
    },
  });

  return {
    campaigns: campaignsQuery.data ?? [],
    packages: packagesQuery.data ?? [],
    isLoading: campaignsQuery.isLoading || packagesQuery.isLoading,
    isError: campaignsQuery.isError || packagesQuery.isError,
    updateCampaign: updateMutation.mutateAsync,
    updateMutation,
    approveCampaign: approveMutation.mutateAsync,
    approveMutation,
    cancelCampaign: cancelMutation.mutateAsync,
    cancelMutation,
  };
}