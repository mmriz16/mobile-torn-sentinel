import * as Notifications from 'expo-notifications';
import { TornUserData } from '../services/torn-api';

// Konfigurasi agar notifikasi muncul saat aplikasi dibuka
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerForPushNotificationsAsync() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    return finalStatus === 'granted';
}

// Helper untuk menjadwalkan notifikasi
async function scheduleItem(title: string, body: string, triggerSeconds: number) {
    // Hanya jadwalkan jika waktunya di masa depan (lebih dari 0 detik)
    if (triggerSeconds > 0) {
        await Notifications.scheduleNotificationAsync({
            content: { title, body, sound: true },
            trigger: {
                seconds: triggerSeconds,
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL
            },
        });
    }
}

// --- FUNGSI UTAMA: JADWALKAN SEMUANYA ---
export async function scheduleAllNotifications(userData: TornUserData) {
    // 1. Reset semua jadwal lama
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = Date.now() / 1000; // Waktu sekarang (Unix timestamp detik)

    // --- A. TRAVEL (2 Menit Sebelum Sampai) ---
    if (userData.travel && userData.travel.time_left > 0) {
        const secondsLeft = userData.travel.arrival_at - now;
        const warningTrigger = secondsLeft - 120; // 2 menit sebelum

        if (warningTrigger > 0) {
            await scheduleItem(
                "✈️ Preparing for Landing",
                `You will arrive in ${userData.travel.destination} in 2 minutes!`,
                warningTrigger
            );
        } else if (secondsLeft > 0) {
            await scheduleItem("🛬 Arrived!", `Welcome to ${userData.travel.destination}`, secondsLeft);
        }
    }

    // --- B. BARS (Energy, Nerve, Happy, Life) ---
    if (userData.bars) {
        // ⚡ Energy Full
        if (userData.bars.energy.full_time > now) {
            await scheduleItem(
                "⚡ Energy Full",
                "Your Energy bar is fully restored!",
                userData.bars.energy.full_time - now
            );
        }

        // 🧠 Nerve Full
        if (userData.bars.nerve.full_time > now) {
            await scheduleItem(
                "🧠 Nerve Full",
                "Your Nerve bar is ready for crimes!",
                userData.bars.nerve.full_time - now
            );
        }

        // 😄 Happy Full (BARU)
        if (userData.bars.happy.full_time > now) {
            await scheduleItem(
                "😄 Happy Full",
                "Your Happiness is fully restored! Time to train?",
                userData.bars.happy.full_time - now
            );
        }

        // ❤️ Life Full (BARU)
        if (userData.bars.life.full_time > now) {
            await scheduleItem(
                "❤️ Life Full",
                "Your Life is fully restored!",
                userData.bars.life.full_time - now
            );
        }
    }

    // --- C. COOLDOWNS (Drug, Booster, Medical, Jail) ---
    if (userData.cooldowns) {
        // 💊 Drug Ready
        if (userData.cooldowns.drug > 0) {
            await scheduleItem("💊 Drug Cooldown Ended", "You can take another Xanax now.", userData.cooldowns.drug);
        }

        // 🍬 Booster Ready
        if (userData.cooldowns.booster > 0) {
            await scheduleItem("🍬 Booster Cooldown Ended", "Ready to eat more candy!", userData.cooldowns.booster);
        }

        // 🏥 Medical Ended
        if (userData.cooldowns.medical > 0) {
            await scheduleItem("🏥 Hospital Timer Ended", "You are out of the hospital.", userData.cooldowns.medical);
        }

        // ⚖️ Jail Ended (BARU)
        if (userData.cooldowns.jail > 0) {
            await scheduleItem("⚖️ Free from Jail!", "You have been released from jail.", userData.cooldowns.jail);
        }
    }

    // --- D. EDUCATION ---
    if (userData.education?.current) {
        const secondsLeft = userData.education.current.until - now;
        if (secondsLeft > 0) {
            await scheduleItem("🎓 Education Complete", "You have finished your course!", secondsLeft);
        }
    }

    // --- E. CHAIN (Warning System) ---
    if (userData.bars?.chain?.timeout && userData.bars.chain.timeout > 0) {
        const warningTime = userData.bars.chain.timeout - 90; // 90 detik sebelum putus
        if (warningTime > 0) {
            await scheduleItem("🔗 Chain Warning!", "Your chain will break in 90 seconds!", warningTime);
        }
    }
}