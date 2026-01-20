import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ManageShortcutsModal } from "../../src/components/modals/manage-shortcuts-modal";
import { Card } from "../../src/components/ui/card";
import { GridPattern } from "../../src/components/ui/grid-pattern";
import { ProgressBar } from "../../src/components/ui/progress-bar";
import TravelLoader from "../../src/components/ui/travel-loader";
import { AVAILABLE_HOME_SHORTCUTS, AVAILABLE_SHORTCUTS, DEFAULT_SHORTCUTS } from "../../src/constants/shortcuts";
import { supabase } from "../../src/services/supabase";

import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { syncUserTravelStatus } from "../../src/services/faction-service";
import { syncNetworthAndGetProfit } from "../../src/services/profit-tracker";
import {
    fetchEducationCourses,
    fetchUserDataWithNetworth,
    fetchWeeklyXanaxUsage,
    formatCurrency,
    formatNumber,
    formatTimeRemaining,
    getApiRequestCount,
    TornNetworth,
    TornUserData
} from "../../src/services/torn-api";
import { scheduleAllNotifications } from "../../src/utils/notifications";

// 1. IMPORT Helper Responsif (Pake Alias biar pendek)
import { horizontalScale as hs, moderateScale as ms, verticalScale as vs } from '../../src/utils/responsive';

import EducationIcon from '../../assets/icons/education.svg';
import QaOthers from '../../assets/icons/qa-others.svg';

import { BatteryCharging, Bell, Brain, Cannabis, Coins, Columns4, Cross, Heart, Link, Smile, TrendingUp, TriangleAlert, X, Zap } from 'lucide-react-native';

import Changelog from '../(modals)/changelog';

// --- Animated Components Removed ---

