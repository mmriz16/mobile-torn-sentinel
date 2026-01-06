import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../src/components/ui/card";
import { GridPattern } from "../../src/components/ui/grid-pattern";

import Logo from "../../assets/logo.svg";

// Helper function to save API key (handles web vs native)
async function saveApiKey(key: string): Promise<void> {
    if (Platform.OS === "web") {
        localStorage.setItem("tornApiKey", key);
    } else {
        await SecureStore.setItemAsync("tornApiKey", key);
    }
}

// Validate API key by calling Torn API
async function validateApiKey(key: string): Promise<{ valid: boolean; error?: string; username?: string }> {
    try {
        console.log("Validating API key...");

        // Add timeout of 10 seconds
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`https://api.torn.com/user/?selections=basic&key=${key}`, {
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        console.log("API response:", data);

        if (data.error) {
            // Torn API returns error object when key is invalid
            return { valid: false, error: data.error.error || "Invalid API key" };
        }

        // Key is valid if we get user data
        if (data.player_id && data.name) {
            console.log("API key valid for user:", data.name);
            return { valid: true, username: data.name };
        }

        return { valid: false, error: "Unexpected response from API" };
    } catch (error: any) {
        console.error("API validation error:", error);
        if (error.name === "AbortError") {
            return { valid: false, error: "Request timeout. Please try again." };
        }
        return { valid: false, error: "Network error. Please check your connection." };
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

        const result = await validateApiKey(apiKey.trim());

        if (result.valid) {
            // Save the API key
            await saveApiKey(apiKey.trim());
            // Navigate to home
            router.replace("/(tabs)");
        } else {
            setError(result.error || "Invalid API key");
        }

        setIsLoading(false);
    };

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <View className="flex-1 gap-2.5 p-4">
                <View className="flex flex-1 items-center justify-center gap-2.5">
                    <Logo className="w-[60px] h-[60px] aspect-square" />
                    <View className="flex items-center gap-1">
                        <Text className="text-white text-4xl font-extrabold font-display">Torn Sentinel</Text>
                        <Text className="text-white font-mono uppercase text-[8px]">Your Silent Watcher in Torn City</Text>
                    </View>
                </View>
                <Card className="mt-auto">
                    <Text className="text-tactical-700 uppercase font-sans font-extrabold text-sm p-4 border-b border-tactical-800">Api Configuration</Text>
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
                        <Text className="text-white/50 font-sans text-[10px]">Key is stored locally in your browser. We recommend using a Public key or higher from Torn Preferences.</Text>
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
                        <Text className="uppercase font-mono font-bold text-sm text-white">Continue</Text>
                    )}
                </Pressable>
            </View>
        </SafeAreaView>
    );
}