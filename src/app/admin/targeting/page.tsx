'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Target, Plus, Edit2, Trash2, Power, PowerOff, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface RuleCondition {
  field: string;
  operator: string;
  value: string;
}

interface RuleAction {
  type: string;
  params?: Record<string, unknown>;
}

interface TargetingRule {
  id: string;
  name: string;
  description: string | null;
  conditions: RuleCondition[];
  actions: RuleAction[];
  target_campaign_ids: string[] | null;
  target_ad_ids: string[] | null;
  excluded_user_ids: string[] | null;
  priority: number;
  is_active: boolean;
  is_system: boolean;
  traffic_allocation: number;
  variant: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface RulesResponse {
  rules: TargetingRule[];
  total: number;
}

const conditionFields = [
  { value: 'user.faculty', label: 'คณะของผู้ใช้' },
  { value: 'user.activity_level', label: 'ระดับกิจกรรม' },
  { value: 'user.engagement_score', label: 'คะแนนการมีส่วนร่วม' },
  { value: 'user.interest', label: 'ความสนใจ' },
  { value: 'user.device_type', label: 'ประเภทอุปกรณ์' },
  { value: 'user.time_zone', label: 'โซนเวลา' },
  { value: 'ad.position', label: 'ตำแหน่งโฆษณา' },
  { value: 'ad.format', label: 'รูปแบบโฆษณา' },
  { value: 'context.hour', label: 'ชั่วโมงปัจจุบัน' },
  { value: 'context.day_of_week', label: 'วันในสัปดาห์' },
];

const conditionOperators = [
  { value: 'equals', label: 'เท่ากับ' },
  { value: 'not_equals', label: 'ไม่เท่ากับ' },
  { value: 'contains', label: 'มีค่า' },
  { value: 'greater_than', label: 'มากกว่า' },
  { value: 'less_than', label: 'น้อยกว่า' },
  { value: 'in', label: 'อยู่ใน list' },
];

const actionTypes = [
  { value: 'serve_specific_ad', label: 'แสดงโฆษณาเฉพาะ' },
  { value: 'exclude_ad', label: 'ไม่แสดงโฆษณา' },
  { value: 'set_bid_modifier', label: 'ปรับ Bid' },
  { value: 'frequency_cap', label: 'จำกัดความถี่' },
  { value: 'priority_boost', label: 'เพิ่ม Priority' },
];

function RuleCard({ rule, onEdit, onToggle, onDelete }: {
  rule: TargetingRule;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className={cn('card-shadow border-border/40 transition-all', !rule.is_active && 'opacity-60')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              rule.is_active ? 'bg-[var(--color-yru-pink)]/10' : 'bg-muted'
            )}>
              <Target className={cn('h-5 w-5', rule.is_active ? 'text-[var(--color-yru-pink)]' : 'text-muted-foreground')} />
            </div>
            <div>
              <CardTitle className="text-base">{rule.name}</CardTitle>
              {rule.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{rule.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {rule.is_system && (
              <Badge variant="outline" className="text-xs">System</Badge>
            )}
            <Badge variant={rule.is_active ? 'default' : 'secondary'} className="text-xs">
              {rule.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Priority and Traffic */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1">
            <ArrowUp className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Priority:</span>
            <span className="font-medium">{rule.priority}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Traffic:</span>
            <span className="font-medium">{rule.traffic_allocation}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Conditions:</span>
            <span className="font-medium">{rule.conditions.length}</span>
          </div>
        </div>

        {/* Conditions */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Conditions</p>
          <div className="flex flex-wrap gap-2">
            {rule.conditions.map((cond, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {cond.field} {cond.operator} {cond.value}
              </Badge>
            ))}
            {rule.conditions.length === 0 && (
              <span className="text-xs text-muted-foreground">No conditions (matches all)</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Actions</p>
          <div className="flex flex-wrap gap-2">
            {rule.actions.map((action, idx) => (
              <Badge key={idx} className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                {action.type}
              </Badge>
            ))}
            {rule.actions.length === 0 && (
              <span className="text-xs text-muted-foreground">No actions defined</span>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <div className="text-xs text-muted-foreground">
            Updated {new Date(rule.updated_at).toLocaleDateString('th-TH')}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8"
              title={rule.is_active ? 'Deactivate' : 'Activate'}
            >
              {rule.is_active ? (
                <PowerOff className="h-4 w-4 text-orange-500" />
              ) : (
                <Power className="h-4 w-4 text-green-500" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-8 w-8"
              disabled={rule.is_system}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-8 w-8"
              disabled={rule.is_system}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RuleFormDialog({
  open,
  onOpenChange,
  rule,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: TargetingRule | null;
  onSave: (data: Partial<TargetingRule>) => void;
}) {
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [priority, setPriority] = useState(rule?.priority ?? 0);
  const [trafficAllocation, setTrafficAllocation] = useState(rule?.traffic_allocation ?? 100);
  const [conditions, setConditions] = useState<RuleCondition[]>(rule?.conditions || []);
  const [actions, setActions] = useState<RuleAction[]>(rule?.actions || []);

  const handleAddCondition = () => {
    setConditions([...conditions, { field: '', operator: '', value: '' }]);
  };

  const handleRemoveCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const handleConditionChange = (idx: number, field: keyof RuleCondition, value: string) => {
    const updated = [...conditions];
    updated[idx] = { ...updated[idx], [field]: value };
    setConditions(updated);
  };

  const operatorMap: Record<string, string> = {
    equals: 'eq',
    not_equals: 'ne',
    contains: 'contains',
    greater_than: 'gt',
    less_than: 'lt',
    in: 'in',
  };

  const handleAddAction = () => {
    setActions([...actions, { type: 'serve_specific_ad' }]);
  };

  const handleRemoveAction = (idx: number) => {
    setActions(actions.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    const transformedConditions = conditions.map(cond => ({
      ...cond,
      operator: operatorMap[cond.operator] || cond.operator,
    }));
    onSave({
      name,
      description,
      priority,
      traffic_allocation: trafficAllocation,
      conditions: transformedConditions,
      actions,
      is_active: rule?.is_active ?? true,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Rule' : 'Create New Rule'}</DialogTitle>
          <DialogDescription>
            {rule ? 'Update targeting rule configuration' : 'Create a new targeting rule for ad allocation'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., High Activity Users - Premium"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="traffic">Traffic Allocation (%)</Label>
                <Input
                  id="traffic"
                  type="number"
                  value={trafficAllocation}
                  onChange={(e) => setTrafficAllocation(parseInt(e.target.value) || 100)}
                  min={0}
                  max={100}
                />
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Conditions</Label>
              <Button variant="outline" size="sm" onClick={handleAddCondition}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {conditions.map((cond, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Select
                    value={cond.field}
                    onValueChange={(v) => handleConditionChange(idx, 'field', v)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Field" />
                    </SelectTrigger>
                    <SelectContent>
                      {conditionFields.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={cond.operator}
                    onValueChange={(v) => handleConditionChange(idx, 'operator', v)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {conditionOperators.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="flex-1"
                    value={cond.value}
                    onChange={(e) => handleConditionChange(idx, 'value', e.target.value)}
                    placeholder="Value"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCondition(idx)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {conditions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No conditions - rule will match all users
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Actions</Label>
              <Button variant="outline" size="sm" onClick={handleAddAction}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {actions.map((action, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Select
                    value={action.type}
                    onValueChange={(v) => {
                      const updated = [...actions];
                      updated[idx] = { type: v };
                      setActions(updated);
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Action Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
<Input
              className="flex-1"
              placeholder='{"ad_id": "uuid"}'
              defaultValue={action.params ? JSON.stringify(action.params) : ''}
            />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAction(idx)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {actions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No actions - rule will have no effect
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name}>
            {rule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TargetingRulesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<TargetingRule | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<RulesResponse>({
    queryKey: ['admin', 'targeting-rules'],
    queryFn: async () => {
      const res = await fetch('/api/admin/targeting/rules');
      if (!res.ok) throw new Error('Failed to fetch rules');
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const createMutation = useMutation({
    mutationFn: async (newRule: Partial<TargetingRule>) => {
      const res = await fetch('/api/admin/targeting/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });
      if (!res.ok) throw new Error('Failed to create rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'targeting-rules'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TargetingRule> & { id: string }) => {
      const res = await fetch(`/api/admin/targeting/rules?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'targeting-rules'] });
      setEditingRule(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/targeting/rules?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'targeting-rules'] });
      setDeleteConfirm(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const res = await fetch(`/api/admin/targeting/rules?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      });
      if (!res.ok) throw new Error('Failed to toggle rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'targeting-rules'] });
    },
  });

  const handleEdit = (rule: TargetingRule) => {
    setEditingRule(rule);
  };

  const handleSave = (data: Partial<TargetingRule>) => {
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleToggle = (rule: TargetingRule) => {
    toggleMutation.mutate({ id: rule.id, is_active: !rule.is_active });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Target className="h-7 w-7 text-[var(--color-yru-pink)]" />
            Targeting Rules
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            จัดการกฎการกำหนดเป้าหมายและการปันส่วน Traffic
          </p>
        </div>

        <Button
          onClick={() => setShowForm(true)}
          className="rounded-xl gap-2 bg-[var(--color-yru-pink)] hover:bg-[var(--color-yru-pink-dark)] text-white"
        >
          <Plus className="h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {/* Rules List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError || !data ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 bg-red-500/10 rounded-full mb-4">
            <Target className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="font-semibold text-lg mb-2">ไม่สามารถโหลดข้อมูล</h3>
          <p className="text-muted-foreground text-sm mb-4">
            กรุณาลองใหม่อีกครั้ง
          </p>
          <Button onClick={() => refetch()} variant="outline" className="rounded-xl gap-2">
            <Loader2 className="h-4 w-4" />
            ลองใหม่
          </Button>
        </div>
      ) : data.rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 bg-muted rounded-full mb-4">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">ยังไม่มีกฎการกำหนดเป้าหมาย</h3>
          <p className="text-muted-foreground text-sm mb-4">
            สร้างกฎเพื่อควบคุมการแสดงโฆษณาและการปันส่วน Traffic
          </p>
          <Button
            onClick={() => setShowForm(true)}
            className="rounded-xl gap-2 bg-[var(--color-yru-pink)] hover:bg-[var(--color-yru-pink-dark)] text-white"
          >
            <Plus className="h-4 w-4" />
            สร้างกฎแรก
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {data.rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={() => handleEdit(rule)}
              onToggle={() => handleToggle(rule)}
              onDelete={() => setDeleteConfirm(rule.id)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <RuleFormDialog
        open={showForm || !!editingRule}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditingRule(null);
          }
        }}
        rule={editingRule}
        onSave={handleSave}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณต้องการลบกฎนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              ลบกฎ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}