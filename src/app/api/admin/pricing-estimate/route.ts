import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const {
      package_id,
      duration_days,
      target_faculties = [],
      target_interests = [],
      include_premium_placement = false,
      include_hero_banner = false,
      custom_discount_percent = 0
    } = body;

    if (!package_id || !duration_days) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get package details
    const { data: pkg, error } = await supabase
      .from('ad_packages')
      .select('*')
      .eq('id', package_id)
      .single();

    if (error || !pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Calculate pricing
    const basePricePerDay = Number(pkg.base_price);
    const durationFee = basePricePerDay * duration_days;

    // Faculty targeting fee (20% per faculty)
    const facultyCount = Array.isArray(target_faculties) ? target_faculties.length : 0;
    const facultyFee = facultyCount > 0 ? durationFee * 0.2 * facultyCount : 0;

    // Interest targeting fee (10% per interest)
    const interestCount = Array.isArray(target_interests) ? target_interests.length : 0;
    const interestFee = interestCount > 0 ? durationFee * 0.1 * interestCount : 0;

    // Premium placement
    const premiumFee = include_premium_placement ? durationFee * 0.15 : 0;

    // Hero banner
    const heroFee = include_hero_banner ? durationFee * 0.25 : 0;

    // Subtotal before discount
    const subtotal = durationFee + facultyFee + interestFee + premiumFee + heroFee;

    // Apply discount
    const discountAmount = subtotal * (custom_discount_percent / 100);
    const totalEstimate = subtotal - discountAmount;

    // Get faculty list for display
    let availableFaculties: string[] = [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('faculty')
      .not('faculty', 'is', null);

if (profiles) {
  const facultySet = new Set<string>();
  profiles.forEach((p: { faculty?: string }) => {
    if (p.faculty) facultySet.add(p.faculty);
  });
  availableFaculties = Array.from(facultySet).sort();
}

    return NextResponse.json({
      estimation: {
        package: {
          id: pkg.id,
          name: pkg.name,
          tier: pkg.tier,
          base_price_per_day: basePricePerDay
        },
        duration: {
          days: duration_days,
          fee: durationFee
        },
        targeting: {
          faculties: {
            count: facultyCount,
            fee: facultyFee,
            list: target_faculties
          },
          interests: {
            count: interestCount,
            fee: interestFee,
            list: target_interests
          }
        },
        addons: {
          premium_placement: {
            included: include_premium_placement,
            fee: premiumFee
          },
          hero_banner: {
            included: include_hero_banner,
            fee: heroFee
          }
        },
        pricing: {
          subtotal,
          discount_percent: custom_discount_percent,
          discount_amount: discountAmount,
          total_estimate: totalEstimate,
          currency: 'THB',
          formatted: `฿${totalEstimate.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        },
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Valid for 7 days
        available_faculties: availableFaculties
      }
    });
  } catch (error) {
    console.error('[Pricing Estimator] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}