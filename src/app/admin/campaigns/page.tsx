'use client';

import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCampaigns } from '@/hooks/admin';
import {
  DEFAULT_CAMPAIGN_FORM,
  type AdCampaign,
  type AdCampaignFormData,
} from '@/types/advertising';
import {
  CampaignTable,
  CampaignStats,
  CampaignDialog,
  CampaignHeader,
} from '@/components/admin/campaigns';

export default function AdminCampaignsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<AdCampaignFormData>(DEFAULT_CAMPAIGN_FORM);

  const {
    campaigns,
    packages,
    isLoading,
    updateCampaign,
    updateMutation,
    approveCampaign,
    approveMutation,
    cancelCampaign,
    cancelMutation,
  } = useCampaigns(filterStatus);

  const filteredCampaigns = useMemo(
    () =>
      campaigns.filter(
        (c) =>
          c.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.advertiser_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      ),
    [campaigns, searchQuery]
  );

  const handleOpenCreate = () => {
    setEditingCampaign(null);
    setFormData(DEFAULT_CAMPAIGN_FORM);
    setIsDialogOpen(true);
  };

  const handleEdit = (campaign: AdCampaign) => {
    setEditingCampaign(campaign);
    setFormData({
      campaign_name: campaign.campaign_name,
      advertiser_name: campaign.advertiser_name || '',
      advertiser_contact: campaign.advertiser_contact || '',
      package_id: campaign.package_id,
      pricing_model: campaign.pricing_model,
      final_price: campaign.final_price || 0,
      notes: campaign.notes || '',
      start_date: campaign.start_date
        ? new Date(campaign.start_date).toISOString().split('T')[0]
        : '',
      end_date: campaign.end_date
        ? new Date(campaign.end_date).toISOString().split('T')[0]
        : '',
      target_faculties: campaign.target_faculties || [],
      target_interests: campaign.target_interests || [],
      target_years: campaign.target_years || [],
      target_genders: campaign.target_genders || [],
      budget: campaign.budget || 0,
      daily_budget: campaign.daily_budget || 0,
      status: campaign.status,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCampaign(null);
    setFormData(DEFAULT_CAMPAIGN_FORM);
  };

  const handleSubmit = async () => {
    try {
      if (editingCampaign) {
        await updateCampaign({ id: editingCampaign.id, data: formData });
        toast.success('อัปเดตแคมเปญสำเร็จ');
      } else {
        toast.success('สร้างแคมเปญสำเร็จ');
      }
      handleCloseDialog();
    } catch {
      toast.error(editingCampaign ? 'ไม่สามารถอัปเดตแคมเปญได้' : 'ไม่สามารถสร้างแคมเปญได้');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveCampaign(id);
      toast.success('อนุมัติแคมเปญสำเร็จ');
    } catch {
      toast.error('ไม่สามารถอนุมัติได้');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelCampaign(id);
      toast.success('ยกเลิกแคมเปญสำเร็จ');
    } catch {
      toast.error('ไม่สามารถยกเลิกได้');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      <CampaignHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={filterStatus}
        onStatusChange={setFilterStatus}
      />

      <CampaignStats campaigns={campaigns} />

      <CampaignTable
        campaigns={filteredCampaigns}
        onEdit={handleEdit}
        onApprove={handleApprove}
        onCancel={handleCancel}
        isApproving={approveMutation.isPending}
        isCancelling={cancelMutation.isPending}
      />

      <CampaignDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        editingCampaign={editingCampaign}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmit}
        packages={packages}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}