export default function Home() {
    const router = useRouter();
    const [userData, setUserData] = useState<TornUserData | null>(null);
    const [networth, setNetworth] = useState<TornNetworth | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showRentNotification, setShowRentNotification] = useState(true);
    const [dailyProfit, setDailyProfit] = useState(0);
    const [profitPercent, setProfitPercent] = useState(0);
    const [cooldownEndTimes, setCooldownEndTimes] = useState({ drug: 0, booster: 0, medical: 0, jail: 0 });
    const [barEndTimes, setBarEndTimes] = useState({
        energy: 0,
        nerve: 0,
        happy: 0,
        life: 0,
        chain: 0
    });
    const [cooldownTimers, setCooldownTimers] = useState({ drug: 0, booster: 0, medical: 0, jail: 0 });
    const [travelTimer, setTravelTimer] = useState(0);
    const [barTimers, setBarTimers] = useState({
        energy: 0,
        nerve: 0,
        happy: 0,
        life: 0,
        chain: 0
    });
    const [weeklyXanax, setWeeklyXanax] = useState(0);
    const [courseNames, setCourseNames] = useState<Record<string, string>>({});
    const [apiRequestCount, setApiRequestCount] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [activeShortcuts, setActiveShortcuts] = useState<string[]>(DEFAULT_SHORTCUTS);
    const [isShortcutModalVisible, setIsShortcutModalVisible] = useState(false);
    const [testNotifCooldown, setTestNotifCooldown] = useState(0);
    const [showChangelog, setShowChangelog] = useState(false);

    // Current app version - update this when releasing new versions
    const APP_VERSION = "1.0.6";

    // Check if changelog should be shown (once per version)
    useEffect(() => {
        const checkChangelogVersion = async () => {
            if (Platform.OS === 'web') return; // Skip on web
            try {
                const lastSeenVersion = await SecureStore.getItemAsync('last_seen_changelog_version');
                if (lastSeenVersion !== APP_VERSION) {
                    setShowChangelog(true);
                    // Save the current version so it won't show again
                    await SecureStore.setItemAsync('last_seen_changelog_version', APP_VERSION);
                }
            } catch (e) {
                console.warn('Failed to check changelog version:', e);
            }
        };
        checkChangelogVersion();
    }, []);

    useEffect(() => {
        loadShortcuts();
    }, []);

    const loadShortcuts = async () => {
        try {
            let stored: string | null = null;
            if (Platform.OS === "web") {
                stored = localStorage.getItem("user_shortcuts");
            } else {
                stored = await SecureStore.getItemAsync("user_shortcuts");
            }
            if (stored) {
                setActiveShortcuts(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to load shortcuts", e);
        }
    };

    const handleSaveShortcuts = async (newShortcuts: string[]) => {
        setActiveShortcuts(newShortcuts);
        setIsShortcutModalVisible(false);
        try {
            if (Platform.OS === "web") {
                localStorage.setItem("user_shortcuts", JSON.stringify(newShortcuts));
            } else {
                await SecureStore.setItemAsync("user_shortcuts", JSON.stringify(newShortcuts));
            }
        } catch (e) {
            console.error("Failed to save shortcuts", e);
        }
    };

    // Helper: Save daily bank snapshot for "VS Yesterday" comparison
    const saveBankDailySnapshot = useCallback(async (user: TornUserData | null, nw: TornNetworth | null) => {
        if (Platform.OS === 'web') return;
        if (!user) return;

        // Get today's date string (YYYY-MM-DD in user's timezone)
        const now = new Date();
        const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // Calculate current values
        const moneyData = user.money;
        const networthData = nw?.personalstats?.networth;
        const currentWallet = Number(moneyData?.wallet) || Number(networthData?.wallet) || 0;
        const currentStocks = Number(networthData?.stock_market) || 0;

        try {
            const storedData = await SecureStore.getItemAsync('bank_daily_snapshots');
            let snapshots: { date: string; wallet: number; stocks: number }[] = storedData ? JSON.parse(storedData) : [];

            // Check if today's snapshot already exists
            const todayExists = snapshots.some(s => s.date === todayDate);
            if (!todayExists) {
                // First check of the day - save snapshot
                snapshots.push({ date: todayDate, wallet: currentWallet, stocks: currentStocks });

                // Keep only last 7 days
                snapshots = snapshots.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

                await SecureStore.setItemAsync('bank_daily_snapshots', JSON.stringify(snapshots));
                console.log('📊 Bank daily snapshot saved:', todayDate);
            }
        } catch (e) {
            console.warn('Failed to save bank snapshot:', e);
        }
    }, []);

    const loadData = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);

        // 1. CRITICAL DATA: Get User Data & Networth asap
        const { userData: data, networth: nw } = await fetchUserDataWithNetworth();

        // Update Critical State
        setUserData(data);
        setNetworth(nw);
        setApiRequestCount(getApiRequestCount());

        // 2. UNBLOCK UI: Stop loading immediately so user sees the app
        if (showLoading) setIsLoading(false);

        // 3. BACKGROUND TASKS: Fetch secondary data silently
        // Sync travel status
        if (data?.profile?.id && data?.travel) {
            const travelState = data.travel.time_left > 0 ? 'Traveling' : (data.travel.destination !== 'Torn' ? 'Abroad' : 'Okay');
            syncUserTravelStatus(
                data.profile.id,
                travelState,
                data.travel.destination || null,
                data.travel.arrival_at || null,
                data.profile.status?.state || null,
                data.profile.status?.until || null
            ).catch(err => console.error('Failed to sync travel status:', err));
        }

        // Daily Profit & Networth
        if (data?.profile?.id && nw?.personalstats?.networth?.total) {
            syncNetworthAndGetProfit(
                data.profile.id,
                nw.personalstats.networth.total
            ).then(profitData => {
                setDailyProfit(profitData.profit);
                setProfitPercent(profitData.percentChange);
            }).catch(e => console.warn("Profit sync error:", e));
        }

        // Weekly Xanax
        fetchWeeklyXanaxUsage().then(weekly => {
            setWeeklyXanax(weekly);
        }).catch(e => console.warn("Xanax fetch error:", e));

        // Education Courses
        fetchEducationCourses().then(courses => {
            if (courses) setCourseNames(courses);
        }).catch(e => console.warn("Course fetch error:", e));

        // Save daily bank snapshot for "VS Yesterday" comparison (runs in background)
        saveBankDailySnapshot(data, nw);
    }, [saveBankDailySnapshot]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData(false);
        setRefreshing(false);
        setShowRentNotification(true);
    }, [loadData]);

    // Handle test notification button press
    const handleTestNotification = async () => {
        if (testNotifCooldown > 0) return;

        try {
            // Get user id from userData
            const userId = userData?.profile?.id;
            console.log("🔔 Test notification button pressed");
            console.log("📌 User ID:", userId);

            if (!userId) {
                console.error("❌ User ID not found");
                return;
            }

            console.log("📤 Updating test_notif to true for user_id:", userId);

            // Update test_notif to true in Supabase
            const { data, error } = await supabase
                .from('user_notifications')
                .update({ test_notif: true })
                .eq('user_id', userId)
                .select();

            if (error) {
                console.error("❌ Failed to trigger test notification:", error.message, error);
                return;
            }

            console.log("✅ Supabase update response:", data);
            console.log("✅ Test notification triggered for user", userId);

            // Start 5 second cooldown
            setTestNotifCooldown(5);
            const interval = setInterval(() => {
                setTestNotifCooldown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (e) {
            console.error("❌ Error triggering test notification:", e);
        }
    };

    useEffect(() => {
        loadData(true);
        const refreshInterval = setInterval(() => {
            loadData(false);
        }, 10000);

        return () => clearInterval(refreshInterval);
    }, [loadData]);

    // Watch userData for token sync only (notifications scheduled in separate useEffect below)
    useEffect(() => {
        if (!userData) return;

        // Sync Push Token (since we now have userData.profile.id)
        if (Platform.OS !== 'web') {
            (async () => {
                const { status } = await Notifications.getPermissionsAsync();
                if (status === 'granted') {
                    try {
                        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
                        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
                        const pushToken = tokenData.data;
                        const apiKey = await SecureStore.getItemAsync("tornApiKey");

                        if (pushToken && apiKey && userData.profile.id) {
                            // Call register_secure_user (safe rpc)
                            const { error } = await supabase.rpc('register_secure_user', {
                                p_id: userData.profile.id,
                                p_username: userData.profile.name,
                                p_faction_id: userData.money.faction || 0, // money.faction might be null, check checks
                                p_push_token: pushToken,
                                p_api_key: apiKey
                            });
                            if (error) console.warn("Supabase token sync error:", error);
                        }
                    } catch (err) {
                        console.warn("Token sync failed:", err);
                    }
                }
            })();
        }

        const now = Date.now();

        // Jail time from profile status (when in Jail)
        let jailEndTime = 0;
        if (userData.profile?.status?.state === "Jail" && userData.profile?.status?.until) {
            jailEndTime = userData.profile.status.until * 1000;
        }

        // Hospital time from profile status (when in Hospital)
        // Note: cooldowns.medical is for using medical items, NOT hospital time
        let hospitalEndTime = 0;
        if (userData.profile?.status?.state === "Hospital" && userData.profile?.status?.until) {
            hospitalEndTime = userData.profile.status.until * 1000;
        }

        setCooldownEndTimes({
            drug: now + (userData.cooldowns.drug * 1000),
            booster: now + (userData.cooldowns.booster * 1000),
            medical: hospitalEndTime, // Changed: use hospital time from status, not cooldowns.medical
            jail: jailEndTime,
        });

        setBarEndTimes({
            energy: now + ((userData.bars?.energy?.full_time ?? 0) * 1000),
            nerve: now + ((userData.bars?.nerve?.full_time ?? 0) * 1000),
            happy: now + ((userData.bars?.happy?.full_time ?? 0) * 1000),
            life: now + ((userData.bars?.life?.full_time ?? 0) * 1000),
            chain: now + ((userData.bars?.chain?.timeout ?? 0) * 1000),
        });

        // 3. Schedule Local Notifications
        // Re-schedule whenever relevant status changes (cooldowns, bars, etc.)
        scheduleAllNotifications(userData);
    }, [userData]); // Re-run when userData changes (includes cooldowns, status, etc.)

    useEffect(() => {
        const updateTimers = () => {
            const now = Date.now();
            setCooldownTimers({
                drug: Math.max(0, Math.floor((cooldownEndTimes.drug - now) / 1000)),
                booster: Math.max(0, Math.floor((cooldownEndTimes.booster - now) / 1000)),
                medical: Math.max(0, Math.floor((cooldownEndTimes.medical - now) / 1000)),
                jail: Math.max(0, Math.floor((cooldownEndTimes.jail - now) / 1000)),
            });


            setBarTimers({
                energy: Math.max(0, Math.floor((barEndTimes.energy - now) / 1000)),
                nerve: Math.max(0, Math.floor((barEndTimes.nerve - now) / 1000)),
                happy: Math.max(0, Math.floor((barEndTimes.happy - now) / 1000)),
                life: Math.max(0, Math.floor((barEndTimes.life - now) / 1000)),
                chain: Math.max(0, Math.floor((barEndTimes.chain - now) / 1000)),
            });

            if (userData?.travel?.arrival_at) {
                setTravelTimer(Math.max(0, userData.travel.arrival_at - Math.floor(now / 1000)));
            }
        };
        updateTimers();
        const interval = setInterval(updateTimers, 1000);
        return () => clearInterval(interval);
    }, [cooldownEndTimes, barEndTimes, userData?.travel]);





    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-tactical-950 items-center justify-center">
                <ActivityIndicator color="#F59E0B" size="large" />
                <Text className="text-white/50 mt-4 font-mono uppercase text-xs">Loading...</Text>
            </SafeAreaView>
        );
    }

    const profile = userData?.profile;
    const bars = userData?.bars;
    const travel = userData?.travel;
    const education = userData?.education?.current;
    // Hybrid Networth Calculation (Same as networth.tsx)
    const networthData = networth?.personalstats?.networth;
    const moneyData = userData?.money;

    const realTimeLiquid: Record<string, number> = {
        wallet: Number(moneyData?.wallet) || Number(networthData?.wallet) || 0,
        vaults: Number(moneyData?.vault) || Number(networthData?.vaults) || 0,
        bank: Number(moneyData?.city_bank) || Number(networthData?.bank) || 0,
        overseas_bank: Number(moneyData?.cayman_bank) || Number(networthData?.overseas_bank) || 0,
        points: Number(moneyData?.points) || Number(networthData?.points) || 0,
    };

    const cachedLiquidTotal = (networthData?.wallet ?? 0) + (networthData?.vaults ?? 0) +
        (networthData?.bank ?? 0) + (networthData?.overseas_bank ?? 0) + (networthData?.points ?? 0);
    const realTimeLiquidTotal = Object.values(realTimeLiquid).reduce((sum, val) => sum + val, 0);

    // Adjusted Total: Cached Total - Cached Liquid + Real Time Liquid
    const totalNetworth = (networthData?.total ?? 0) - cachedLiquidTotal + realTimeLiquidTotal;
    // Use real-time money from money selection (v2/user/money)
    const walletAmount = userData?.money?.wallet ?? 0;



    const educationTimeLeft = education ? Math.max(0, education.until - Math.floor(Date.now() / 1000)) : 0;
    const educationDays = Math.floor(educationTimeLeft / 86400);
    const educationHours = Math.floor((educationTimeLeft % 86400) / 3600);
    const educationMins = Math.floor((educationTimeLeft % 3600) / 60);
    const educationSecs = educationTimeLeft % 60;
    const educationTimeString = `${educationDays.toString().padStart(2, '0')}:${educationHours.toString().padStart(2, '0')}:${educationMins.toString().padStart(2, '0')}:${educationSecs.toString().padStart(2, '0')}`;

    const travelProgress = travel
        ? 1 - (travel.time_left / (travel.arrival_at - travel.departed_at))
        : 0;

    let originCity = "Torn City";
    if (profile?.status?.description.startsWith("Returning to Torn from ")) {
        originCity = profile.status.description.replace("Returning to Torn from ", "");
    }

    // --- MAIN RENDER ---
    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <ScrollView
                className="flex-1"
                // Menggunakan Scale untuk padding konten utama
                contentContainerStyle={{ padding: hs(16), gap: vs(16) }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#F59E0B']}
                        tintColor="#F59E0B"
                        progressBackgroundColor="#1a1a1a"
                    />
                }
            >
                {/* Header */}
                <View className="flex-row justify-between items-center">
                    <View>
                        {/* Font: Inter Black agar tebal di Android */}
                        <Text className="text-white" style={{ fontFamily: 'Inter_900Black', fontSize: ms(18) }}>
                            Welcome back, <Text className="text-accent-yellow">{profile?.name ?? "Agent"}</Text>
                        </Text>
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10), marginTop: vs(6) }}>
                            id : {profile?.id ?? "---"} - Level {profile?.level ?? "--"}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <View>
                            <Text
                                className="uppercase rounded-[4px] text-accent-green bg-tactical-900 border border-tactical-800"
                                style={{
                                    fontFamily: 'JetBrainsMono_400Regular',
                                    fontSize: ms(10),
                                    padding: ms(6)
                                }}
                            >
                                API Req: {apiRequestCount}/min
                            </Text>
                        </View>
                        <TouchableOpacity
                            className={`p-2 rounded-full ${testNotifCooldown > 0 ? 'bg-tactical-800' : 'bg-tactical-900'}`}
                            onPress={handleTestNotification}
                            disabled={testNotifCooldown > 0}
                        >
                            {testNotifCooldown > 0 ? (
                                <Text className="text-white/50 font-mono" style={{ fontSize: ms(12), width: ms(18), textAlign: 'center' }}>{testNotifCooldown}</Text>
                            ) : (
                                <Bell size={ms(18)} color="rgba(255,255,255,0.8)" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>


                {/* Top Sections */}
                <View style={{ gap: vs(10) }}>
                    {/* Property Rent Notifications */}
                    {/* Logic: Show ONLY if status is 'rented' AND rental_period_remaining < 7 AND showRentNotification is true */}
                    {userData?.property?.status === 'rented' && userData?.property?.rental_period_remaining < 7 && showRentNotification && (
                        <View
                            className="bg-accent-yellow/10 border border-accent-yellow/10 rounded-[8px] flex-row items-center gap-2"
                            // Gunakan Scale helper untuk konsistensi
                            style={{ gap: vs(10), padding: hs(10) }}
                        >
                            {/* Icon Alert */}
                            <TriangleAlert color="#F59E0B" size={ms(14)} />

                            {/* Text Message */}
                            <Text
                                className="text-accent-yellow uppercase flex-1"
                                style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}
                            >
                                Property Rent Expiring in {userData.property.rental_period_remaining} days
                            </Text>

                            {/* Close Button */}
                            <TouchableOpacity onPress={() => setShowRentNotification(false)}>
                                <X color="#F59E0B" size={ms(14)} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Travel Card - Only show when actively traveling */}
                    {travel && travel.time_left > 0 && (
                        <TouchableOpacity activeOpacity={1} onPress={() => router.push('/(qa-home)/travel')}>
                            <Card style={{ paddingTop: vs(14) }}>
                                <View className="flex-row items-center justify-between" style={{ paddingHorizontal: hs(14) }}>
                                    <View className="flex-1">
                                        <Text className="font-mono text-white/80" style={{ fontSize: ms(10) }} numberOfLines={1}>
                                            {new Date(travel.departed_at * 1000).toLocaleTimeString('en-GB', {
                                                hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short'
                                            })}
                                        </Text>
                                        <Text className="text-white" style={{ fontFamily: 'Inter_900Black', fontSize: ms(18) }}>
                                            {originCity}
                                        </Text>
                                    </View>
                                    <View className="flex-col items-center justify-center">
                                        <TravelLoader />
                                        <Text className="font-mono text-accent-blue" style={{ fontSize: ms(10) }} numberOfLines={1}>
                                            {formatTimeRemaining(travelTimer)}
                                        </Text>
                                    </View>
                                    <View className="flex-1 items-end">
                                        <Text className="font-mono text-white/80" style={{ fontSize: ms(10) }} numberOfLines={1}>
                                            {new Date(travel.arrival_at * 1000).toLocaleTimeString('en-GB', {
                                                hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short'
                                            })}
                                        </Text>
                                        <Text className="text-white" style={{ fontFamily: 'Inter_900Black', fontSize: ms(18) }}>
                                            {travel.destination}
                                        </Text>
                                    </View>
                                </View>
                                <View style={{ marginTop: vs(12) }}>
                                    <ProgressBar
                                        value={travelProgress}
                                        height={ms(4)}
                                        trackClassName="bg-tactical-950"
                                        fillClassName="bg-accent-blue"
                                    />
                                </View>
                            </Card>
                        </TouchableOpacity>
                    )}

                    {/* KPI Section */}
                    <View className="flex-row" style={{ gap: hs(10) }}>
                        {/* Daily Profit Card */}
                        <Card className="flex-1" style={{ padding: ms(14) }}>
                            <View style={{ gap: vs(0) }}>
                                <View className="flex-row items-center" style={{ gap: hs(4) }}>
                                    <TrendingUp size={ms(12)} color="#F59E0B" />
                                    <Text className="uppercase font-sans-extrabold text-accent-yellow" style={{ fontSize: ms(12) }}>daily profit</Text>
                                </View>
                                {/* Font Angka lebih tebal */}
                                <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(18) }}>{formatCurrency(dailyProfit)}</Text>
                            </View>
                            <View className="flex-row items-center" style={{ gap: hs(4) }}>
                                <Text
                                    className={`uppercase font-mono ${profitPercent >= 0 ? 'text-accent-green' : 'text-accent-red'}`}
                                    style={{ fontSize: ms(10) }}
                                >
                                    {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                                </Text>
                                <Text className="uppercase font-mono text-white/50" style={{ fontSize: ms(10) }}>VS YESTERDAY</Text>
                            </View>
                        </Card>

                        {/* Networth Card */}
                        <Card className="flex-1" style={{ padding: ms(14) }}>
                            <View style={{ gap: vs(0) }}>
                                <View className="flex-row items-center" style={{ gap: hs(4) }}>
                                    <Coins size={ms(12)} color="#F59E0B" />
                                    <Text className="uppercase font-sans-extrabold text-accent-yellow" style={{ fontSize: ms(12) }}>networth</Text>
                                </View>
                                <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(18) }}>{formatCurrency(totalNetworth)}</Text>
                            </View>
                            <Text className="uppercase font-mono text-white/50" style={{ fontSize: ms(10) }}>Wallet {formatCurrency(walletAmount)}</Text>
                        </Card>
                    </View>
                </View>

                {/* Bottom Section */}
                <View style={{ gap: vs(10) }}>
                    {/* Quick Actions */}
                    <View className="flex-row justify-between items-center">
                        <Text className="uppercase font-sans-extrabold text-white/50" style={{ fontSize: ms(14) }}>quick actions</Text>
                        <TouchableOpacity onPress={() => setIsShortcutModalVisible(true)}>
                            <Text className="uppercase font-mono text-accent-yellow" style={{ fontSize: ms(10) }}>edit</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="flex-row" style={{ gap: hs(10) }}>
                        {[
                            ...activeShortcuts.map(id => AVAILABLE_SHORTCUTS.find(s => s.id === id)).filter(Boolean),
                            { id: 'others', label: 'Others', icon: QaOthers, isSvg: true, route: '/(quick-actions)/property' as const }
                        ].map((item, index) => {
                            const Icon = item!.icon;
                            return (
                                <TouchableOpacity key={index} className="flex-1" onPress={() => router.push(item!.route)}>
                                    <Card className="items-center justify-center flex-1" style={{ padding: ms(10), gap: vs(4) }}>
                                        {item!.isSvg ? (
                                            <Icon width={ms(24)} height={ms(24)} />
                                        ) : (
                                            <Icon size={ms(24)} color="rgba(255, 255, 255, 0.8)" />
                                        )}
                                        <Text className="uppercase font-sans-bold text-white/80" style={{ fontSize: ms(8) }}>{item!.label}</Text>
                                    </Card>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <ManageShortcutsModal
                        visible={isShortcutModalVisible}
                        onClose={() => setIsShortcutModalVisible(false)}
                        currentShortcuts={activeShortcuts}
                        onSave={handleSaveShortcuts}
                        availableShortcuts={AVAILABLE_HOME_SHORTCUTS}
                    />

                    {/* Status Overview */}
                    <Card>
                        <Text className="uppercase text-tactical-700 border-b border-tactical-800" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14), padding: ms(14) }}>status overview</Text>
                        <View style={{ gap: vs(10), padding: ms(14) }}>
                            {/* ROW 1 */}
                            <View className="flex-row" style={{ gap: hs(10) }}>
                                {/* Energy */}
                                <StatusBox
                                    icon={<Zap size={ms(10)} color="#10B981" />}
                                    label="Energy"
                                    labelColor="text-accent-green"
                                    current={bars?.energy?.current ?? 0}
                                    max={bars?.energy?.maximum ?? 0}
                                    timer={barTimers.energy}
                                    fillColor="bg-accent-green"

                                />
                                {/* Nerve */}
                                <StatusBox
                                    icon={<Brain size={ms(10)} color="#F43F5E" />}
                                    label="Nerve"
                                    labelColor="text-accent-red"
                                    current={bars?.nerve?.current ?? 0}
                                    max={bars?.nerve?.maximum ?? 0}
                                    timer={barTimers.nerve}
                                    fillColor="bg-accent-red"
                                />
                                {/* Happy */}
                                <StatusBox
                                    icon={<Smile size={ms(10)} color="#F59E0B" />}
                                    label="Happy"
                                    labelColor="text-accent-yellow"
                                    current={bars?.happy?.current ?? 0}
                                    max={bars?.happy?.maximum ?? 0}
                                    timer={barTimers.happy}
                                    fillColor="bg-accent-yellow"
                                />
                            </View>
                            {/* ROW 2 */}
                            <View className="flex-row" style={{ gap: hs(10) }}>
                                {/* Life */}
                                <StatusBox
                                    icon={<Heart size={ms(10)} color="#0EA5E9" />}
                                    label="Life"
                                    labelColor="text-accent-blue"
                                    current={bars?.life?.current ?? 0}
                                    max={bars?.life?.maximum ?? 0}
                                    timer={barTimers.life}
                                    fillColor="bg-accent-blue"
                                />
                                {/* Chain */}
                                <View className="flex-1 bg-tactical-950 border border-tactical-800 rounded-sm" style={{ paddingTop: vs(10) }}>
                                    <View style={{ paddingHorizontal: hs(10) }}>
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-row items-center" style={{ gap: hs(4) }}>
                                                <Link size={ms(10)} color="#B720F7" />
                                                <Text className="text-accent-purple uppercase" style={{ fontSize: ms(10), fontFamily: 'Inter_900Black' }}>Chain</Text>
                                            </View>
                                            <Text className="text-white/50" style={{ fontSize: ms(10), fontFamily: 'JetBrainsMono_800ExtraBold' }}>
                                                {barTimers.chain > 0 ? formatTimeRemaining(barTimers.chain) : ""}
                                            </Text>
                                        </View>
                                        {/* Chain Logic: Milestones 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000 */}
                                        {(() => {
                                            const currentChain = bars?.chain?.current ?? 0;
                                            const CHAIN_MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
                                            const nextMilestone = CHAIN_MILESTONES.find(m => m > currentChain) || 100000;

                                            // Handling edge case where current might equal a milestone momentarily before jumping
                                            const displayMax = nextMilestone;

                                            return (
                                                <>
                                                    <View className="flex-row items-end" style={{ gap: hs(4) }}>
                                                        <Text className="text-white" style={{ fontSize: ms(18), fontFamily: 'JetBrainsMono_800ExtraBold' }}>{currentChain.toLocaleString('en-US')}</Text>
                                                        <Text className="text-white/50 font-mono" style={{ fontSize: ms(10), paddingBottom: vs(4) }}>/{displayMax.toLocaleString('en-US')}</Text>
                                                    </View>
                                                    <View style={{ marginTop: vs(10) }}>
                                                        <ProgressBar
                                                            value={currentChain / displayMax}
                                                            height={ms(4)}
                                                            trackClassName="bg-tactical-950"
                                                            fillClassName={currentChain > 0 ? "bg-accent-purple" : "bg-tactical-800"}
                                                        />
                                                    </View>
                                                </>
                                            );
                                        })()}
                                    </View>
                                </View>
                            </View>
                        </View>
                    </Card>

                    {/* Cooldown Status */}
                    <Card>
                        <View className="flex-row items-center justify-between border-b border-tactical-800" style={{ padding: ms(14) }}>
                            <Text className="uppercase font-sans-extrabold text-tactical-700" style={{ fontSize: ms(14) }}>Cooldown Status</Text>
                            <Text className="uppercase bg-tactical-950 border border-tactical-800 rounded-[2px] font-mono text-tactical-700" style={{ padding: ms(6), fontSize: ms(10) }}>
                                mon-sun: <Text className="text-accent-blue">{weeklyXanax} xanax</Text>
                            </Text>
                        </View>
                        <View style={{ gap: vs(10), padding: ms(14) }}>
                            {/* ROW 1 */}
                            <View className="flex-row" style={{ gap: hs(10) }}>
                                <CooldownBox
                                    icon={<Cannabis size={ms(10)} color="rgba(255,255,255,0.5)" />}
                                    label="Drugs"
                                    timer={cooldownTimers.drug}
                                />
                                <CooldownBox
                                    icon={<BatteryCharging size={ms(10)} color="rgba(255,255,255,0.5)" />}
                                    label="Booster"
                                    timer={cooldownTimers.booster}
                                />
                                <CooldownBox
                                    icon={<Cross size={ms(10)} color="rgba(255,255,255,0.5)" />}
                                    label="Medical"
                                    timer={cooldownTimers.medical}
                                />
                                <CooldownBox
                                    icon={<Columns4 size={ms(10)} color="rgba(255,255,255,0.5)" />}
                                    label="Jail"
                                    timer={cooldownTimers.jail}
                                />
                            </View>

                            {/* Education ROW */}
                            {education && (
                                <View className="flex-row bg-tactical-950 border items-center border-tactical-800 rounded-sm" style={{ padding: ms(10), gap: hs(8) }}>
                                    <View className="bg-tactical-950 border border-tactical-800 rounded-sm items-center justify-center" style={{ padding: ms(10), width: ms(38), height: ms(38) }}>
                                        <EducationIcon width={ms(24)} height={ms(24)} color="#F59E0B" />
                                    </View>
                                    <View className="flex-1" style={{ gap: vs(4) }}>
                                        <Text className="text-white/50 font-mono-extrabold uppercase" style={{ fontSize: ms(10) }}>education</Text>
                                        <Text className="text-white font-sans-extrabold" style={{ fontSize: ms(12) }} numberOfLines={1}>
                                            {education.id && courseNames[education.id.toString()] ? courseNames[education.id.toString()] : `Course #${education.id}`}
                                        </Text>
                                    </View>
                                    <View className="items-end" style={{ gap: vs(4) }}>
                                        <Text className="text-white/50 font-sans-extrabold uppercase" style={{ fontSize: ms(10) }}>ETA</Text>
                                        <Text className="text-accent-yellow font-mono uppercase" style={{ fontSize: ms(12) }}>{educationTimeString}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </Card>
                </View>
            </ScrollView>

            {/* Changelog Modal - Half Screen Bottom Sheet */}
            <Modal
                visible={showChangelog}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowChangelog(false)}
            >
                <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                    <Pressable
                        style={{ flex: 1 }}
                        onPress={() => setShowChangelog(false)}
                    />
                    <View style={{ height: Dimensions.get('window').height / 1.28 }}>
                        <Changelog onClose={() => setShowChangelog(false)} />
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
    );
}

