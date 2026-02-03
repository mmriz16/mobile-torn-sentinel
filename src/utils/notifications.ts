import notifee, { AndroidImportance, TriggerType } from '@notifee/react-native';
import { Platform } from 'react-native';

// Definisi Tipe Data yang kompatibel dengan TornUserData dari torn-api.ts
interface TornData {
    travel?: {
        time_left: number;
        destination: string;
        departed_at?: number;
        arrival_at?: number;
    } | null;
    bars?: {
        energy?: { full_time?: number; current?: number; maximum?: number };
        nerve?: { full_time?: number; current?: number; maximum?: number };
        life?: { full_time?: number; current?: number; maximum?: number };
        happy?: { current?: number; maximum?: number; full_time?: number };
        chain?: { current?: number; max?: number; timeout?: number };
    };
    cooldowns?: { drug?: number; booster?: number; medical?: number };
    profile?: { status?: { state?: string; until?: number | null } };
    education?: { current?: { id?: number; until?: number } | null };
}

// Channel ID untuk notifikasi - harus sama dengan yang dikirim dari server
export const NOTIFICATION_CHANNEL_ID = 'torn-sentinel-alerts';

// --- Helper: Setup Notifee Channel ---
export async function setupNotificationChannel() {
    if (Platform.OS === 'android') {
        await notifee.createChannel({
            id: NOTIFICATION_CHANNEL_ID,
            name: 'Torn Sentinel Alerts',
            importance: AndroidImportance.HIGH, // HIGH = heads-up popup
            vibration: true,
            lightColor: '#FF0000',
            sound: 'default',
        });
        console.log('✅ Android notification channel created (Notifee)');
    }
}

// Helper: Jadwalkan Notifikasi dengan Notifee
async function scheduleItem(title: string, body: string, triggerSeconds: number, iconName: string = 'ic_launcher') {
    if (triggerSeconds > 1) { // Hanya jadwalkan jika waktu > 1 detik
        try {
            await notifee.createTriggerNotification(
                {
                    title,
                    body,
                    android: {
                        channelId: NOTIFICATION_CHANNEL_ID,
                        smallIcon: iconName, // Custom ICON support!
                        color: '#FCF3EC', // Branding color
                        pressAction: {
                            id: 'default',
                        },
                    },
                },
                {
                    type: TriggerType.TIMESTAMP,
                    timestamp: Date.now() + (triggerSeconds * 1000), // Convert seconds to future milliseconds
                }
            );
        } catch (e) {
            console.warn(`Failed to schedule notification "${title}":`, e);
        }
    }
}

