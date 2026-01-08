// supabase/functions/status-watcher/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log("🤖 Robot bangun. Memulai pengecekan...");

    const { data: users, error: dbError } = await supabaseClient.rpc('get_decrypted_users');

    if (dbError) {
      console.error("❌ DB ERROR:", JSON.stringify(dbError));
      return new Response(JSON.stringify({ error: "DB Error", details: dbError }), { status: 500 });
    }

    if (!users || users.length === 0) {
      console.log("⚠️ Tidak ada user ditemukan.");
      return new Response("No users found", { status: 200 });
    }

    const notifications = [];
    const updates = [];

    for (const user of users) {
      try {
        const apiKey = user.decrypted_key;
        if (!apiKey) continue;

        const res = await fetch(`https://api.torn.com/user/?selections=bars,travel,cooldowns,education,profile&key=${apiKey}`);
        const d = await res.json();

        if (d.error) {
          console.error(`⚠️ Torn API Error ID ${user.id}:`, d.error);
          continue;
        }

        // Helper untuk memasukkan antrian notifikasi dan update
        const push = (title: string, body: string, dbField: string) => {
          notifications.push({ to: user.push_token, title, body, sound: 'default' });
          updates.push({ user_id: user.id, [dbField]: true });
        };

        const reset = (dbField: string) => {
          // Hanya reset jika status di DB saat ini adalah true
          if (user[dbField] === true) {
            updates.push({ user_id: user.id, [dbField]: false });
          }
        };

        // --- LOGIKA PENGECEKAN (Menggunakan nama kolom baru) ---

        // 1. ENERGY
        if (d.energy.current >= d.energy.maximum && !user.energy_full) push("⚡ Energy Full", "Waktunya Gym!", "energy_full");
        else if (d.energy.current < d.energy.maximum) reset("energy_full");

        // 2. NERVE
        if (d.nerve.current >= d.nerve.maximum && !user.nerve_full) push("🧠 Nerve Full", "Ayo Crimes!", "nerve_full");
        else if (d.nerve.current < d.nerve.maximum) reset("nerve_full");

        // 3. HAPPY
        if (d.happy.current >= d.happy.maximum && !user.happy_full) push("😊 Happy Full", "Happiness maksimal.", "happy_full");
        else if (d.happy.current < d.happy.maximum) reset("happy_full");

        // 4. LIFE
        if (d.life.current >= d.life.maximum && !user.life_full) push("❤️ Life Full", "Darah penuh.", "life_full");
        else if (d.life.current < d.life.maximum) reset("life_full");

        // 5. TRAVEL
        if (d.travel.time_left === 0 && d.travel.destination !== "Torn" && !user.travel_landed) push("✈️ Arrived!", `Sampai di ${d.travel.destination}`, "travel_landed");
        else if (d.travel.time_left > 0) reset("travel_landed");

        // 6. DRUGS
        if (d.cooldowns.drug === 0 && !user.drugs_ready) push("💊 Drug Ready", "Bisa pakai Xanax lagi.", "drugs_ready");
        else if (d.cooldowns.drug > 0) reset("drugs_ready");

        // 7. BOOSTER
        if (d.cooldowns.booster === 0 && !user.booster_ready) push("🍬 Booster Ready", "Cooldown habis.", "booster_ready");
        else if (d.cooldowns.booster > 0) reset("booster_ready");

        // 8. MEDICAL
        if (d.cooldowns.medical === 0 && !user.medical_out) push("🏥 Keluar RS", "Kamu sudah sehat.", "medical_out");
        else if (d.cooldowns.medical > 0) reset("medical_out");

        // 9. JAIL
        if (d.cooldowns.jail === 0 && !user.jail_free) push("🚓 Bebas Penjara", "Sudah bebas!", "jail_free");
        else if (d.cooldowns.jail > 0) reset("jail_free");

        // 10. EDUCATION
        if (d.education_time_left === 0 && !user.edu_complete) push("🎓 Class Finished", "Kuliah selesai.", "edu_complete");
        else if (d.education_time_left > 0) reset("edu_complete");

        // 11. CHAIN
        if (d.chain && d.chain.current > 0 && d.chain.timeout <= 90 && !user.chain_warning) {
          push("🔗 CHAIN ALERT", `Chain sisa ${d.chain.timeout} detik!`, "chain_warning");
        } else if (d.chain && (d.chain.timeout > 90 || d.chain.current === 0)) {
          reset("chain_warning");
        }

      } catch (err) {
        console.error(`❌ Error ID ${user.id}:`, err);
      }
    }

    // KIRIM NOTIFIKASI
    if (notifications.length > 0) {
      console.log(`🚀 Mengirim ${notifications.length} notifikasi...`);
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifications),
      });
    }

    // UPDATE DATABASE (Sekarang ke tabel user_notifications)
    for (const update of updates) {
      const { user_id, ...fields } = update;
      await supabaseClient
        .from('user_notifications')
        .update(fields)
        .eq('user_id', user_id);
    }

    return new Response(`Sukses!`, { status: 200 });

  } catch (error) {
    console.error("❌ FATAL:", error.message);
    return new Response(error.message, { status: 500 });
  }
})