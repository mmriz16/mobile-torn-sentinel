// supabase/functions/war-watcher/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- KONFIGURASI MANUAL ---
// GANTI DENGAN DATA ASLI ANDA DISINI
const TORN_API_KEY = 'yupPE0mjPl2Z2n4s';
const FACTION_ID = '51896';
// --------------------------

serve(async (req) => {
  try {
    // 1. Setup Client Supabase (Otomatis ambil dari env server)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Cek API Torn Faction (Chain & Attack)
    console.log("🔍 Mengecek status faction...");
    const response = await fetch(
      `https://api.torn.com/faction/${FACTION_ID}?selections=chain&key=${TORN_API_KEY}`
    );
    const data = await response.json();

    // Validasi Error API Torn
    if (data.error) {
      console.error("API Torn Error:", data.error);
      return new Response(JSON.stringify(data.error), { status: 400 });
    }

    const chain = data.chain;

    // 3. LOGIKA BAHAYA (Alert)
    // Jika Chain > 10 dan Timeout < 90 detik
    if (chain && chain.current > 10 && chain.timeout < 90) {

      console.log(`⚠️ BAHAYA! Chain tinggal ${chain.timeout} detik!`);

      // A. Ambil Token HP semua member dari Database Supabase
      const { data: users, error } = await supabaseClient
        .from('users')
        .select('push_token')
        .eq('faction_id', FACTION_ID) // Hanya member faction ini
        .not('push_token', 'is', null);

      if (error) throw error;

      if (users && users.length > 0) {
        console.log(`📢 Mengirim notif ke ${users.length} HP...`);

        // B. Siapkan Pesan Notifikasi Expo
        const messages = users.map(u => ({
          to: u.push_token,
          sound: 'default',
          title: '🚨 CHAIN WARNING!',
          body: `Chain sisa ${chain.timeout} detik! LOGIN SEKARANG!`,
          priority: 'high',
          data: { type: 'chain_alert' },
        }));

        // C. Kirim ke Server Expo
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });

        return new Response(JSON.stringify({ status: "Alert Sent!", count: users.length }), { headers: { "Content-Type": "application/json" } });
      }
    } else {
      console.log(`✅ Situasi Aman. Chain: ${chain?.current || 0}, Timeout: ${chain?.timeout || 0}`);
    }

    return new Response(JSON.stringify({ status: "No Alert Needed" }), { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    console.error("System Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})