// --- FUNGSI UTAMA ---
export async function scheduleAllNotifications(data: TornData) {
    // Notifee supports both Android and iOS roughly the same way for triggers
    // but icons are Android specific.

    // 1. Bersihkan jadwal lama agar tidak duplikat
    await notifee.cancelAllNotifications();

    const now = Math.floor(Date.now() / 1000); // Waktu sekarang (detik)

    // --- A. TRAVEL (Landing) ---
    // API travel.time_left adalah detik sisa. Langsung pakai itu saja lebih aman.
    if (data.travel && data.travel.time_left > 0) {
        const timeLeft = data.travel.time_left;

        // Notif 1: Persiapan Mendarat (2 menit sebelum)
        if (timeLeft > 120) {
            await scheduleItem(
                "✈️ 2 Minutes to Landing!",
                `Prepare to land in ${data.travel.destination}.`,
                timeLeft - 120,
                "ic_notif_plane"
            );
        }

        // Notif 2: Pas Mendarat
        await scheduleItem(
            "🛬 Arrived!",
            `You just landed ${data.travel.destination}! grab your items, check prices, and plan your next flight before you waste time. `,
            timeLeft,
            "ic_notif_plane"
        );
    }

    // --- B. BARS (Energy, Nerve, Life) ---
    // API v2 menggunakan 'full_time' (dengan underscore)

    // ⚡ Energy
    const energyFullTime = data.bars?.energy?.full_time ?? 0;
    if (energyFullTime > 0) {
        const secondsLeft = energyFullTime - now;
        if (secondsLeft > 0) {
            await scheduleItem("⚡ Energy Full", "Your energy is capped right now—go train, hit, or do something before the regen gets wasted.", secondsLeft, "ic_notif_energy");
        }
    }

    // 🧠 Nerve
    const nerveFullTime = data.bars?.nerve?.full_time ?? 0;
    if (nerveFullTime > 0) {
        const secondsLeft = nerveFullTime - now;
        if (secondsLeft > 0) {
            await scheduleItem("🧠 Nerve Full", "Nerve is maxed out—perfect time to run a bunch of crimes and cash in the regen.", secondsLeft, "ic_notif_nerve");
        }
    }

    // ❤️ Life
    const lifeFullTime = data.bars?.life?.full_time ?? 0;
    if (lifeFullTime > 0) {
        const secondsLeft = lifeFullTime - now;
        if (secondsLeft > 0) {
            await scheduleItem("❤️ Life Full", "You're back at full health—no need to play it safe anymore, you're good to go.", secondsLeft, "ic_notif_heart");
        }
    }

    // 😄 Happy - Only schedule if happy is NOT full AND not on cooldown/incapacitated
    const happyCurrent = data.bars?.happy?.current ?? 0;
    const happyMax = data.bars?.happy?.maximum ?? 0;
    const isHospitalized = data.profile?.status?.state === "Hospital";
    const isJailed = data.profile?.status?.state === "Jail";
    const hasDrugCooldown = (data.cooldowns?.drug ?? 0) > 0;

    // Don't notify about happy ticker if user can't train/jump anyway
    if (happyCurrent < happyMax && happyMax > 0 && !hasDrugCooldown && !isHospitalized && !isJailed) {
        // Happy reset setiap :00, :15, :30, :45. Kita hitung detik menuju kelipatan 15 menit terdekat.
        const date = new Date();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        let nextTickSeconds = ((15 - (minutes % 15)) * 60) - seconds;
        if (nextTickSeconds <= 0) nextTickSeconds += 900; // Koreksi jika negatif

        await scheduleItem("😄 Happy Reset", "Happy ticker updated. You are clear to train or use items!", nextTickSeconds, "ic_notif_happy");
    }

    // --- C. COOLDOWNS ---

    // 💊 Drug
    const drugCooldown = data.cooldowns?.drug ?? 0;
    if (drugCooldown > 0) {
        await scheduleItem("💊 Drug Ready", "Drug cooldown is finally over—your next dose is available whenever you're ready.", drugCooldown, "ic_notif_drug");
    }

    // 🍬 Booster
    const boosterCooldown = data.cooldowns?.booster ?? 0;
    if (boosterCooldown > 0) {
        await scheduleItem("🍬 Booster Ready", "Booster cooldown is done—if you're stacking or preparing for war, you can use one again.", boosterCooldown, "ic_notif_booster");
    }

    // 🏥 Hospital - Ambil dari profile.status jika state = "Hospital"
    if (data.profile?.status?.state === "Hospital" && data.profile.status.until) {
        const secondsLeft = data.profile.status.until - now;
        if (secondsLeft > 0) {
            await scheduleItem("🏥 Out of Hospital", "You're out of the hospital—get back to your routine, or jump straight back into the action.", secondsLeft, "ic_notif_hospital");
        }
    }

    // ⚖️ Jail - Ambil dari profile.status jika state = "Jail"
    if (data.profile?.status?.state === "Jail" && data.profile.status.until) {
        const secondsLeft = data.profile.status.until - now;
        if (secondsLeft > 0) {
            await scheduleItem("⚖️ Free from Jail", "You're free again—go handle your stuff, and maybe keep a low profile for a bit.", secondsLeft, "ic_notif_jail");
        }
    }

    // --- D. EDUCATION ---
    const educationUntil = data.education?.current?.until ?? 0;
    if (educationUntil > 0) {
        const secondsLeft = educationUntil - now;
        if (secondsLeft > 0) {
            await scheduleItem("🎓 Education Complete", "Your education course just finished—enroll in the next one so you keep progressing nonstop.", secondsLeft, "ic_notif_book");
        }
    }

    // --- E. CHAIN ---
    const chainTimeout = data.bars?.chain?.timeout ?? 0;
    if (chainTimeout > 0) {
        // Ingatkan 90 detik sebelum putus
        const warningTime = chainTimeout - 90;
        if (warningTime > 0) {
            await scheduleItem("🔗 Chain Warning!", "Chain breaks in 90s!", warningTime, "ic_notif_chain");
        }
    }

    console.log(`✅ ${new Date().toLocaleTimeString()}: All notifications scheduled (Notifee).`);
}
