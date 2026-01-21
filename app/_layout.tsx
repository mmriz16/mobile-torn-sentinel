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
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";
import { UpdateModal } from "../src/components/modals/update-modal";
import { GridPattern } from "../src/components/ui/grid-pattern";
import { setupNotificationChannel } from "../src/utils/notifications";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
    JetBrainsMono_800ExtraBold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    setupNotificationChannel();
  }, []);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-tactical-950 items-center justify-center">
        <View style={{ position: 'absolute', width: '100%', height: '100%' }}>
          <GridPattern />
        </View>

        <View
          className="flex-1 w-full bg-tactical-950"
          style={{
            maxWidth: 500,
            width: '100%',
            borderLeftWidth: Platform.OS === 'web' || Platform.OS === 'windows' || Platform.OS === 'macos' ? 1 : 0,
            borderRightWidth: Platform.OS === 'web' || Platform.OS === 'windows' || Platform.OS === 'macos' ? 1 : 0,
            borderColor: '#333',
            overflow: 'hidden'
          }}
        >
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="(modals)/api-key"
              options={{ presentation: "modal" }}
            />
          </Stack>
        </View>
      </View>

      <UpdateModal />
    </GestureHandlerRootView>
  );
}
