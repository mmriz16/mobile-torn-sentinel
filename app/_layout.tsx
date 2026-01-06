import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  JetBrainsMono_400Regular,
} from "@expo-google-fonts/jetbrains-mono";
import {
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { Redirect, Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import "../global.css";
import { GridPattern } from "../src/components/ui/grid-pattern";

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
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    PlusJakartaSans_800ExtraBold,
  });

  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkApiKey() {
      const apiKey = await getApiKey();
      setHasApiKey(!!apiKey);
    }
    checkApiKey();
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
    <View className="flex-1 bg-tactical-950">
      <GridPattern />
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
  );
}
