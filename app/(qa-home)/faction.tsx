import { Card } from "@/src/components/ui/card";
import { useRouter } from "expo-router";
import QaOthers from '../../assets/icons/qa-others.svg';

import { ManageShortcutsModal } from "../../src/components/modals/manage-shortcuts-modal";



import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { AVAILABLE_FACTION_SHORTCUTS, DEFAULT_FACTION_SHORTCUTS } from "../../src/constants/shortcuts";
import { syncFactionData } from "../../src/services/faction-service";
import { FactionBasicData, RankedWarsResponse, fetchFactionBasic, fetchRankedWars, formatTimeRemaining } from "../../src/services/torn-api";

import { LinearGradient } from "expo-linear-gradient";
import { Image, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GridPattern } from "../../src/components/ui/grid-pattern";
import { TitleBar } from "../../src/components/ui/title-bar";
import { horizontalScale as hs, moderateScale as ms, verticalScale as vs } from "../../src/utils/responsive";

export default function Faction() {
    const router = useRouter();
    const [isShortcutModalVisible, setIsShortcutModalVisible] = useState(false);

    const [activeShortcuts, setActiveShortcuts] = useState<string[]>(DEFAULT_FACTION_SHORTCUTS);
    const [factionData, setFactionData] = useState<FactionBasicData | null>(null);
    const [rankedWars, setRankedWars] = useState<RankedWarsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadShortcuts();
        loadFactionData();
    }, []);

    const loadFactionData = async () => {
        setIsLoading(true);
        const [basic, wars] = await Promise.all([
            fetchFactionBasic(),
            fetchRankedWars()
        ]);
        if (basic) {
            setFactionData(basic);
            // Sync faction data to Supabase
            syncFactionData(basic).catch(err => console.error('Failed to sync faction:', err));
        }
        if (wars) setRankedWars(wars);
        setIsLoading(false);
    };

    const loadShortcuts = async () => {
        try {
            let stored: string | null = null;
            if (Platform.OS === "web") {
                stored = localStorage.getItem("faction_shortcuts");
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
                localStorage.setItem("faction_shortcuts", JSON.stringify(newShortcuts));
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
                        {/* Background Image - Absolute to fill container */}
                        <Image
                            className="mask-b-from-50%"
                            source={require("../../assets/images/tag-team.jpg")}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '50%' }}
                            resizeMode="cover"
                        />
                        <LinearGradient
                            colors={['transparent', '#1C1917']}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, height: '50%' }}
                        />

                        {/* Content dictated height */}
                        <View style={{ padding: hs(16), gap: vs(4) }}>
                            {/* Header */}
                            <View className="flex-row justify-between items-center">
                                <View className="items-start gap-1">
                                    <Text className="text-white/50 text-[10px]" style={{ fontFamily: "Inter_500Medium" }}>Leader</Text>
                                    <Text className="text-white text-xl uppercase" style={{ fontFamily: "JetBrainsMono_400Regular" }}>{factionData?.members[String(factionData.leader)]?.name || "Unknown"}</Text>
                                </View>
                                <View className="items-end gap-1">
                                    <Text className="text-white/50 text-[10px]" style={{ fontFamily: "Inter_500Medium" }}>Co-Leader</Text>
                                    <Text className="text-white text-xl uppercase" style={{ fontFamily: "JetBrainsMono_400Regular" }}>{factionData?.members[String(factionData['co-leader'])]?.name || "Unknown"}</Text>
                                </View>
                            </View>

                            <Text className="text-accent-yellow text-4xl text-center" style={{ fontFamily: "Inter_800ExtraBold" }}>{factionData?.name || "Loading..."}</Text>

                            {/* Footer Stats */}
                            <View className="flex-row justify-between items-center">
                                <View className="items-start gap-1">
                                    <Text className="text-white/50 text-[10px]" style={{ fontFamily: "Inter_500Medium" }}>Best Chain</Text>
                                    <Text className="text-white text-xl" style={{ fontFamily: "JetBrainsMono_400Regular" }}>{factionData?.best_chain?.toLocaleString() || "0"}</Text>
                                </View>
                                <View className="items-start gap-1">
                                    <Text className="text-white/50 text-[10px]" style={{ fontFamily: "Inter_500Medium" }}>Territories</Text>
                                    <Text className="text-white text-xl" style={{ fontFamily: "JetBrainsMono_400Regular" }}>{factionData?.['territory_wars'] ? Object.keys(factionData['territory_wars']).length : 0}</Text>
                                </View>
                                <View className="items-start gap-1">
                                    <Text className="text-white/50 text-[10px]" style={{ fontFamily: "Inter_500Medium" }}>Treaties</Text>
                                    <Text className="text-white text-xl" style={{ fontFamily: "JetBrainsMono_400Regular" }}>{factionData?.peace ? Object.keys(factionData.peace).length : 0}</Text>
                                </View>
                                <View className="items-start gap-1">
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
                        <Text className="uppercase text-white" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(18) }}>Active</Text>
                    </Card>
                    <Card className="flex-1" style={{ padding: vs(16) }}>
                        <Text className="uppercase text-accent-yellow" style={{ fontFamily: "Inter_800ExtraBold", fontSize: ms(12) }}>Chain</Text>
                        <View className="flex-row justify-between items-end">
                            <Text className="uppercase text-white" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(18) }}>861/1000</Text>
                            <Text className="text-white/50" style={{ fontFamily: "Inter_400Regular", fontSize: ms(10) }}>05:23:24</Text>
                        </View>
                    </Card>
                </View>

                {/* War Card */}
                {/* War Card */}
                <TouchableOpacity onPress={() => router.push('/(qa-factions)/ranked-war')}>
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
                                <Text className="text-accent-red" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(28) }}>{rankedWars?.rankedwars[0]?.factions.find(f => f.id !== factionData?.ID)?.score || 0}</Text>
                                <View className="flex-col items-center">
                                    <Text className="text-white/50" style={{ fontFamily: "Inter_400Regular", fontSize: ms(10) }}>Lead Target</Text>
                                    <Text className="text-white" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(16) }}>{(Math.abs((rankedWars?.rankedwars[0]?.factions[0]?.score || 0) - (rankedWars?.rankedwars[0]?.factions[1]?.score || 0))).toLocaleString()}/{rankedWars?.rankedwars[0]?.target || 0}</Text>
                                </View>
                                <Text className="text-accent-green" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(28) }}>{rankedWars?.rankedwars[0]?.factions.find(f => f.id === factionData?.ID)?.score || 0}</Text>
                            </View>
                            <View className="flex-row justify-between items-center">
                                <Text className="text-white" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(12) }}>{rankedWars?.rankedwars[0]?.factions.find(f => f.id !== factionData?.ID)?.chain || 0}/25</Text>
                                <Text className="text-accent-yellow" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(12) }}>{formatTimeRemaining(rankedWars?.rankedwars[0]?.end ? rankedWars.rankedwars[0].end - Date.now() / 1000 : 0)}</Text>
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

                {/* Member List */}
                <View className="flex-row justify-between items-center">
                    <Text className="uppercase font-sans-extrabold text-white/50" style={{ fontSize: ms(14) }}>member list</Text>
                    <TouchableOpacity onPress={() => router.push('/(qa-factions)/members')}>
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
                                <Text className="text-white/50 CamelCase" style={{ fontFamily: "Inter_500Medium", fontSize: ms(10) }}>· {member.days_in_faction} Days</Text>
                            </View>
                            <Text className="text-white uppercase" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(16) }}>{member.name}</Text>
                        </View>
                        <View className="flex-col justify-between items-end">
                            <Text className={`${member.status.color === 'red' ? 'text-accent-red' : member.status.color === 'blue' ? 'text-accent-blue' : 'text-accent-green'} CamelCase`} style={{ fontFamily: "Inter_600SemiBold", fontSize: ms(14) }}>{member.status.state === 'Okay' ? 'Okay' : member.status.description}</Text>
                            {member.status.until > 0 && (
                                <Text className="text-white CamelCase" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(10) }}>{formatTimeRemaining(member.status.until - Date.now() / 1000)}</Text>
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