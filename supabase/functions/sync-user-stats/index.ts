import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserStatPayload {
  user_id: number;
  username: string;
  level: number;
  gender: string;
  strength: number;
  defense: number;
  speed: number;
  dexterity: number;
  total_stats: number;
  networth: number;
  updated_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log("🚀 Starting User Stats Sync...");

    // 1. Ambil semua user dengan decrypted key
    // Pastikan RPC 'get_decrypted_users' mengembalikan kolom: id, decrypted_key
    const { data: users, error: dbError } = await supabase.rpc("get_decrypted_users");

    if (dbError) throw new Error(`DB Error: ${dbError.message}`);
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "No users found" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📋 Found ${users.length} users to sync.`);

    const updates: UserStatPayload[] = [];
    const errors: any[] = [];

    // 2. Loop user & Hit API
    // Limit concurrency kalau user banyak (misal chunking), tapi untuk sekarang sequential/parallel kecil oke.
    const promises = users.map(async (user: any) => {
      try {
        if (!user.decrypted_key) {
          console.log(`Skipping user ${user.id}: No key`);
          return;
        }

        console.log(`➡️ Fetching Torn data for user ${user.id}...`);
        const apiUrl = `https://api.torn.com/user/?selections=profile,battlestats,networth&key=${user.decrypted_key}`;
        const res = await fetch(apiUrl);

        if (!res.ok) {
          console.error(`❌ HTTP Error user ${user.id}: ${res.status} ${res.statusText}`);
          errors.push({ user_id: user.id, error: `HTTP ${res.status}` });
          return;
        }

        const data = await res.json();

        if (data.error) {
          console.error(`⚠️ API Error for user ${user.id}:`, JSON.stringify(data.error));
          errors.push({ user_id: user.id, error: data.error });
          return;
        }

        console.log(`✅ Data received for user ${user.id}. Name: ${data.name}`);
        console.log(`🔑 Response Keys:`, JSON.stringify(Object.keys(data)));
        console.log(`📊 RAW Battle Stats:`, JSON.stringify(data.battlestats));

        // Safety checks for objects
        // Ternyata data stats ada di root level (strength, speed, etc) bukan di dalam object battlestats
        // Tapi kita buat fallback biar aman untuk kedua format
        const bs = data.battlestats || data;
        const nw = data.networth || {};

        // Mapping Data
        updates.push({
          user_id: user.id,
          username: data.name,
          level: data.level,
          gender: data.gender,
          strength: bs.strength || 0,
          defense: bs.defense || 0,
          speed: bs.speed || 0,
          dexterity: bs.dexterity || 0,
          total_stats: bs.total || 0,
          networth: nw.total || 0,
          updated_at: new Date().toISOString()
        });

      } catch (err: any) {
        console.error(`❌ EXCEPTION for user ${user.id}:`, err);
        errors.push({ user_id: user.id, error: err.message });
      }
    });

    await Promise.all(promises);

    // 3. Simpan ke Table user_stats
    if (updates.length > 0) {
      const { error: upsertError } = await supabase
        .from('user_stats') // Table baru (sesuai request: dipisah)
        .upsert(updates, { onConflict: 'user_id' });

      if (upsertError) throw upsertError;

      // 4. Simpan juga ke networth_logs untuk tracking history/grafik
      const networthLogs = updates.map(u => ({
        torn_id: u.user_id,
        total_networth: u.networth
      }));

      const { error: logError } = await supabase
        .from('networth_logs')
        .insert(networthLogs);

      if (logError) {
        console.error("⚠️ Failed to log networth history:", logError);
      } else {
        console.log(`📊 Logged networth history for ${networthLogs.length} users.`);
      }
    }

    console.log(`✅ Synced ${updates.length} users. Failures: ${errors.length}`);

    return new Response(JSON.stringify({
      success: true,
      synced: updates.length,
      failures: errors.length,
      details_failures: errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("🔥 FATAL ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
