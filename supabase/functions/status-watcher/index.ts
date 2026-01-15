// supabase/functions/status-watcher/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Interface untuk notification status dari tabel user_notifications
interface UserNotificationStatus {
  user_id: number;
  energy_full: boolean;
  nerve_full: boolean;
  happy_full: boolean;
  life_full: boolean;

  travel_landed: boolean;
  travel_soon: boolean;

  drugs_ready: boolean;
  booster_ready: boolean;
  medical_out: boolean;
  jail_free: boolean;
  edu_complete: boolean;
  chain_warning: boolean;
  test_notif: boolean;
}

// Interface untuk travel status dari tabel user_travel_status
interface UserTravelStatusCache {
  user_id: number;
  travel_state: string | null;
  travel_destination: string | null;
  travel_arrival: number | null; // Unix timestamp
  status_state: string | null;
  status_until: number | null;
  updated_at: string;
}

// Tipe minimal response Torn yang kamu pakai (biar akses lebih aman)
type TornUserResponse = {
  error?: any;

  energy?: { current: number; maximum: number };
  nerve?: { current: number; maximum: number };
  happy?: { current: number; maximum: number };
  life?: { current: number; maximum: number };

  travel?: { time_left: number; destination: string };

  cooldowns?: { drug: number; booster: number; medical: number; jail: number };

  education_time_left?: number;

  chain?: { current: number; timeout: number };

  status?: { state?: string; until?: number };
};

const TRAVEL_SOON_THRESHOLD_SECONDS = 120;
// Threshold: jika masih > 3 menit lagi, skip API call
const TRAVEL_SKIP_API_THRESHOLD_SECONDS = 180;

