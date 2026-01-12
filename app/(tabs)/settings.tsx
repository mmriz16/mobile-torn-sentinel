import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Trash2, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Modal, Platform, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../src/components/ui/card";
import { GridPattern } from "../../src/components/ui/grid-pattern";
import { moderateScale as ms, verticalScale as vs } from "../../src/utils/responsive";

export default function Settings() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    try {
      // Hapus API key dari storage
      if (Platform.OS === "web") {
        localStorage.removeItem("tornApiKey");
        localStorage.removeItem("user_shortcuts");
      } else {
        await SecureStore.deleteItemAsync("tornApiKey");
        await SecureStore.deleteItemAsync("user_shortcuts");
      }

      console.log("✅ Semua data lokal berhasil dihapus");
      setShowLogoutModal(false);

      // Navigate ke halaman API key
      router.replace("/(modals)/api-key");
    } catch (error) {
      console.error("❌ Gagal menghapus data:", error);
    }
  };

  // ---- Version / Build (binary) ----
  const appVersion = useMemo(
    () => Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? "dev",
    []
  );

  const buildVersion = useMemo(() => {
    // Android: versionCode, iOS: buildNumber (as string)
    const v = Constants.nativeBuildVersion ?? "dev";
    return String(v);
  }, []);

  // ---- OTA update status (EAS Update) ----
  const updateSource = useMemo(() => (Updates.isEmbeddedLaunch ? "Embedded" : "OTA"), []);
  const updateChannel = useMemo(() => Updates.channel ?? "unknown", []);
  const updateIdShort = useMemo(
    () => (Updates.updateId ? String(Updates.updateId).slice(0, 8) : "embedded"),
    []
  );
  const updateTime = useMemo(
    () => (Updates.createdAt ? new Date(Updates.createdAt).toLocaleString() : ""),
    []
  );

  return (
    <SafeAreaView className="flex-1 bg-tactical-950">
      <GridPattern />
      <View className="flex-1" style={{ padding: ms(16), gap: vs(16) }}>
        <Text
          className="text-white uppercase"
          style={{ fontSize: ms(16), fontFamily: "Inter_600SemiBold" }}
        >
          Danger Zone
        </Text>

        <Card
          className="flex-row items-center bg-accent-red/10 border border-accent-red/40"
          style={{ padding: ms(16), gap: vs(10) }}
        >
          <View className="bg-accent-red/20" style={{ padding: ms(10), borderRadius: ms(6) }}>
            <Trash2 color="#EF4444" size={ms(24)} />
          </View>

          <View className="flex-1">
            <Text
              className="text-accent-red"
              style={{ fontSize: ms(16), fontFamily: "Inter_600SemiBold" }}
            >
              Clear Local Data
            </Text>
            <Text
              className="text-white/50"
              style={{ fontSize: ms(12), fontFamily: "Inter_400Regular" }}
            >
              Remove API key and reset all settings.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowLogoutModal(true)}
            className="bg-accent-red"
            style={{ padding: ms(10), borderRadius: ms(6) }}
          >
            <Text className="text-white" style={{ fontSize: ms(12), fontFamily: "Inter_600SemiBold" }}>
              Clear Data
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Version / Build + OTA status - Always at bottom */}
        <View style={{ marginTop: "auto", gap: vs(6) }}>
          <Text
            className="text-white/30 text-center"
            style={{ fontSize: ms(12), fontFamily: "JetBrainsMono_400Regular" }}
          >
            Torn Sentinel v{appVersion} • Build {buildVersion} •{" "}
            <Text className="text-accent-green">Stable</Text>
          </Text>

          <Text
            className="text-white/20 text-center"
            style={{ fontSize: ms(11), fontFamily: "JetBrainsMono_400Regular" }}
          >
            Update: {updateSource} • {updateChannel} • {updateIdShort}
            {updateTime ? ` • ${updateTime}` : ""}
          </Text>
        </View>
      </View>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-center items-center" style={{ padding: ms(20) }}>
          <View className="bg-[#1C1C1E] w-full rounded-2xl overflow-hidden border border-white/10">
            {/* Header */}
            <View
              className="flex-row justify-between items-center border-b border-white/10"
              style={{ padding: ms(16) }}
            >
              <View style={{ gap: vs(2) }}>
                <Text
                  className="text-white uppercase"
                  style={{ fontSize: ms(14), fontFamily: "Inter_800ExtraBold" }}
                >
                  Clear Local Data
                </Text>
                <Text className="text-white/50" style={{ fontSize: ms(12), fontFamily: "Inter_400Regular" }}>
                  Confirm to proceed
                </Text>
              </View>

              <TouchableOpacity onPress={() => setShowLogoutModal(false)}>
                <X color="#666" size={ms(20)} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={{ padding: ms(16) }}>
              <View className="bg-accent-red/10 border border-accent-red/20 rounded-lg" style={{ padding: ms(16) }}>
                <Text className="text-white" style={{ fontSize: ms(14), fontFamily: "Inter_500Medium" }}>
                  Are you sure you want to clear all local data?
                </Text>
                <Text className="text-white/50" style={{ fontSize: ms(12), fontFamily: "Inter_400Regular" }}>
                  • API key will be removed{"\n"}• Shortcuts settings will be reset{"\n"}• You will be redirected to login
                  page
                </Text>
              </View>
            </View>

            {/* Footer */}
            <View className="p-4 border-t border-white/10 flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-[#3A3A3C] rounded-lg items-center"
                style={{ padding: ms(12) }}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text className="text-white" style={{ fontSize: ms(12), fontFamily: "Inter_500Medium" }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-accent-red rounded-lg items-center"
                style={{ padding: ms(12) }}
                onPress={handleLogout}
              >
                <Text className="text-white" style={{ fontSize: ms(12), fontFamily: "Inter_500Medium" }}>
                  Clear Data
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}