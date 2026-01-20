import * as Notifications from 'expo-notifications';
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

// Konfigurasi Notifikasi (Foreground) - Only set on native platforms
if (Platform.OS !== 'web') {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

// Setup Android Notification Channel dengan importance MAX untuk heads-up popup
export async function setupNotificationChannel() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
            name: 'Torn Sentinel Alerts',
            importance: Notifications.AndroidImportance.MAX, // MAX = heads-up popup
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF0000',
            sound: 'default',
            enableVibrate: true,
            enableLights: true,
            showBadge: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
        console.log('✅ Android notification channel created with MAX importance');
    }
}

// Helper: Jadwalkan Notifikasi
async function scheduleItem(title: string, body: string, triggerSeconds: number) {
    if (triggerSeconds > 1) { // Hanya jadwalkan jika waktu > 1 detik
        await Notifications.scheduleNotificationAsync({
            content: { title, body, sound: 'default' },
            trigger: {
                seconds: triggerSeconds,
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL // Memastikan tipe trigger benar
            },
        });
    }
}

// --- FUNGSI UTAMA ---
export async function scheduleAllNotifications(data: TornData) {
    // Skip on web - expo-notifications scheduling is not supported
    if (Platform.OS === 'web') {
        console.log('⚠️ Notifications not supported on web platform');
        return;
    }

    // 1. Bersihkan jadwal lama agar tidak duplikat
    await Notifications.cancelAllScheduledNotificationsAsync();

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
                timeLeft - 120
            );
        }

        // Notif 2: Pas Mendarat
        await scheduleItem(
            "🛬 Arrived!",
            `You just landed ${data.travel.destination}! grab your items, check prices, and plan your next flight before you waste time. `,
            timeLeft
        );
    }

    // --- B. BARS (Energy, Nerve, Life) ---
    // API v2 menggunakan 'full_time' (dengan underscore)

    // ⚡ Energy
    const energyFullTime = data.bars?.energy?.full_time ?? 0;
    if (energyFullTime > 0) {
        const secondsLeft = energyFullTime - now;
        if (secondsLeft > 0) {
            await scheduleItem("⚡ Energy Full", "Your energy is capped right now—go train, hit, or do something before the regen gets wasted.", secondsLeft);
        }
    }

    // 🧠 Nerve
    const nerveFullTime = data.bars?.nerve?.full_time ?? 0;
    if (nerveFullTime > 0) {
        const secondsLeft = nerveFullTime - now;
        if (secondsLeft > 0) {
            await scheduleItem("🧠 Nerve Full", "Nerve is maxed out—perfect time to run a bunch of crimes and cash in the regen.", secondsLeft);
        }
    }

    // ❤️ Life
    const lifeFullTime = data.bars?.life?.full_time ?? 0;
    if (lifeFullTime > 0) {
        const secondsLeft = lifeFullTime - now;
        if (secondsLeft > 0) {
            await scheduleItem("❤️ Life Full", "You're back at full health—no need to play it safe anymore, you're good to go.", secondsLeft);
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

        await scheduleItem("😄 Happy Reset", "Happy ticker updated. You are clear to train or use items!", nextTickSeconds);
    }

    // --- C. COOLDOWNS ---

    // 💊 Drug
    const drugCooldown = data.cooldowns?.drug ?? 0;
    if (drugCooldown > 0) {
        await scheduleItem("💊 Drug Ready", "Drug cooldown is finally over—your next dose is available whenever you're ready.", drugCooldown);
    }

    // 🍬 Booster
    const boosterCooldown = data.cooldowns?.booster ?? 0;
    if (boosterCooldown > 0) {
        await scheduleItem("🍬 Booster Ready", "Booster cooldown is done—if you're stacking or preparing for war, you can use one again.", boosterCooldown);
    }

    // 🏥 Hospital - Ambil dari profile.status jika state = "Hospital"
    if (data.profile?.status?.state === "Hospital" && data.profile.status.until) {
        const secondsLeft = data.profile.status.until - now;
        if (secondsLeft > 0) {
            await scheduleItem("🏥 Out of Hospital", "You're out of the hospital—get back to your routine, or jump straight back into the action.", secondsLeft);
        }
    }

    // ⚖️ Jail - Ambil dari profile.status jika state = "Jail"
    if (data.profile?.status?.state === "Jail" && data.profile.status.until) {
        const secondsLeft = data.profile.status.until - now;
        if (secondsLeft > 0) {
            await scheduleItem("⚖️ Free from Jail", "You're free again—go handle your stuff, and maybe keep a low profile for a bit.", secondsLeft);
        }
    }

    // --- D. EDUCATION ---
    const educationUntil = data.education?.current?.until ?? 0;
    if (educationUntil > 0) {
        const secondsLeft = educationUntil - now;
        if (secondsLeft > 0) {
            await scheduleItem("🎓 Education Complete", "Your education course just finished—enroll in the next one so you keep progressing nonstop.", secondsLeft);
        }
    }

    // --- E. CHAIN ---
    const chainTimeout = data.bars?.chain?.timeout ?? 0;
    if (chainTimeout > 0) {
        // Ingatkan 90 detik sebelum putus
        const warningTime = chainTimeout - 90;
        if (warningTime > 0) {
            await scheduleItem("🔗 Chain Warning!", "Chain breaks in 90s!", warningTime);
        }
    }

    console.log(`✅ ${new Date().toLocaleTimeString()}: All notifications scheduled.`);
}