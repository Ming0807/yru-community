import { NextRequest, NextResponse } from 'next/server';
import { requireModerator } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireModerator();
    if ('error' in auth) return auth.error;

    const supabase = auth.supabase;
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaign_id');
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('budget_alerts')
      .select(`
        *,
        campaign:ad_campaigns(id, campaign_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: alerts, error } = await query;

    if (error) {
      console.error('[Budget Alerts] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }

    const { data: summary } = await supabase
      .from('budget_alerts_summary')
      .select('*');

    return NextResponse.json({
      alerts: alerts || [],
      summary: summary || [],
    });
  } catch (error) {
    console.error('[Budget Alerts] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireModerator();
    if ('error' in auth) return auth.error;

    const supabase = auth.supabase;
    const adminClient = getAdminClient();
    const body = await req.json();
    const { action, campaign_id, alert_id } = body;

    if (action === 'generate') {
      if (!campaign_id) {
        return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });
      }

      const { error: funcError } = await adminClient.rpc('generate_budget_alerts', {
        p_campaign_id: campaign_id
      });

      if (funcError) {
        console.error('[Budget Alerts] Generate error:', funcError);
        return NextResponse.json({ error: 'Failed to generate alerts' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Alerts generated' });
    }

    if (action === 'acknowledge') {
      if (!alert_id) {
        return NextResponse.json({ error: 'alert_id required' }, { status: 400 });
      }

      const { error: ackError } = await adminClient.rpc('acknowledge_budget_alert', {
        p_alert_id: alert_id,
        p_user_id: auth.user.id
      });

      if (ackError) {
        console.error('[Budget Alerts] Acknowledge error:', ackError);
        return NextResponse.json({ error: 'Failed to acknowledge alert' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Alert acknowledged' });
    }

    if (action === 'generate_all') {
      const { data: campaigns } = await supabase
        .from('ad_campaigns')
        .select('id')
        .in('status', ['active', 'approved']);

      for (const campaign of campaigns || []) {
        await adminClient.rpc('generate_budget_alerts', {
          p_campaign_id: campaign.id
        });
      }

      return NextResponse.json({ success: true, message: `Generated alerts for ${campaigns?.length || 0} campaigns` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Budget Alerts] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireModerator();
    if ('error' in auth) return auth.error;

    const supabase = auth.supabase;
    const body = await req.json();
    const { alert_id, status } = body;

    if (!alert_id || !status) {
      return NextResponse.json({ error: 'alert_id and status required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('budget_alerts')
      .update({ status, acknowledged_by: auth.user.id, acknowledged_at: new Date().toISOString() })
      .eq('id', alert_id);

    if (error) {
      console.error('[Budget Alerts] Update error:', error);
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Budget Alerts] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
