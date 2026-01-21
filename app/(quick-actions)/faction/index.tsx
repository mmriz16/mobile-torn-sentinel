import QaOthers from '@/assets/icons/qa-others.svg';
import { Card } from "@/src/components/ui/card";
import { useRouter } from "expo-router";

import { ManageShortcutsModal } from "@/src/components/modals/manage-shortcuts-modal";

import { AVAILABLE_FACTION_SHORTCUTS, DEFAULT_FACTION_SHORTCUTS } from "@/src/constants/shortcuts";
import { syncFactionData } from "@/src/services/faction-service";
import { FactionBasicData, fetchFactionDataCombined, formatFactionStatus, formatTimeDetailed, formatTimeRemaining, RankedWarsResponse, TornUserData } from "@/src/services/torn-api";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";

import { GridPattern } from "@/src/components/ui/grid-pattern";
import { TitleBar } from "@/src/components/ui/title-bar";
import { horizontalScale as hs, moderateScale as ms, verticalScale as vs } from "@/src/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ... existing imports ...

// ... inside Faction component ...


export default function Faction() {
    const router = useRouter();
    const [isShortcutModalVisible, setIsShortcutModalVisible] = useState(false);

    const [activeShortcuts, setActiveShortcuts] = useState<string[]>(DEFAULT_FACTION_SHORTCUTS);
    const [factionData, setFactionData] = useState<FactionBasicData | null>(null);
    const [rankedWars, setRankedWars] = useState<RankedWarsResponse | null>(null);
    const [userData, setUserData] = useState<TornUserData | null>(null);
    // Chain end time (timestamp in ms) for countdown calculation
    const [chainEndTime, setChainEndTime] = useState(0);
    // Tick for countdowns
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        loadShortcuts();
        loadFactionData();
    }, []);

    const loadFactionData = async () => {
        // OPTIMIZED: Combined parallel fetch
        const { factionBasic: basic, rankedWars: wars, userData: user } = await fetchFactionDataCombined();

        if (basic) {
            setFactionData(basic);
            // Sync faction data to Supabase
            syncFactionData(basic).catch(err => console.error('Failed to sync faction:', err));
        }
        if (wars) setRankedWars(wars);
        if (user) {
            setUserData(user);
            // Calculate chain end time from current time + timeout seconds
            if (user.bars?.chain?.timeout && user.bars.chain.timeout > 0) {
                setChainEndTime(Date.now() + (user.bars.chain.timeout * 1000));
            } else {
                setChainEndTime(0);
            }
        }
    };

    const loadShortcuts = async () => {
        try {
            let stored: string | null = null;
            if (Platform.OS === "web") {
                try {
                    stored = localStorage.getItem("faction_shortcuts");
                } catch (e) {
                    console.warn("localStorage not available:", e);
                }
            } else {
                stored = await SecureStore.getItemAsync("faction_shortcuts");
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
                try {
                    localStorage.setItem("faction_shortcuts", JSON.stringify(newShortcuts));
                } catch (e) {
                    console.warn("localStorage not available:", e);
                }
            } else {
                await SecureStore.setItemAsync("faction_shortcuts", JSON.stringify(newShortcuts));
            }
        } catch (e) {
            console.error("Failed to save shortcuts", e);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <TitleBar title="Faction" />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: hs(16), gap: vs(10) }}>
                {/* Faction Info */}
                <Card>
                    <View className="relative overflow-hidden">
                        {/* Content dictated height */}
                        <View style={{ padding: hs(16), gap: vs(10) }}>
                            {/* Header */}
                            <View className="flex-row justify-between items-center">
                                <View className="items-start">
                                    <Text className="text-white/50 text-[10px]" style={{ fontFamily: "Inter_500Medium" }}>Leader</Text>
                                    <Text className="text-white text-xl uppercase" style={{ fontFamily: "JetBrainsMono_400Regular" }}>{factionData?.members[String(factionData.leader)]?.name || "Unknown"}</Text>
                                </View>
                                <View className="items-end">
                                    <Text className="text-white/50 text-[10px]" style={{ fontFamily: "Inter_500Medium" }}>Co-Leader</Text>
                                    <Text className="text-white text-xl uppercase" style={{ fontFamily: "JetBrainsMono_400Regular" }}>{factionData?.members[String(factionData['co-leader'])]?.name || "Unknown"}</Text>
                                </View>
                            </View>

                            <Text className="text-accent-yellow text-4xl text-center uppercase" style={{ fontFamily: "Inter_800ExtraBold" }}>{factionData?.name || "Loading..."}</Text>

                            {/* Footer Stats */}
                            <View className="flex-row justify-between items-center">
                                <View className="items-start">
                                    <Text className="text-white/50 text-[10px]" style={{ fontFamily: "Inter_500Medium" }}>Best Chain</Text>
                                    <Text className="text-white text-xl" style={{ fontFamily: "JetBrainsMono_400Regular" }}>{factionData?.best_chain?.toLocaleString('en-US') || "0"}</Text>
                                </View>
                                <View className="items-start">
                                    <Text className="text-white/50 text-[10px]" style={{ fontFamily: "Inter_500Medium" }}>Territories</Text>
                                    <Text className="text-white text-xl" style={{ fontFamily: "JetBrainsMono_400Regular" }}>{factionData?.['territory_wars'] ? Object.keys(factionData['territory_wars']).length : 0}</Text>
                                </View>
                                <View className="items-start">
                                    <Text className="text-white/50 text-[10px]" style={{ fontFamily: "Inter_500Medium" }}>Treaties</Text>
                                    <Text className="text-white text-xl" style={{ fontFamily: "JetBrainsMono_400Regular" }}>{factionData?.peace ? Object.keys(factionData.peace).length : 0}</Text>
                                </View>
                                <View className="items-start">
                                    <Text className="text-white/50 text-[10px]" style={{ fontFamily: "Inter_500Medium" }}>Member</Text>
                                    <Text className="text-white text-xl" style={{ fontFamily: "JetBrainsMono_400Regular" }}>{factionData ? `${Object.keys(factionData.members).length}/${factionData.capacity}` : "0/0"}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </Card>


                {/* Faction Card */}
                <View className="flex-row" style={{ gap: vs(10) }}>
                    <Card className="flex-1" style={{ padding: vs(16) }}>
                        <Text className="uppercase text-accent-yellow" style={{ fontFamily: "Inter_800ExtraBold", fontSize: ms(12) }}>Ranked War</Text>
                        {(() => {
                            const hasActiveWar = factionData?.rank_wars && Object.keys(factionData.rank_wars).length > 0;
                            // Check if there is an upcoming war (start time in future)
                            const upcomingWar = rankedWars?.rankedwars?.find(w => w.start > Math.floor(Date.now() / 1000));

                            if (hasActiveWar) {
                                return (
                                    <Text className="uppercase text-white" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(18) }}>
                                        ACTIVE
                                    </Text>
                                );
                            } else if (upcomingWar) {
                                return (
                                    <Text className="uppercase text-white" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(18) }}>
                                        PREPARING
                                    </Text>
                                );
                            } else {
                                return (
                                    <Text className="uppercase text-white" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(18) }}>
                                        INACTIVE
                                    </Text>
                                );
                            }
                        })()}
                    </Card>
                    <Card className="flex-1" style={{ padding: vs(16) }}>
                        <Text className="uppercase text-accent-yellow" style={{ fontFamily: "Inter_800ExtraBold", fontSize: ms(12) }}>Chain</Text>
                        {(() => {
                            const currentChain = userData?.bars?.chain?.current ?? 0;
                            const CHAIN_MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
                            const nextMilestone = CHAIN_MILESTONES.find(m => m > currentChain) || 100000;
                            // Calculate remaining time from stored end time
                            const chainTimeLeft = chainEndTime > 0 ? Math.max(0, Math.floor((chainEndTime - Date.now()) / 1000)) : 0;
                            return (
                                <View className="flex-row justify-between items-end">
                                    <Text className="uppercase text-white" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(18) }}>
                                        {currentChain.toLocaleString('en-US')}/{nextMilestone.toLocaleString('en-US')}
                                    </Text>
                                    <Text className="text-white/50" style={{ fontFamily: "Inter_400Regular", fontSize: ms(10) }}>
                                        {chainTimeLeft > 0 ? formatTimeRemaining(chainTimeLeft) : ''}
                                    </Text>
                                </View>
                            );
                        })()}
                    </Card>
                </View>

                {/* War Card */}
                <TouchableOpacity onPress={() => router.push('./ranked-war' as any)}>
                    <Card>
                        <View className="relative overflow-hidden flex-row justify-between items-center border-b border-tactical-800" style={{ padding: vs(16) }}>
                            <LinearGradient
                                colors={['#F43F5E', '#1C1917', '#10B981']}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.2 }}
                            />
                            <Text className="uppercase text-accent-red" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(12) }}>{rankedWars?.rankedwars[0]?.factions.find(f => f.id !== factionData?.ID)?.name || "Unknown"}</Text>
                            <Text className="uppercase text-accent-green" style={{ fontFamily: "Inter_400Regular", fontSize: ms(12) }}>{factionData?.name || "Us"}</Text>
                        </View>
                        <View style={{ padding: vs(16), gap: vs(4) }}>
                            <View className="flex-row justify-between items-center">
                                <Text className="text-accent-red" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(28) }}>{(rankedWars?.rankedwars[0]?.factions.find(f => f.id !== factionData?.ID)?.score || 0).toLocaleString('en-US')}</Text>
                                <View className="flex-col items-center">
                                    <Text className="text-white/50" style={{ fontFamily: "Inter_400Regular", fontSize: ms(10) }}>Lead Target</Text>
                                    <Text className="text-white" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(16) }}>{(Math.abs((rankedWars?.rankedwars[0]?.factions[0]?.score || 0) - (rankedWars?.rankedwars[0]?.factions[1]?.score || 0))).toLocaleString('en-US')}/{(rankedWars?.rankedwars[0]?.target || 0).toLocaleString('en-US')}</Text>
                                </View>
                                <Text className="text-accent-green" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(28) }}>{(rankedWars?.rankedwars[0]?.factions.find(f => f.id === factionData?.ID)?.score || 0).toLocaleString('en-US')}</Text>
                            </View>
                            <View className="flex-row justify-between items-center">
                                <Text className="text-white" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(12) }}>{rankedWars?.rankedwars[0]?.factions.find(f => f.id !== factionData?.ID)?.chain || 0}/25</Text>
                                <Text className="text-accent-yellow" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(12) }}>
                                    {(() => {
                                        const warStart = rankedWars?.rankedwars[0]?.start || 0;
                                        const warEnd = rankedWars?.rankedwars[0]?.end || 0;
                                        const now = Math.floor(Date.now() / 1000);

                                        // 1. Upcoming War
                                        if (now < warStart) {
                                            const timeUntilStart = warStart - now;
                                            return formatTimeDetailed(timeUntilStart);
                                        }

                                        // 2. Ongoing War (end might be 0 if unknown/indefinite, or in future)
                                        // If end is 0, we assume it's ongoing
                                        if (warEnd === 0 || now < warEnd) {
                                            if (warEnd === 0) return "Ongoing"; // Fallback if no end time
                                            const timeLeft = warEnd - now;
                                            return formatTimeDetailed(timeLeft);
                                        }

                                        // 3. Ended War
                                        const totalDuration = warEnd - warStart;
                                        return totalDuration > 0 ? formatTimeDetailed(totalDuration) : 'Ended';
                                    })()}
                                </Text>
                                <Text className="text-white" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(12) }}>{rankedWars?.rankedwars[0]?.factions.find(f => f.id === factionData?.ID)?.chain || 0}/25</Text>
                            </View>
                        </View>
                    </Card>
                </TouchableOpacity>

                {/* Quick Actions */}
                <View className="flex-row justify-between items-center">
                    <Text className="uppercase font-sans-extrabold text-white/50" style={{ fontSize: ms(14) }}>quick actions</Text>
                    <TouchableOpacity onPress={() => setIsShortcutModalVisible(true)}>
                        <Text className="uppercase font-mono text-accent-yellow" style={{ fontSize: ms(10) }}>edit</Text>
                    </TouchableOpacity>
                </View>
                <View className="flex-row" style={{ gap: hs(10) }}>
                    {[
                        ...activeShortcuts.map(id => AVAILABLE_FACTION_SHORTCUTS.find(s => s.id === id)).filter(Boolean),
                        { id: 'others', label: 'Others', icon: QaOthers, isSvg: true, route: '/(quick-actions)/others' as const }
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

                {/* Member List */}
                <View className="flex-row justify-between items-center">
                    <Text className="uppercase font-sans-extrabold text-white/50" style={{ fontSize: ms(14) }}>member list</Text>
                    <TouchableOpacity onPress={() => router.push('./members' as any)}>
                        <Text className="uppercase font-mono text-accent-yellow" style={{ fontSize: ms(10) }}>See all</Text>
                    </TouchableOpacity>
                </View>
                {factionData && Object.entries(factionData.members).map(([id, member]) => ({ ...member, id: Number(id) })).sort((a, b) => {
                    // Prioritize Leader/Co-Leader, then by level
                    const roles: Record<string, number> = { 'Leader': 1, 'Co-leader': 2, 'Admin': 3 };
                    const roleA = roles[a.position] || 99;
                    const roleB = roles[b.position] || 99;
                    if (roleA !== roleB) return roleA - roleB;
                    return b.level - a.level;
                }).slice(0, 3).map((member) => (
                    <Card key={member.id} className="flex-row justify-between items-center" style={{ padding: vs(16) }}>
                        <View className="flex-col justify-between">
                            <View className="flex-row" style={{ gap: vs(4) }}>
                                <Text className="text-white/50 CamelCase bg-tactical-950" style={{ fontFamily: "Inter_500Medium", fontSize: ms(10), paddingVertical: vs(2), paddingHorizontal: hs(4) }}>Level {member.level}</Text>
                                <Text className="text-white/50 CamelCase" style={{ fontFamily: "Inter_500Medium", fontSize: ms(10) }}>· {member.position}</Text>
                                <Text className="text-white/50 CamelCase" style={{ fontFamily: "Inter_500Medium", fontSize: ms(10) }}>· {member.days_in_faction.toLocaleString('en-US')} Days</Text>
                            </View>
                            <Text className="text-white uppercase" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(16) }}>{member.name}</Text>
                        </View>
                        <View className="flex-col justify-between items-end">
                            <Text className={`${member.status.color === 'red' ? 'text-accent-red' : member.status.color === 'blue' ? 'text-accent-blue' : 'text-accent-green'}`} style={{ fontFamily: "Inter_600SemiBold", fontSize: ms(14) }}>{formatFactionStatus(member.status)}</Text>
                            {member.status.until > 0 && (
                                <Text className="text-white CamelCase" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(10) }}>{formatTimeRemaining(member.status.until - Math.floor(Date.now() / 1000))}</Text>
                            )}
                        </View>
                    </Card>
                ))}
            </ScrollView>

            <ManageShortcutsModal
                visible={isShortcutModalVisible}
                onClose={() => setIsShortcutModalVisible(false)}
                currentShortcuts={activeShortcuts}
                onSave={handleSaveShortcuts}
                availableShortcuts={AVAILABLE_FACTION_SHORTCUTS}
            />
        </SafeAreaView >
    );
}