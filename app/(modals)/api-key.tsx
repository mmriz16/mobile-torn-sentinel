import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/src/components/ui/card";
import { GridPattern } from "@/src/components/ui/grid-pattern";
import { supabase } from "@/src/services/supabase";

import Logo from "@/assets/logo.svg";

// Helper function to save API key locally (handles web vs native)
async function saveApiKey(key: string): Promise<void> {
    if (Platform.OS === "web") {
        // Use localStorage on web with try-catch for "The operation is insecure" error
        try {
            localStorage.setItem("tornApiKey", key);
        } catch (error) {
            console.warn("localStorage not available:", error);
        }
    } else {
        await SecureStore.setItemAsync("tornApiKey", key);
    }
}

// Helper: Timeout wrapper for any promise
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(errorMessage)), ms)
        )
    ]);
}

export default function ApiKey() {
    const [apiKey, setApiKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const isSubmitting = useRef(false); // Prevent double submission

    const handleContinue = async () => {
        // Prevent double submission
        if (isSubmitting.current || isLoading) {
            console.log("⚠️ Already submitting, ignoring...");
            return;
        }

        if (!apiKey.trim()) {
            setError("Please enter your API key");
            return;
        }

        isSubmitting.current = true;
        setIsLoading(true);
        setError(null);
        setStatusMessage("Memvalidasi API Key...");

        try {
            // 1. Validate API Key with Torn API (20 second timeout)
            setStatusMessage("Menghubungi Torn API...");
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const response = await fetch(
                `https://api.torn.com/user/?selections=profile&key=${apiKey.trim()}`,
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);

            const data = await response.json();

            if (data.error) {
                setError("API Key tidak valid atau salah.");
                setIsLoading(false);
                isSubmitting.current = false;
                return;
            }

            console.log("✅ API Key valid untuk:", data.name);

            // --- MULAI PROSES REGISTRASI SUPABASE ---

            // 2. Minta Izin & Ambil Token Notifikasi HP
            let pushToken: string | null = null;

            if (Platform.OS !== "web") {
                setStatusMessage("Meminta izin notifikasi...");
                try {
                    const { status: existingStatus } = await Notifications.getPermissionsAsync();
                    let finalStatus = existingStatus;

                    // Kalau belum ada izin, minta izin dulu
                    if (existingStatus !== "granted") {
                        const { status } = await Notifications.requestPermissionsAsync();
                        finalStatus = status;
                    }

                    if (finalStatus === "granted") {
                        setStatusMessage("Mengambil push token...");

                        // Ambil token dengan timeout 10 detik
                        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
                        try {
                            const tokenData = await withTimeout(
                                Notifications.getExpoPushTokenAsync({ projectId }),
                                10000,
                                "Timeout mendapatkan push token"
                            );
                            pushToken = tokenData.data;
                            console.log("✅ Token HP:", pushToken);
                        } catch (tokenError: any) {
                            console.warn("⚠️ Gagal mendapatkan push token:", tokenError?.message);
                            console.warn("Lanjut tanpa push token.");
                        }
                    } else {
                        console.log("⚠️ Izin notifikasi ditolak user.");
                    }
                } catch (pushError: any) {
                    // Firebase/FCM belum dikonfigurasi - lanjut tanpa push token
                    console.warn("⚠️ Error permission notifikasi:", pushError?.message);
                }
            }

            // 3. Panggil Fungsi Aman (RPC)
            setStatusMessage("Menyimpan ke cloud...");
            const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
            const supabaseConfigured = !!supabaseUrl && supabaseUrl !== "";

            if (supabaseConfigured) {
                try {
                    const { error: supabaseError } = await supabase.rpc('register_secure_user', {
                        p_id: data.player_id,
                        p_username: data.name,
                        p_faction_id: data.faction?.faction_id || 0,
                        p_push_token: pushToken,
                        p_api_key: apiKey.trim()
                    });

                    if (supabaseError) {
                        console.error("⚠️ Gagal simpan ke Supabase:", supabaseError);
                    } else {
                        console.log("✅ Data tersimpan di Supabase! Push token:", pushToken ? "Ada" : "NULL");
                    }
                } catch (supabaseNetworkError: any) {
                    console.warn("⚠️ Supabase network error:", supabaseNetworkError?.message);
                    console.warn("Lanjut tanpa cloud sync");
                }
            } else {
                console.warn("⚠️ Supabase tidak terkonfigurasi, skip cloud sync");
            }

            // --- SELESAI PROSES SUPABASE ---

            // 4. Simpan API Key di HP (Local) & Pindah ke Home
            setStatusMessage("Menyimpan API key...");
            await saveApiKey(apiKey.trim());

            console.log("✅ Navigating to home...");
            setStatusMessage(null);

            // Navigate to home
            router.replace("/(tabs)/home");

        } catch (err: any) {
            console.error("❌ Error details:", err);
            console.error("❌ Error message:", err?.message);

            if (err.name === "AbortError") {
                setError("Request timeout. Coba lagi dalam beberapa saat.");
            } else if (err?.message?.includes("push token")) {
                setError("Gagal mendapatkan push token. Coba restart aplikasi.");
            } else if (err?.message?.includes("Timeout")) {
                setError("Koneksi timeout. Periksa koneksi internet Anda.");
            } else if (err?.message?.includes("supabase") || err?.message?.includes("fetch")) {
                setError("Gagal koneksi ke server. Periksa koneksi internet Anda.");
            } else {
                setError(`Terjadi kesalahan: ${err?.message || "Jaringan tidak tersedia"}`);
            }
        } finally {
            setIsLoading(false);
            setStatusMessage(null);
            isSubmitting.current = false;
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            {/* Added KeyboardAvoidingView to handle keyboard toggle */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <View className="flex-1 gap-2.5 p-4">
                    <View className="flex flex-1 items-center justify-center gap-2.5">
                        <Logo className="w-[60px] h-[60px] aspect-square" />
                        <View className="flex items-center gap-1">
                            <Text className="text-white text-4xl font-extrabold font-display">Torn Sentinel</Text>
                            <Text className="text-white font-mono uppercase text-[8px]">Your Silent Watcher in Torn City</Text>
                        </View>
                    </View>
                    <Card className="mt-auto">
                        <Text className="text-tactical-700 uppercase font-sans-extrabold text-sm p-4 border-b border-tactical-800">Api Configuration</Text>
                        <View className="p-4 gap-2.5">
                            <Text className="text-white text-[8px] font-sans uppercase">torn api key</Text>
                            <TextInput
                                placeholder="Enter your Torn API key"
                                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                className="text-white font-sans text-[12px] bg-tactical-950 border border-tactical-800 p-2.5 rounded-[2px] outline-none focus:border-tactical-700"
                                value={apiKey}
                                onChangeText={(text) => {
                                    setApiKey(text);
                                    setError(null);
                                }}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!isLoading}
                            />
                            {error && (
                                <Text className="text-accent-red font-sans text-[10px]">{error}</Text>
                            )}
                            {statusMessage && (
                                <Text className="text-accent-yellow font-sans text-[10px]">{statusMessage}</Text>
                            )}
                            <Text className="text-white/50 font-sans text-[10px]">Key is stored locally and synced to cloud for notifications. We recommend using a Public key or higher from Torn Preferences.</Text>
                        </View>
                    </Card>
                    <Pressable
                        onPress={handleContinue}
                        disabled={isLoading}
                        className="bg-accent-yellow border justify-center items-center p-4 rounded-lg overflow-hidden disabled:opacity-50"
                    >
                        {isLoading ? (
                            <View className="flex-row items-center gap-2">
                                <ActivityIndicator color="#fff" />
                                <Text className="uppercase font-mono-bold text-sm text-white">Processing...</Text>
                            </View>
                        ) : (
                            <Text className="uppercase font-mono-bold text-sm text-white">Continue</Text>
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}