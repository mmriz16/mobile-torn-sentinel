import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
  JetBrainsMono_800ExtraBold,
} from "@expo-google-fonts/jetbrains-mono";
import {
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { Redirect, Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
// Tambahkan Platform di sini
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";
import { UpdateModal } from "../src/components/modals/update-modal";
import { GridPattern } from "../src/components/ui/grid-pattern";
import { setupNotificationChannel } from "../src/utils/notifications";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Helper function to get API key (handles web vs native)
async function getApiKey(): Promise<string | null> {
  if (Platform.OS === "web") {
    // Use localStorage on web
    return localStorage.getItem("tornApiKey");
  }
  return SecureStore.getItemAsync("tornApiKey");
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black, // Font Tebal Anda ada di sini (AMAN)
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
    JetBrainsMono_800ExtraBold,
    PlusJakartaSans_800ExtraBold,
  });

  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkApiKey() {
      const apiKey = await getApiKey();
      setHasApiKey(!!apiKey);
    }
    checkApiKey();

    // Setup Android notification channel for heads-up popup notifications
    setupNotificationChannel();
  }, []);

  useEffect(() => {
    if ((loaded || error) && hasApiKey !== null) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, hasApiKey]);

  if (!loaded && !error) {
    return null;
  }

  if (hasApiKey === null) {
    // Still checking for API key
    return null;
  }

  return (
    // GestureHandlerRootView MUST wrap the entire app for DraggableFlatList to work in production
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* 1. Container Utama: Full Screen & Center alignment */}
      <View className="flex-1 bg-tactical-950 items-center justify-center">

        {/* 2. Background Pattern: Biarkan memenuhi seluruh layar (Absolute) */}
        <View style={{ position: 'absolute', width: '100%', height: '100%' }}>
          <GridPattern />
        </View>

        {/* 3. Container Aplikasi: Dibatasi max 500px (TABLET SAFE) */}
        <View
          className="flex-1 w-full bg-tactical-950"
          style={{
            maxWidth: 500, // <--- INI KUNCINYA
            width: '100%',
            // Opsional: Beri garis pinggir tipis jika di Web/Tablet biar rapi
            borderLeftWidth: Platform.OS === 'web' || Platform.OS === 'windows' || Platform.OS === 'macos' ? 1 : 0,
            borderRightWidth: Platform.OS === 'web' || Platform.OS === 'windows' || Platform.OS === 'macos' ? 1 : 0,
            borderColor: '#333',
            overflow: 'hidden' // Agar konten tidak bocor keluar container
          }}
        >
          {/* Redirect to api-key if no key is stored */}
          {!hasApiKey && <Redirect href="/(modals)/api-key" />}

          <Stack screenOptions={{ headerShown: false }}>
            {/* Tabs jadi root */}
            <Stack.Screen name="(tabs)" />

            {/* Modals group */}
            <Stack.Screen
              name="(modals)/api-key"
              options={{ presentation: "modal" }}
            />
          </Stack>
        </View>
      </View>

      {/* Update changelog modal - shows once per update */}
      <UpdateModal />
    </GestureHandlerRootView>
  );
}