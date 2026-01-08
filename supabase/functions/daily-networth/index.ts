import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Ambil semua user & API Key yang sudah terenkripsi
    const { data: users, error: dbError } = await supabaseClient.rpc('get_decrypted_users');
    if (dbError || !users) throw new Error("Gagal ambil data user dari DB");

    console.log(`Memproses networth untuk ${users.length} user...`);

    for (const user of users) {
      // 2. Tanya ke API Torn berapa networth-nya sekarang
      const response = await fetch(`https://api.torn.com/user/?selections=personalstats&key=${user.decrypted_key}`);
      const tornData = await response.json();

      if (tornData.personalstats && tornData.personalstats.networth) {
        const networth = tornData.personalstats.networth;

        // 3. Simpan ke tabel networth_logs
        const { error: insertError } = await supabaseClient
          .from('networth_logs')
          .insert({
            torn_id: user.id,
            total_networth: networth
          });

        if (insertError) console.error("Gagal simpan:", insertError);
        else console.log(`✅ ID ${user.id}: ${networth} tercatat.`);
      }
    }

    return new Response("Success", { status: 200 });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
})