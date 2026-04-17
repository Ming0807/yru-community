import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  const { data, error } = await adminClient.rpc('check_ad_frequency_cap', {
      p_ad_id: 'dd2529b2-693f-4c81-9e0b-49d8feb5742e',
      p_user_identifier: 'anonymous',
      p_max_views: 5,
      p_window_hours: 24,
    });
  
  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log("Success:", data);
  }
}

test();