// --- Helper Components untuk mempersingkat kode dan memastikan konsistensi scale ---

const StatusBox = ({ icon, label, labelColor, current, max, timer, fillColor }: any) => (
    <View className="flex-1 bg-tactical-950 border border-tactical-800 rounded-sm" style={{ paddingTop: vs(10) }}>
        <View style={{ paddingHorizontal: hs(10) }}>
            <View className="flex-row items-center" style={{ gap: hs(4) }}>
                {icon}
                <Text className={`${labelColor} uppercase`} style={{ fontSize: ms(10), fontFamily: 'Inter_900Black' }}>{label}</Text>
            </View>
            <View className="flex-row items-end" style={{ gap: hs(4) }}>
                {/* PAKAI Inter_900Black biar TEBAL */}
                <Text className="text-white" style={{ fontSize: ms(18), fontFamily: 'JetBrainsMono_800ExtraBold' }}>
                    {formatNumber(current)}
                </Text>
                <Text className="text-white/50 font-mono" style={{ fontSize: ms(10), paddingBottom: vs(4) }}>
                    {timer > 0 ? formatTimeRemaining(timer) : `/${formatNumber(max)}`}
                </Text>
            </View>
        </View>
        <View style={{ marginTop: vs(10) }}>
            <ProgressBar
                value={current / (max || 1)}
                height={ms(4)}
                trackClassName="bg-tactical-950"
                fillClassName={fillColor}
            />
        </View>
    </View>
);

const CooldownBox = ({ icon, label, timer }: any) => (
    <View className="flex-1 bg-tactical-950 border border-tactical-800 rounded-sm" style={{ paddingTop: vs(10) }}>
        <View style={{ paddingHorizontal: hs(10) }}>
            <View className="flex-row items-center" style={{ gap: hs(4) }}>
                {icon}
                <Text className="text-white/50 uppercase" style={{ fontSize: ms(10), fontFamily: 'Inter_900Black' }}>{label}</Text>
            </View>
            <Text className={`uppercase ${timer === 0 ? 'text-accent-green' : 'text-white'}`} style={{ fontSize: ms(10), fontFamily: 'JetBrainsMono_400Regular' }}>
                {formatTimeRemaining(timer)}
            </Text>
        </View>
        <View style={{ marginTop: vs(10) }}>
            <ProgressBar
                value={timer === 0 ? 1 : 0.3}
                height={ms(4)}
                trackClassName="bg-tactical-950"
                fillClassName={timer === 0 ? "bg-accent-green" : "bg-accent-red"}
            />
        </View>
    </View>
);