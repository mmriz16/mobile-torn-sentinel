import { Card } from "@/src/components/ui/card";
import { GridPattern } from "@/src/components/ui/grid-pattern";
import { supabase } from "@/src/services/supabase";
import { moderateScale as ms, verticalScale as vs } from "@/src/utils/responsive";
import Constants from "expo-constants";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";
import { AlertCircle, CheckCircle2, Info, RefreshCw, Trash2, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Platform, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Settings() {
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    // Generic Alert State
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: "",
        message: "",
        type: "info" as "info" | "error" | "success" | "warning",
    });

    const showAlert = (title: string, message: string, type: "info" | "error" | "success" | "warning" = "info") => {
        setAlertConfig({ visible: true, title, message, type });
    };

    const closeAlert = () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
    };

    const checkForUpdates = async () => {
        try {
            if (__DEV__) {
                showAlert('Development Mode', 'Cannot check for OTA updates in development mode.', 'warning');
                return;
            }

            setIsCheckingUpdate(true);
            const update = await Updates.checkForUpdateAsync();

            if (update.isAvailable) {
                setShowUpdateModal(true);
            } else {
                showAlert('Up to Date', 'You are using the latest version.', 'success');
            }
        } catch (error) {
            console.error(error);
            showAlert('Error', 'Failed to check for updates.', 'error');
        } finally {
            setIsCheckingUpdate(false);
        }
    };

    const handleUpdate = async () => {
        setShowUpdateModal(false);
        try {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
        } catch (error) {
            console.error(error);
            showAlert('Error', 'Failed to fetch update.', 'error');
        }
    };

    const handleLogout = async () => {
        try {
            // Hapus API key dari storage
            if (Platform.OS === "web") {
                try {
                    localStorage.removeItem("tornApiKey");
                    localStorage.removeItem("user_shortcuts");
                } catch (e) {
                    console.warn("localStorage not available:", e);
                }
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
    const [remoteVersion, setRemoteVersion] = useState<string | null>(null);

    useEffect(() => {
        const fetchLatestVersion = async () => {
            const { data } = await supabase
                .from('app_changelogs')
                .select('version')
                .order('release_date', { ascending: false })
                .order('version', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                setRemoteVersion(data.version);
            }
        };

        fetchLatestVersion();
    }, []);

    const appVersion = useMemo(
        () => remoteVersion ?? Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? "dev",
        [remoteVersion]
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

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'error': return <AlertCircle color="#EF4444" size={ms(24)} />;
            case 'success': return <CheckCircle2 color="#22C55E" size={ms(24)} />;
            case 'warning': return <AlertCircle color="#F59E0B" size={ms(24)} />;
            default: return <Info color="#3B82F6" size={ms(24)} />;
        }
    };

    const getAlertColor = (type: string) => {
        switch (type) {
            case 'error': return 'bg-accent-red/10 border-accent-red/20';
            case 'success': return 'bg-accent-green/10 border-accent-green/20';
            case 'warning': return 'bg-accent-yellow/10 border-accent-yellow/20';
            default: return 'bg-accent-blue/10 border-accent-blue/20';
        }
    };

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
                <View style={{ marginTop: "auto", gap: vs(2) }}>
                    {/* Check Update Button */}
                    <TouchableOpacity
                        onPress={checkForUpdates}
                        disabled={isCheckingUpdate}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ms(6) }}
                    >
                        {isCheckingUpdate ? (
                            <ActivityIndicator size="small" color="#F59E0B" />
                        ) : (
                            <RefreshCw size={ms(12)} color="#F59E0B" />
                        )}
                        <Text className="text-accent-yellow" style={{ fontSize: ms(12), fontFamily: "Inter_600SemiBold" }}>
                            {isCheckingUpdate ? "Checking..." : "Check for Updates"}
                        </Text>
                    </TouchableOpacity>

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

            {/* Update Available Modal */}
            <Modal
                visible={showUpdateModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowUpdateModal(false)}
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
                                    Update Available
                                </Text>
                                <Text className="text-white/50" style={{ fontSize: ms(12), fontFamily: "Inter_500Medium" }}>
                                    New version found
                                </Text>
                            </View>

                            <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                                <X color="#666" size={ms(20)} />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        <View style={{ padding: ms(16) }}>
                            <View className="bg-accent-green/10 border border-accent-green/20 rounded-lg" style={{ padding: ms(16) }}>
                                <Text className="text-white" style={{ fontSize: ms(14), fontFamily: "Inter_500Medium" }}>
                                    A new version is available!
                                </Text>
                                <Text className="text-white/50" style={{ fontSize: ms(12), fontFamily: "Inter_400Regular", marginTop: ms(4) }}>
                                    Would you like to restart and update the app now? This process will take a few seconds.
                                </Text>
                            </View>
                        </View>

                        {/* Footer */}
                        <View className="p-4 border-t border-white/10 flex-row gap-3">
                            <TouchableOpacity
                                className="flex-1 bg-[#3A3A3C] rounded-lg items-center"
                                style={{ padding: ms(12) }}
                                onPress={() => setShowUpdateModal(false)}
                            >
                                <Text className="text-white" style={{ fontSize: ms(12), fontFamily: "Inter_500Medium" }}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-1 bg-accent-green rounded-lg items-center"
                                style={{ padding: ms(12) }}
                                onPress={handleUpdate}
                            >
                                <Text className="text-white" style={{ fontSize: ms(12), fontFamily: "Inter_500Medium" }}>
                                    Restart Now
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Generic Alert Modal */}
            <Modal
                visible={alertConfig.visible}
                transparent
                animationType="fade"
                onRequestClose={closeAlert}
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
                                    {alertConfig.title}
                                </Text>
                            </View>

                            <TouchableOpacity onPress={closeAlert}>
                                <X color="#666" size={ms(20)} />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        <View style={{ padding: ms(16) }}>
                            <View className={`flex-row items-center gap-4 border rounded-lg ${getAlertColor(alertConfig.type)}`} style={{ padding: ms(16) }}>
                                {getAlertIcon(alertConfig.type)}
                                <Text className="text-white flex-1" style={{ fontSize: ms(13), fontFamily: "Inter_500Medium" }}>
                                    {alertConfig.message}
                                </Text>
                            </View>
                        </View>

                        {/* Footer */}
                        <View className="p-4 border-t border-white/10">
                            <TouchableOpacity
                                className="bg-[#3A3A3C] rounded-lg items-center"
                                style={{ padding: ms(12) }}
                                onPress={closeAlert}
                            >
                                <Text className="text-white" style={{ fontSize: ms(12), fontFamily: "Inter_500Medium" }}>
                                    OK
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}