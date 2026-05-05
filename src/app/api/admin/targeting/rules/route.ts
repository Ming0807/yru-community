import { requireAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { TargetingRule } from '@/types/analytics/segments';

export async function GET(request: Request) {
try {
const auth = await requireAdmin();
if ('error' in auth) return auth.error;

const adminClient = getAdminClient();
const { searchParams } = new URL(request.url);
    
    const activeOnly = searchParams.get('active') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Build query
    let query = adminClient
      .from('targeting_rules')
      .select('*')
      .order('priority', { ascending: false })
      .limit(limit);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: rules, error } = await query;

    if (error) {
      console.error('Error fetching targeting rules:', error);
      return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
    }

    return NextResponse.json({
      rules: rules || [],
      total: rules?.length || 0,
    });
  } catch (error) {
    console.error('Targeting rules API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
try {
const auth = await requireAdmin();
if ('error' in auth) return auth.error;

const adminClient = getAdminClient();
const { user } = auth;

const body = await request.json();

// Validate required fields
const { name, conditions, actions } = body;
if (!name || !conditions || !Array.isArray(conditions)) {
  return NextResponse.json({
    error: 'Invalid request: name and conditions are required'
  }, { status: 400 });
}

// Validate traffic_allocation is 0-100
if (body.traffic_allocation !== undefined) {
  if (typeof body.traffic_allocation !== 'number' || body.traffic_allocation < 0 || body.traffic_allocation > 100) {
    return NextResponse.json({
      error: 'traffic_allocation must be a number between 0 and 100'
    }, { status: 400 });
  }
}

    // Validate conditions format
    for (const condition of conditions) {
      if (!condition.field || !condition.operator) {
        return NextResponse.json({
          error: 'Each condition must have field and operator',
        }, { status: 400 });
      }
    }

    const newRule = {
      name,
      description: body.description || null,
      conditions,
      actions: actions || [],
      target_campaign_ids: body.target_campaign_ids || null,
      target_ad_ids: body.target_ad_ids || null,
      excluded_user_ids: body.excluded_user_ids || null,
      priority: body.priority || 0,
      is_active: body.is_active ?? true,
      traffic_allocation: body.traffic_allocation || 100,
      variant: body.variant || 'control',
      created_by: user.id,
    };

    const { data, error } = await adminClient
      .from('targeting_rules')
      .insert(newRule)
      .select()
      .single();

    if (error) {
      console.error('Error creating targeting rule:', error);
      return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
    }

    return NextResponse.json({ rule: data }, { status: 201 });
  } catch (error) {
    console.error('Targeting rules POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
try {
const auth = await requireAdmin();
if ('error' in auth) return auth.error;

const adminClient = getAdminClient();
const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('id');

    if (!ruleId) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

const body = await request.json();
const {
  name, description, conditions, actions,
  target_campaign_ids, target_ad_ids, excluded_user_ids,
  priority, is_active, traffic_allocation, variant
} = body;

// Validate traffic_allocation is 0-100
if (traffic_allocation !== undefined) {
  if (typeof traffic_allocation !== 'number' || traffic_allocation < 0 || traffic_allocation > 100) {
    return NextResponse.json({
      error: 'traffic_allocation must be a number between 0 and 100'
    }, { status: 400 });
  }
}

const updates: Partial<TargetingRule> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (conditions !== undefined) updates.conditions = conditions;
    if (actions !== undefined) updates.actions = actions;
    if (target_campaign_ids !== undefined) updates.target_campaign_ids = target_campaign_ids;
    if (target_ad_ids !== undefined) updates.target_ad_ids = target_ad_ids;
    if (excluded_user_ids !== undefined) updates.excluded_user_ids = excluded_user_ids;
    if (priority !== undefined) updates.priority = priority;
    if (is_active !== undefined) updates.is_active = is_active;
    if (traffic_allocation !== undefined) updates.traffic_allocation = traffic_allocation;
    if (variant !== undefined) updates.variant = variant;

    const { data, error } = await adminClient
      .from('targeting_rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) {
      console.error('Error updating targeting rule:', error);
      return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
    }

    return NextResponse.json({ rule: data });
  } catch (error) {
    console.error('Targeting rules PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
try {
const auth = await requireAdmin();
if ('error' in auth) return auth.error;

const adminClient = getAdminClient();
const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('id');

    if (!ruleId) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    // Check if rule is system rule (cannot be deleted)
    const { data: existingRule } = await adminClient
      .from('targeting_rules')
      .select('is_system')
      .eq('id', ruleId)
      .single();

    if (existingRule?.is_system) {
      return NextResponse.json({ 
        error: 'System rules cannot be deleted. Use deactivate instead.' 
      }, { status: 403 });
    }

    const { error } = await adminClient
      .from('targeting_rules')
      .delete()
      .eq('id', ruleId);

    if (error) {
      console.error('Error deleting targeting rule:', error);
      return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Targeting rules DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
