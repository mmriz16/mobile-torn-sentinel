import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log("🚀 Starting Bulk Bank History Sync...");

    // 2. Ambil semua user dengan decrypted key
    const { data: users, error: dbError } = await supabase.rpc("get_decrypted_users");

    if (dbError) throw new Error(`DB Error: ${dbError.message}`);
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "No users found" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📋 Found ${users.length} users to sync.`);

    const recordsToUpsert: any[] = [];
    const errors: any[] = [];

    // 3. Loop per User
    await Promise.all(users.map(async (user: any) => {
      try {
        if (!user.decrypted_key) {
          console.log(`Skipping user ${user.id}: No key`);
          return;
        }

        // Filter: 5450,5451 (City Bank), 6010,6011,6012 (Cayman Bank)
        const TORN_URL = `https://api.torn.com/user/?selections=log&log=5450,5451,6010,6011,6012&key=${user.decrypted_key}`;

        const res = await fetch(TORN_URL);
        const json = await res.json();

        if (json.error) {
          console.error(`⚠️ Error user ${user.id}: ${json.error.error}`);
          errors.push({ user_id: user.id, error: json.error.error });
          return;
        }

        if (!json.log || Object.keys(json.log).length === 0) {
          return; // No new logs
        }

        // Mapping Data
        for (const [hashKey, item] of Object.entries(json.log)) {
          const data = (item as any).data || {};

          recordsToUpsert.push({
            log_hash: hashKey,
            user_id: user.id,
            log_type: (item as any).log,
            category: (item as any).category,
            title: (item as any).title,
            transaction_time: new Date((item as any).timestamp * 1000).toISOString(),
            amount: Math.floor(data.amount || 0),
            invest_worth: data.worth ? Math.floor(data.worth) : null,
            invest_duration: data.duration || null,
            invest_percent: data.percent || null
          });
        }

      } catch (err: any) {
        console.error(`❌ EXCEPTION for user ${user.id}:`, err);
        errors.push({ user_id: user.id, error: err.message });
      }
    }));

    // 4. Batch Upsert to Database
    if (recordsToUpsert.length > 0) {
      console.log(`💾 Saving ${recordsToUpsert.length} log records...`);
      const { error: upsertError } = await supabase
        .from('bank_logs')
        .upsert(recordsToUpsert, { onConflict: 'log_hash' });

      if (upsertError) throw upsertError;
    }

    console.log(`✅ Synced ${recordsToUpsert.length} records. Failures: ${errors.length}`);

    return new Response(JSON.stringify({
      success: true,
      synced_records: recordsToUpsert.length,
      failures: errors.length,
      details: errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("🔥 FATAL ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})