serve(async (_req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("🤖 Robot bangun. Memulai pengecekan...");

    // 1) Ambil data users dengan decrypted API key
    const { data: users, error: dbError } = await supabaseClient.rpc("get_decrypted_users");

    if (dbError) {
      console.error("❌ DB ERROR (users):", JSON.stringify(dbError));
      return new Response(JSON.stringify({ error: "DB Error", details: dbError }), { status: 500 });
    }

    if (!users || users.length === 0) {
      console.log("⚠️ Tidak ada user ditemukan.");
      return new Response("No users found", { status: 200 });
    }

    console.log(`📋 Ditemukan ${users.length} user(s)`);

    // 2) Ambil semua notification status dari tabel user_notifications
    const userIds = users.map((u: { id: number }) => u.id);
    const { data: notificationStatuses, error: notifError } = await supabaseClient
      .from("user_notifications")
      .select("*")
      .in("user_id", userIds);

    if (notifError) {
      console.error("❌ DB ERROR (user_notifications):", JSON.stringify(notifError));
      return new Response(JSON.stringify({ error: "DB Error", details: notifError }), { status: 500 });
    }

    // Map untuk lookup cepat
    const statusMap = new Map<number, UserNotificationStatus>();
    if (notificationStatuses) {
      for (const status of notificationStatuses as UserNotificationStatus[]) {
        statusMap.set(status.user_id, status);
      }
    }

    console.log(`📊 Ditemukan ${statusMap.size} notification status(es)`);

    // 3) SMART CACHING: Ambil travel status cache dari tabel user_travel_status
    const { data: travelStatuses, error: travelCacheError } = await supabaseClient
      .from("user_travel_status")
      .select("*")
      .in("user_id", userIds);

    if (travelCacheError) {
      console.error("❌ DB ERROR (user_travel_status):", JSON.stringify(travelCacheError));
      // Non-fatal, we can continue without cache
    }

    const travelCacheMap = new Map<number, UserTravelStatusCache>();
    if (travelStatuses) {
      for (const ts of travelStatuses as UserTravelStatusCache[]) {
        travelCacheMap.set(ts.user_id, ts);
      }
    }

    console.log(`✈️ Ditemukan ${travelCacheMap.size} travel cache(s)`);

    // Tambahkan priority: high dan channelId untuk heads-up popup notification di Android
    const notifications: {
      to: string;
      title: string;
      body: string;
      sound: string;
      priority: 'high' | 'normal' | 'default';
      channelId: string;
      _contentAvailable: boolean;
    }[] = [];

    let apiCallsSkipped = 0;
    let apiCallsMade = 0;

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
          console.log(`⚠️ User ${user.id} belum punya record di user_notifications, membuat...`);

          const { error: insertError } = await supabaseClient
            .from("user_notifications")
            .insert({ user_id: user.id });

          if (insertError) {
            console.error(`❌ Gagal membuat record untuk user ${user.id}:`, insertError.message);
          }

          // Skip dulu; akan diproses di run berikutnya (biar statusMap sinkron)
          continue;
        }

        // Helper push + update DB dulu untuk mencegah duplicate
        const push = async (
          title: string,
          body: string,
          dbField: keyof UserNotificationStatus
        ) => {
          const { error: updateError } = await supabaseClient
            .from("user_notifications")
            .update({ [dbField]: true })
            .eq("user_id", user.id);

          if (updateError) {
            console.error(`  ❌ GAGAL update ${String(dbField)} untuk user ${user.id}:`, updateError.message);
            return;
          }

          notifications.push({
            to: user.push_token,
            title,
            body,
            sound: "default",
            priority: "high",
            channelId: "torn-sentinel-alerts",
            _contentAvailable: true,
          });
          console.log(`  📤 PUSH: ${title} untuk user ${user.id} (DB updated)`);
        };

        const reset = async (dbField: keyof UserNotificationStatus) => {
          // Reset hanya jika flag sebelumnya true
          if (userStatus[dbField] === true) {
            const { error: resetError } = await supabaseClient
              .from("user_notifications")
              .update({ [dbField]: false })
              .eq("user_id", user.id);

            if (resetError) {
              console.error(`  ❌ GAGAL reset ${String(dbField)} untuk user ${user.id}:`, resetError.message);
            } else {
              console.log(`  🔄 RESET: ${String(dbField)} untuk user ${user.id}`);
            }
          }
        };

        console.log(`🔍 Checking user ${user.id}...`);

        // =============================================
        // SMART CACHING LOGIC: Check if we can skip API call
        // =============================================
        const cachedTravel = travelCacheMap.get(user.id);
        const nowUnix = Math.floor(Date.now() / 1000);

        // Calculate time left from cached arrival time
        let cachedTimeLeft = 0;
        if (cachedTravel?.travel_arrival && cachedTravel.travel_arrival > nowUnix) {
          cachedTimeLeft = cachedTravel.travel_arrival - nowUnix;
        }

        const isCurrentlyTraveling = cachedTimeLeft > 0;
        const shouldSkipApi = isCurrentlyTraveling && cachedTimeLeft > TRAVEL_SKIP_API_THRESHOLD_SECONDS;

        console.log(`  🧠 Cache: traveling=${isCurrentlyTraveling}, timeLeft=${cachedTimeLeft}s, skipApi=${shouldSkipApi}`);

        // =============================================
        // TRAVEL NOTIFICATIONS FROM CACHE (even if skipping API)
        // =============================================
        if (isCurrentlyTraveling) {
          const cachedDestination = cachedTravel?.travel_destination ?? "Unknown";

          // Landing soon (<= 2 minutes) - from cache
          if (cachedTimeLeft > 0 && cachedTimeLeft <= TRAVEL_SOON_THRESHOLD_SECONDS && !userStatus.travel_soon) {
            await push(
              "🛬 Landing soon",
              `Almost there—about ${cachedTimeLeft}s left to ${cachedDestination}. Get ready to buy/sell fast.`,
              "travel_soon"
            );
          }
        } else {
          // Not traveling - check if just landed (from cache)
          if (cachedTravel?.travel_destination &&
            cachedTravel.travel_destination !== "Torn" &&
            cachedTravel.travel_state === "Traveling" &&
            !userStatus.travel_landed) {
            // User was traveling but now time is up = just landed
            await push(
              "✈️ Arrived!",
              `You just landed in ${cachedTravel.travel_destination}—grab your items, check prices, and plan your next flight before you waste time.`,
              "travel_landed"
            );
          }
        }

        // 12) TEST NOTIFICATION (one-shot) - Checked BEFORE API Skip
        if (userStatus.test_notif === true) {
          const { error: testError } = await supabaseClient
            .from("user_notifications")
            .update({ test_notif: false })
            .eq("user_id", user.id);

          if (!testError) {
            notifications.push({
              to: user.push_token,
              title: "🔔 Test Notification",
              body: "Push notification berhasil!",
              sound: "default",
              priority: "high",
              channelId: "torn-sentinel-alerts",
              _contentAvailable: true,
            });
            console.log(`  🧪 TEST: Sending test notification untuk user ${user.id}`);
          } else {
            console.error(`  ❌ GAGAL reset test_notif untuk user ${user.id}:`, testError.message);
          }
        }

        // =============================================
        // SKIP API CALL if user is mid-flight (> 3 min left)
        // =============================================
        if (shouldSkipApi) {
          console.log(`  ⏭️ SKIPPING API call - user in flight, ${cachedTimeLeft}s remaining`);
          apiCallsSkipped++;
          continue;
        }

        // =============================================
        // HIT TORN API (for non-traveling or near-landing users)
        // =============================================
        apiCallsMade++;
        const res = await fetch(
          `https://api.torn.com/user/?selections=bars,travel,cooldowns,education,profile&key=${apiKey}`
        );
        const d = (await res.json()) as TornUserResponse;

        if (d?.error) {
          console.error(`⚠️ Torn API Error ID ${user.id}:`, d.error);
          continue;
        }

        // ----- LOGIKA PENGECEKAN (dari API) -----

        // 1) ENERGY
        if ((d.energy?.current ?? 0) >= (d.energy?.maximum ?? 0) && !userStatus.energy_full) {
          await push(
            "⚡ Energy Full",
            "Your energy is capped right now—go train, hit, or do something before the regen gets wasted.",
            "energy_full"
          );
        } else if ((d.energy?.current ?? 0) < (d.energy?.maximum ?? 0)) {
          await reset("energy_full");
        }

        // 2) NERVE
        if ((d.nerve?.current ?? 0) >= (d.nerve?.maximum ?? 0) && !userStatus.nerve_full) {
          await push(
            "🧠 Nerve Full",
            "Nerve is maxed out—perfect time to run a bunch of crimes and cash in the regen.",
            "nerve_full"
          );
        } else if ((d.nerve?.current ?? 0) < (d.nerve?.maximum ?? 0)) {
          await reset("nerve_full");
        }

        // 3) HAPPY
        if ((d.happy?.current ?? 0) >= (d.happy?.maximum ?? 0) && !userStatus.happy_full) {
          await push(
            "😊 Happy Full",
            "Happy is topped up—if you've been waiting to train, this is your moment to make it count.",
            "happy_full"
          );
        } else if ((d.happy?.current ?? 0) < (d.happy?.maximum ?? 0)) {
          await reset("happy_full");
        }

        // 4) LIFE
        if ((d.life?.current ?? 0) >= (d.life?.maximum ?? 0) && !userStatus.life_full) {
          await push(
            "❤️ Life Full",
            "You're back at full health—no need to play it safe anymore, you're good to go.",
            "life_full"
          );
        } else if ((d.life?.current ?? 0) < (d.life?.maximum ?? 0)) {
          await reset("life_full");
        }

        // 5) TRAVEL (from fresh API data)
        const travelTimeLeft = d.travel?.time_left ?? 0;
        const travelDestination = d.travel?.destination ?? "Unknown";

        console.log(
          `  ✈️ Travel (API) user ${user.id}: time_left=${travelTimeLeft}, destination=${travelDestination}, soon=${userStatus.travel_soon}, landed=${userStatus.travel_landed}`
        );

        // 5A) Landing soon (<= 2 minutes) - from API
        if (
          travelTimeLeft > 0 &&
          travelTimeLeft <= TRAVEL_SOON_THRESHOLD_SECONDS &&
          !userStatus.travel_soon
        ) {
          await push(
            "🛬 Landing soon",
            `Almost there—about ${travelTimeLeft}s left to ${travelDestination}. Get ready to buy/sell fast.`,
            "travel_soon"
          );
        } else if (travelTimeLeft === 0 || travelTimeLeft > TRAVEL_SOON_THRESHOLD_SECONDS) {
          await reset("travel_soon");
        }

        // 5B) Landed (abroad only) - from API
        if (travelTimeLeft === 0 && travelDestination !== "Torn" && !userStatus.travel_landed) {
          await push(
            "✈️ Arrived!",
            `You just landed in ${travelDestination}—grab your items, check prices, and plan your next flight before you waste time.`,
            "travel_landed"
          );
        } else if (travelTimeLeft > 0) {
          await reset("travel_landed");
        }

        // 6) DRUGS
        if ((d.cooldowns?.drug ?? 0) === 0 && !userStatus.drugs_ready) {
          await push(
            "💊 Drug Ready",
            "Drug cooldown is finally over—your next dose is available whenever you're ready.",
            "drugs_ready"
          );
        } else if ((d.cooldowns?.drug ?? 0) > 0) {
          await reset("drugs_ready");
        }

        // 7) BOOSTER
        if ((d.cooldowns?.booster ?? 0) === 0 && !userStatus.booster_ready) {
          await push(
            "🍬 Booster Ready",
            "Booster cooldown is done—if you're stacking or preparing for war, you can use one again.",
            "booster_ready"
          );
        } else if ((d.cooldowns?.booster ?? 0) > 0) {
          await reset("booster_ready");
        }

        // 8) MEDICAL
        if ((d.cooldowns?.medical ?? 0) === 0 && !userStatus.medical_out) {
          await push(
            "🏥 Out of Medical",
            "You're out of the hospital—get back to your routine, or jump straight back into the action.",
            "medical_out"
          );
        } else if ((d.cooldowns?.medical ?? 0) > 0) {
          await reset("medical_out");
        }

        // 9) JAIL
        if ((d.cooldowns?.jail ?? 0) === 0 && !userStatus.jail_free) {
          await push(
            "🚓 Out of Jail",
            "You're free again—go handle your stuff, and maybe keep a low profile for a bit.",
            "jail_free"
          );
        } else if ((d.cooldowns?.jail ?? 0) > 0) {
          await reset("jail_free");
        }

        // 10) EDUCATION
        if ((d.education_time_left ?? 0) === 0 && !userStatus.edu_complete) {
          await push(
            "🎓 Class Finished",
            "Your education course just finished—enroll in the next one so you keep progressing nonstop.",
            "edu_complete"
          );
        } else if ((d.education_time_left ?? 0) > 0) {
          await reset("edu_complete");
        }

        // 11) CHAIN
        if ((d.chain?.current ?? 0) > 0 && (d.chain?.timeout ?? 9999) <= 90 && !userStatus.chain_warning) {
          await push(
            "🔗 CHAIN ALERT",
            `Chain pace is dropping—hits within ${d.chain?.timeout ?? 0} to stay on track, so let's push it.`,
            "chain_warning"
          );
        } else if ((d.chain?.timeout ?? 9999) > 90 || (d.chain?.current ?? 0) === 0) {
          await reset("chain_warning");
        }



        // 13) SYNC TRAVEL STATUS to user_travel_status table (UPDATE CACHE)
        try {
          const travelState =
            travelTimeLeft > 0 ? "Traveling" : travelDestination !== "Torn" ? "Abroad" : "Okay";

          const { error: travelSyncError } = await supabaseClient.rpc("upsert_user_travel_status", {
            p_user_id: user.id,
            p_travel_state: travelState,
            p_travel_destination: travelDestination || null,
            p_travel_arrival: travelTimeLeft > 0 ? Math.floor(Date.now() / 1000) + travelTimeLeft : null,
            p_status_state: d.status?.state ?? null,
            p_status_until: d.status?.until ?? null,
          });

          if (travelSyncError) {
            console.error(`  ❌ Travel sync error for user ${user.id}:`, travelSyncError.message);
          } else {
            console.log(`  ✈️ Travel cache updated for user ${user.id}: ${travelState}`);
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
      const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifications),
      });

      const pushResult = await pushRes.json();
      console.log(`📨 Push result:`, JSON.stringify(pushResult));
    } else {
      console.log("📭 Tidak ada notifikasi untuk dikirim");
    }

    console.log(`📊 Stats: API calls made=${apiCallsMade}, skipped=${apiCallsSkipped}`);
    console.log("🎉 Status watcher selesai!");
    return new Response(`Sukses! Notif: ${notifications.length}, API: ${apiCallsMade}, Skipped: ${apiCallsSkipped}`, { status: 200 });
  } catch (error: any) {
    console.error("❌ FATAL:", error?.message ?? error);
    return new Response(error?.message ?? "Fatal error", { status: 500 });
  }
});