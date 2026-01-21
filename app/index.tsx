import { Redirect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

export default function Index() {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkApiKey() {
      let apiKey: string | null = null;
      if (Platform.OS === "web") {
        try {
          apiKey = localStorage.getItem("tornApiKey");
        } catch (error) {
          console.warn("localStorage not available:", error);
        }
      } else {
        apiKey = await SecureStore.getItemAsync("tornApiKey");
      }
      setHasApiKey(!!apiKey);
    }
    checkApiKey();
  }, []);

  if (hasApiKey === null) {
    return null;
  }

  if (!hasApiKey) {
    return <Redirect href="/(modals)/api-key" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
