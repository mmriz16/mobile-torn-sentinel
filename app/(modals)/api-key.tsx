import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../src/components/ui/card";
import { GridPattern } from "../../src/components/ui/grid-pattern";
import { supabase } from "../../src/services/supabase";

import Logo from "../../assets/logo.svg";

// Helper function to save API key locally (handles web vs native)
async function saveApiKey(key: string): Promise<void> {
    if (Platform.OS === "web") {
        localStorage.setItem("tornApiKey", key);
    } else {
        await SecureStore.setItemAsync("tornApiKey", key);
    }
}

export default function ApiKey() {
    const [apiKey, setApiKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleContinue = async () => {
        if (!apiKey.trim()) {
            setError("Please enter your API key");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // 1. Validate API Key with Torn API
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(
                `https://api.torn.com/user/?selections=profile&key=${apiKey.trim()}`,
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);

            const data = await response.json();

            if (data.error) {
                setError("API Key tidak valid atau salah.");
                setIsLoading(false);
                return;
            }

            // --- MULAI PROSES REGISTRASI SUPABASE ---

            // 2. Minta Izin & Ambil Token Notifikasi HP
            let pushToken: string | null = null;

            if (Platform.OS !== "web") {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;

                // Kalau belum ada izin, minta izin dulu
                if (existingStatus !== "granted") {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }

                if (finalStatus === "granted") {
                    // Ambil token
                    const tokenData = await Notifications.getExpoPushTokenAsync();
                    pushToken = tokenData.data;
                    console.log("Token HP:", pushToken);
                } else {
                    console.log("Izin notifikasi ditolak user.");
                }
            }

            // 3. Panggil Fungsi Aman (RPC)
            // Kita tidak insert tabel langsung, tapi lewat fungsi
            const { error: supabaseError } = await supabase.rpc('register_secure_user', {
                p_id: data.player_id,
                p_username: data.name,
                p_faction_id: data.faction?.faction_id || 0,
                p_push_token: pushToken,
                p_api_key: apiKey.trim() // Kirim API Key asli, nanti database yang mengenkripsinya
            });

            if (supabaseError) {
                console.error("Gagal simpan Secure User:", supabaseError);
                // Masih bisa lanjut login meski Supabase gagal
            } else {
                console.log("✅ Data Terenkripsi tersimpan di Supabase!");
            }

            // --- SELESAI PROSES SUPABASE ---

            // 4. Simpan API Key di HP (Local) & Pindah ke Home
            await saveApiKey(apiKey.trim());

            // Navigate to home
            router.replace("/(tabs)");

        } catch (err: any) {
            console.error("Error:", err);
            if (err.name === "AbortError") {
                setError("Request timeout. Please try again.");
            } else {
                setError("Terjadi kesalahan jaringan.");
            }
        }

        setIsLoading(false);
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
                            <Text className="text-white/50 font-sans text-[10px]">Key is stored locally and synced to cloud for notifications. We recommend using a Public key or higher from Torn Preferences.</Text>
                        </View>
                    </Card>
                    <Pressable
                        onPress={handleContinue}
                        disabled={isLoading}
                        className="bg-accent-yellow border justify-center items-center p-4 rounded-lg overflow-hidden disabled:opacity-50"
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="uppercase font-mono-bold text-sm text-white">Continue</Text>
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}