// supabase/functions/status-watcher/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Interface untuk notification status dari tabel user_notifications
interface UserNotificationStatus {
  user_id: number;
  energy_full: boolean;
  nerve_full: boolean;
  happy_full: boolean;
  life_full: boolean;
  travel_landed: boolean;
  drugs_ready: boolean;
  booster_ready: boolean;
  medical_out: boolean;
  jail_free: boolean;
  edu_complete: boolean;
  chain_warning: boolean;
  test_notif: boolean;
}

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log("🤖 Robot bangun. Memulai pengecekan...");

    // 1. Ambil data users dengan decrypted API key
    const { data: users, error: dbError } = await supabaseClient.rpc('get_decrypted_users');

    if (dbError) {
      console.error("❌ DB ERROR (users):", JSON.stringify(dbError));
      return new Response(JSON.stringify({ error: "DB Error", details: dbError }), { status: 500 });
    }

    if (!users || users.length === 0) {
      console.log("⚠️ Tidak ada user ditemukan.");
      return new Response("No users found", { status: 200 });
    }

    console.log(`📋 Ditemukan ${users.length} user(s)`);

    // 2. Ambil semua notification status dari tabel user_notifications
    const userIds = users.map((u: { id: number }) => u.id);
    const { data: notificationStatuses, error: notifError } = await supabaseClient
      .from('user_notifications')
      .select('*')
      .in('user_id', userIds);

    if (notifError) {
      console.error("❌ DB ERROR (user_notifications):", JSON.stringify(notifError));
      return new Response(JSON.stringify({ error: "DB Error", details: notifError }), { status: 500 });
    }

    // Buat map untuk lookup cepat
    const statusMap = new Map<number, UserNotificationStatus>();
    if (notificationStatuses) {
      for (const status of notificationStatuses) {
        statusMap.set(status.user_id, status);
      }
    }

    console.log(`📊 Ditemukan ${statusMap.size} notification status(es)`);

    const notifications: { to: string; title: string; body: string; sound: string }[] = [];

    for (const user of users) {
      try {
        const apiKey = user.decrypted_key;
        if (!apiKey) {
          console.log(`⚠️ User ${user.id} tidak punya API key`);
          continue;
        }
        if (!user.push_token) {
          console.log(`⚠️ User ${user.id} tidak punya push_token`);
          continue;
        }

        // Ambil notification status untuk user ini
        const userStatus = statusMap.get(user.id);
        if (!userStatus) {
          console.log(`⚠️ User ${user.id} tidak punya record di user_notifications, membuat...`);
          // Auto-create record jika belum ada
          const { error: insertError } = await supabaseClient
            .from('user_notifications')
            .insert({ user_id: user.id });
          if (insertError) {
            console.error(`❌ Gagal membuat record untuk user ${user.id}:`, insertError.message);
          }
          continue; // Skip user ini, akan diproses di run berikutnya
        }

        const res = await fetch(`https://api.torn.com/user/?selections=bars,travel,cooldowns,education,profile&key=${apiKey}`);
        const d = await res.json();

        if (d.error) {
          console.error(`⚠️ Torn API Error ID ${user.id}:`, d.error);
          continue;
        }

        // Helper untuk memasukkan antrian notifikasi dan UPDATE DATABASE SEGERA
        // Ini mencegah race condition dengan memastikan flag di-update sebelum notifikasi dikirim
        const push = async (title: string, body: string, dbField: keyof UserNotificationStatus) => {
          // UPDATE DATABASE DULU untuk mencegah duplicate
          const { error: updateError } = await supabaseClient
            .from('user_notifications')
            .update({ [dbField]: true })
            .eq('user_id', user.id);

          if (updateError) {
            console.error(`  ❌ GAGAL update ${dbField} untuk user ${user.id}:`, updateError.message);
            return; // Jangan kirim notifikasi jika update gagal
          }

          // Baru tambahkan ke queue notifikasi setelah update berhasil
          notifications.push({ to: user.push_token, title, body, sound: 'default' });
          console.log(`  📤 PUSH: ${title} untuk user ${user.id} (DB updated)`);
        };

        const reset = async (dbField: keyof UserNotificationStatus) => {
          // Hanya reset jika status di DB saat ini adalah true
          if (userStatus[dbField] === true) {
            const { error: resetError } = await supabaseClient
              .from('user_notifications')
              .update({ [dbField]: false })
              .eq('user_id', user.id);

            if (resetError) {
              console.error(`  ❌ GAGAL reset ${dbField} untuk user ${user.id}:`, resetError.message);
            } else {
              console.log(`  🔄 RESET: ${dbField} untuk user ${user.id}`);
            }
          }
        };

        console.log(`🔍 Checking user ${user.id}...`);

        // --- LOGIKA PENGECEKAN ---

        // 1. ENERGY
        if (d.energy.current >= d.energy.maximum && !userStatus.energy_full) await push("⚡ Energy Full", "Waktunya Gym!", "energy_full");
        else if (d.energy.current < d.energy.maximum) await reset("energy_full");

        // 2. NERVE
        if (d.nerve.current >= d.nerve.maximum && !userStatus.nerve_full) await push("🧠 Nerve Full", "Ayo Crimes!", "nerve_full");
        else if (d.nerve.current < d.nerve.maximum) await reset("nerve_full");

        // 3. HAPPY
        if (d.happy.current >= d.happy.maximum && !userStatus.happy_full) await push("😊 Happy Full", "Happiness maksimal.", "happy_full");
        else if (d.happy.current < d.happy.maximum) await reset("happy_full");

        // 4. LIFE
        if (d.life.current >= d.life.maximum && !userStatus.life_full) await push("❤️ Life Full", "Darah penuh.", "life_full");
        else if (d.life.current < d.life.maximum) await reset("life_full");

        // 5. TRAVEL
        if (d.travel.time_left === 0 && d.travel.destination !== "Torn" && !userStatus.travel_landed) await push("✈️ Arrived!", `Sampai di ${d.travel.destination}`, "travel_landed");
        else if (d.travel.time_left > 0) await reset("travel_landed");

        // 6. DRUGS
        if (d.cooldowns.drug === 0 && !userStatus.drugs_ready) await push("💊 Drug Ready", "Bisa pakai Xanax lagi.", "drugs_ready");
        else if (d.cooldowns.drug > 0) await reset("drugs_ready");

        // 7. BOOSTER
        if (d.cooldowns.booster === 0 && !userStatus.booster_ready) await push("🍬 Booster Ready", "Cooldown habis.", "booster_ready");
        else if (d.cooldowns.booster > 0) await reset("booster_ready");

        // 8. MEDICAL
        if (d.cooldowns.medical === 0 && !userStatus.medical_out) await push("🏥 Keluar RS", "Kamu sudah sehat.", "medical_out");
        else if (d.cooldowns.medical > 0) await reset("medical_out");

        // 9. JAIL
        if (d.cooldowns.jail === 0 && !userStatus.jail_free) await push("🚓 Bebas Penjara", "Sudah bebas!", "jail_free");
        else if (d.cooldowns.jail > 0) await reset("jail_free");

        // 10. EDUCATION
        if (d.education_time_left === 0 && !userStatus.edu_complete) await push("🎓 Class Finished", "Kuliah selesai.", "edu_complete");
        else if (d.education_time_left > 0) await reset("edu_complete");

        // 11. CHAIN
        if (d.chain && d.chain.current > 0 && d.chain.timeout <= 90 && !userStatus.chain_warning) {
          await push("🔗 CHAIN ALERT", `Chain sisa ${d.chain.timeout} detik!`, "chain_warning");
        } else if (d.chain && (d.chain.timeout > 90 || d.chain.current === 0)) {
          await reset("chain_warning");
        }

        // 12. TEST NOTIFICATION (One-shot: update dulu baru kirim)
        if (userStatus.test_notif === true) {
          // Update DB dulu
          const { error: testError } = await supabaseClient
            .from('user_notifications')
            .update({ test_notif: false })
            .eq('user_id', user.id);

          if (!testError) {
            notifications.push({ to: user.push_token, title: "🔔 Test Notification", body: "Push notification berhasil!", sound: 'default' });
            console.log(`  🧪 TEST: Sending test notification untuk user ${user.id}`);
          } else {
            console.error(`  ❌ GAGAL reset test_notif untuk user ${user.id}:`, testError.message);
          }
        }

        // 13. SYNC TRAVEL STATUS to user_travel_status table
        // This allows faction mates to see accurate travel times
        try {
          const travelState = d.travel.time_left > 0 ? 'Traveling' : (d.travel.destination !== 'Torn' ? 'Abroad' : 'Okay');
          const { error: travelSyncError } = await supabaseClient.rpc('upsert_user_travel_status', {
            p_user_id: user.id,
            p_travel_state: travelState,
            p_travel_destination: d.travel.destination || null,
            p_travel_arrival: d.travel.time_left > 0 ? Math.floor(Date.now() / 1000) + d.travel.time_left : null,
            p_status_state: d.status?.state || null,
            p_status_until: d.status?.until || null
          });

          if (travelSyncError) {
            console.error(`  ❌ Travel sync error for user ${user.id}:`, travelSyncError.message);
          } else {
            console.log(`  ✈️ Travel synced for user ${user.id}: ${travelState}`);
          }
        } catch (syncErr) {
          console.error(`  ❌ Travel sync exception for user ${user.id}:`, syncErr);
        }

      } catch (err) {
        console.error(`❌ Error ID ${user.id}:`, err);
      }
    }

    // KIRIM NOTIFIKASI
    if (notifications.length > 0) {
      console.log(`🚀 Mengirim ${notifications.length} notifikasi...`);
      const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifications),
      });
      const pushResult = await pushRes.json();
      console.log(`📨 Push result:`, JSON.stringify(pushResult));
    } else {
      console.log("📭 Tidak ada notifikasi untuk dikirim");
    }

    // Database updates sudah dilakukan langsung di push() dan reset() functions
    console.log("🎉 Status watcher selesai!");
    return new Response(`Sukses! Notif: ${notifications.length}`, { status: 200 });

  } catch (error) {
    console.error("❌ FATAL:", error.message);
    return new Response(error.message, { status: 500 });
  }
})