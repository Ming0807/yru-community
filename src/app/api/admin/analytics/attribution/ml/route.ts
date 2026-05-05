import { requireAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const adminClient = getAdminClient();
    const { searchParams } = new URL(req.url);

    const model = searchParams.get('model') || 'data_driven';
    const campaignId = searchParams.get('campaign_id');
    const days = parseInt(searchParams.get('days') || '30', 10);
    const train = searchParams.get('train') === 'true';

    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    if (train) {
      const { error: seqError } = await adminClient.rpc('build_attribution_sequences', {
        p_start_date: startDateStr,
        p_end_date: endDateStr
      });

      if (seqError) {
        console.error('[ML Attribution] Build sequences error:', seqError);
      }

      if (model === 'data_driven' || model === 'all') {
        await adminClient.rpc('calculate_data_driven_attribution', {
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0]
        });
      }

      if (model === 'markov' || model === 'all') {
        await adminClient.rpc('calculate_markov_attribution', {
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0]
        });
      }

      if (model === 'shapley' || model === 'all') {
        await adminClient.rpc('calculate_shapley_attribution', {
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0]
        });
      }
    }

    let query = adminClient
      .from('attribution_model_results')
      .select('*')
      .order('blended_weight', { ascending: false });

    if (model !== 'all') {
      const weightColumn = `${model}_weight`;
      query = query.order(weightColumn, { ascending: false });
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data: results, error } = await query.limit(20);

    if (error) {
      console.error('[ML Attribution] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch attribution' }, { status: 500 });
    }

    const { data: conversions } = await adminClient
      .from('ad_conversions')
      .select('id, conversion_value')
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr);

    const totalValue = conversions?.reduce((sum, c) => sum + (c.conversion_value || 0), 0) || 0;

    const { data: models } = await adminClient
      .from('attribution_models')
      .select('*')
      .eq('is_active', true);

    return NextResponse.json({
      model,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        total_conversions: conversions?.length || 0,
        total_conversion_value: totalValue,
        models_used: models?.map(m => m.model_name) || [],
      },
      results: results || [],
      model_descriptions: {
        data_driven: 'ใช้ข้อมูลจริงคำนวณ removal effect - แอดที่ถูกลบออกแล้ว conversion ลดลงเท่าไหร่',
        markov: 'ใช้ Markov Chain - คำนวณ transition probability ระหว่าง touchpoints',
        shapley: 'ใช้ Shapley Value - การกระจายเครดิตอย่าง công bằngตามทฤษฎีเกม',
        blended: 'ค่าเฉลี่ยของทั้ง 3 โมเดล',
      },
      instructions: {
        train: 'เพิ่ม ?train=true เพื่อคำนวณ weights ใหม่จากข้อมูล',
        model: 'เปลี่ยน model ได้: data_driven, markov, shapley, all',
      },
    });
  } catch (error) {
    console.error('[ML Attribution] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const adminClient = getAdminClient();
    const body = await req.json();
    const { action, start_date, end_date } = body;

    if (action === 'train') {
      const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end_date ? new Date(end_date) : new Date();

      await adminClient.rpc('build_attribution_sequences', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      });

      await adminClient.rpc('calculate_data_driven_attribution', {
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0]
      });

      await adminClient.rpc('calculate_markov_attribution', {
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0]
      });

      await adminClient.rpc('calculate_shapley_attribution', {
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0]
      });

      return NextResponse.json({
        success: true,
        message: 'Attribution models trained successfully',
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[ML Attribution POST] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
