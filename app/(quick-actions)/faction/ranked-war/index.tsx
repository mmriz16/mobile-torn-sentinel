
import { Card } from "@/src/components/ui/card";
import { GridPattern } from "@/src/components/ui/grid-pattern";
import { TitleBar } from "@/src/components/ui/title-bar";
import { fetchRankedWarMembersFromDB, fetchRankedWarOverviewFromDB, RankedWarMember, RankedWarOverview, toggleRankedWarAlert } from "@/src/services/faction-service";
import { FactionBasicData, fetchFactionDataCombined, formatChainStatus, formatTimeDetailed, RankedWarsResponse, TornUserData } from "@/src/services/torn-api";
import { moderateScale as ms, verticalScale as vs } from '@/src/utils/responsive';
import { LinearGradient } from "expo-linear-gradient";
import { Bell, BellOff } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";



// Format time remaining (seconds to HH:MM:SS)
const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return "Ready";
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    if (hours > 0) {
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// Sort members: Hospital/Jail -> Traveling/Abroad -> Okay. Then by Score.
const sortMembers = (members: RankedWarMember[]) => {
    const getPriority = (status: string) => {
        switch (status) {
            case 'Hospital': return 0;
            case 'Jail': return 0;
            case 'Traveling': return 1;
            case 'Abroad': return 1;
            case 'Okay': return 2;
            default: return 2;
        }
    };

    return [...members].sort((a, b) => {
        const prioA = getPriority(a.status_state);
        const prioB = getPriority(b.status_state);

        if (prioA !== prioB) return prioA - prioB;
        return b.score - a.score; // Secondary sort by score
    });
};

export default function RankedWar() {
    // State for DB data
    const [dbOverview, setDbOverview] = useState<RankedWarOverview | null>(null);

    // State from API (Cached) for Header Cards
    const [factionData, setFactionData] = useState<FactionBasicData | null>(null);
    const [rankedWars, setRankedWars] = useState<RankedWarsResponse | null>(null);
    const [userData, setUserData] = useState<TornUserData | null>(null);
    const [chainEndTime, setChainEndTime] = useState(0);

    // Member list state
    const [selectedFactionId, setSelectedFactionId] = useState<number | null>(null);
    const [members, setMembers] = useState<RankedWarMember[]>([]);
    const [activeAlerts, setActiveAlerts] = useState<number[]>([]);
    const [displayedCount, setDisplayedCount] = useState(10);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // Cache for members per faction to avoid refetching
    const membersCacheRef = useRef<Record<number, RankedWarMember[]>>({});

    // Memoized sorted members to avoid re-sorting on every render
    const sortedMembers = useMemo(() => sortMembers(members), [members]);

    // Tick counter for timer updates (used to force re-render for countdowns)
    const [, setTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        loadDataFromDB();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load members when selected faction changes
    useEffect(() => {
        if (selectedFactionId) {
            setDisplayedCount(10);
            loadMembers(selectedFactionId);
        }
    }, [selectedFactionId]);

    const loadDataFromDB = async () => {
        setIsInitialLoading(true);

        // 1. Fetch Overview (Factions & Scores) from DB
        const overview = await fetchRankedWarOverviewFromDB();
        setDbOverview(overview);

        if (overview && overview.factions.length > 0) {
            // Default select the first faction (or the opponent if we had logic for it)
            // Just select the first one for now
            if (!selectedFactionId) {
                setSelectedFactionId(overview.factions[0].id);
            }
        }

        // 2. Fetch Header Data (Cached API)
        const { factionBasic: basic, rankedWars: wars, userData: user } = await fetchFactionDataCombined();
        if (basic) setFactionData(basic);
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

        setIsInitialLoading(false);
    };

    const loadMembers = async (factionId: number) => {
        // Check cache first
        if (membersCacheRef.current[factionId]) {
            setMembers(membersCacheRef.current[factionId]);
            return;
        }

        const data = await fetchRankedWarMembersFromDB(factionId);
        membersCacheRef.current[factionId] = data; // Cache it
        setMembers(data);
    };

    const handleToggleAlert = async (memberId: number, factionId: number) => {
        // Assuming currentUserId might be null if we don't fetch user data
        // For now, we need to get it from somewhere. 
        // If we strictly don't hit API, we might rely on a stored user ID or fetch from 'users' table if we knew the auth ID
        // For now, let's skip the check if null, or assume it's stored.
        // But previously we fetched it.
        const storedUserId = 2085351; // TEMPORARY OR FETCH FROM STORAGE?
        // Ideally we should get this from SecureStore or Supabase auth
        if (storedUserId) {
            const newState = await toggleRankedWarAlert(storedUserId, memberId, factionId);
            if (newState) {
                setActiveAlerts(prev => {
                    if (prev.includes(memberId)) return prev;
                    return [...prev, memberId];
                });
            } else {
                setActiveAlerts(prev => prev.filter(id => id !== memberId));
            }
        }
    };

    // Helper functions for member card styling
    const getStatusColor = (state: string) => {
        switch (state) {
            case 'Hospital': return 'text-accent-red';
            case 'Jail': return 'text-accent-yellow';
            case 'Traveling':
            case 'Abroad': return 'text-accent-blue';
            case 'Okay':
            default: return 'text-accent-green';
        }
    };

    const getCardBgColor = (state: string) => {
        switch (state) {
            case 'Hospital': return 'bg-[#321D1E] border-accent-red/10';
            case 'Jail': return 'bg-[#2C2A1B] border-accent-yellow/10';
            case 'Traveling':
            case 'Abroad': return 'bg-[#1B272C] border-accent-blue/10';
            case 'Okay':
            default: return 'bg-[#1B2922] border-accent-green/10';
        }
    };

    const getStatusText = (state: string) => {
        switch (state) {
            case 'Hospital': return 'HOSPITALIZED';
            case 'Traveling': return 'TRAVELING';
            case 'Abroad': return 'ABROAD';
            case 'Jail': return 'JAILED';
            case 'Okay':
            default: return 'OKAY';
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <TitleBar title="Ranked War" />
            <FlatList
                data={sortedMembers.slice(0, displayedCount)}
                keyExtractor={(item) => item.user_id.toString()}
                contentContainerStyle={{ padding: vs(16), gap: vs(10) }}
                onEndReached={() => {
                    if (displayedCount < sortedMembers.length && !isLoadingMore) {
                        setIsLoadingMore(true);
                        // Instant load more - no artificial delay
                        setDisplayedCount(prev => prev + 10);
                        setIsLoadingMore(false);
                    }
                }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    isLoadingMore ? (
                        <View className="items-center py-4">
                            <ActivityIndicator size="small" color="#F59E0B" />
                        </View>
                    ) : null
                }
                ListHeaderComponent={
                    <View style={{ gap: vs(10) }}>
                        {/* Faction Card */}
                        <View className="flex-row" style={{ gap: vs(10) }}>
                            <Card className="flex-1" style={{ padding: vs(16) }}>
                                <Text className="uppercase text-accent-yellow" style={{ fontFamily: "Inter_800ExtraBold", fontSize: ms(12) }}>Ranked War</Text>
                                <Text className="uppercase text-white" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(18) }}>
                                    {dbOverview ? "ACTIVE" : "INACTIVE"}
                                </Text>
                            </Card>
                            <Card className="flex-1" style={{ padding: vs(16) }}>
                                <Text className="uppercase text-accent-yellow" style={{ fontFamily: "Inter_800ExtraBold", fontSize: ms(12) }}>Chain</Text>
                                {/* Chain data not available in DB currently */}
                                <Text className="text-white/30" style={{ fontFamily: "Inter_400Regular", fontSize: ms(10) }}>
                                    {/* Chain data from User Data */}
                                    {(() => {
                                        const currentChain = userData?.bars?.chain?.current ?? 0;
                                        const CHAIN_MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
                                        const nextMilestone = CHAIN_MILESTONES.find(m => m > currentChain) || 100000;
                                        // Calculate remaining time from stored end time
                                        const chainTimeLeft = chainEndTime > 0 ? Math.max(0, Math.floor((chainEndTime - Date.now()) / 1000)) : 0;
                                        return (
                                            <View className="flex-1 w-full flex-row justify-between items-end">
                                                <Text className="uppercase text-white" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(18) }}>
                                                    {currentChain.toLocaleString('en-US')}/{nextMilestone.toLocaleString('en-US')}
                                                </Text>
                                                <Text className="text-white/50" style={{ fontFamily: "Inter_400Regular", fontSize: ms(10) }}>
                                                    {chainTimeLeft > 0 ? formatTimeRemaining(chainTimeLeft) : ''}
                                                </Text>
                                            </View>
                                        );
                                    })()}
                                </Text>
                            </Card>
                        </View>

                        {/* War Card*/}
                        {(() => {
                            // Use DB overview if available for simple Score view, or API data for full view
                            // Matching faction/index.tsx logic exactly
                            const hasActiveWar = factionData?.rank_wars && Object.keys(factionData.rank_wars).length > 0;
                            const upcomingWar = rankedWars?.rankedwars?.find(w => w.start > Math.floor(Date.now() / 1000));

                            // Only show if DB overview exists (min requirement) OR we have API data
                            if (!dbOverview && !hasActiveWar && !upcomingWar) return null;

                            // Prefer API data for rich display, fallback to DB
                            const f1 = dbOverview?.factions[0];
                            const f2 = dbOverview?.factions[1];

                            // If we have full API data, use the rich card
                            if (factionData && rankedWars && rankedWars.rankedwars.length > 0) {
                                const war = rankedWars.rankedwars[0];
                                const myFaction = war.factions.find(f => f.id === factionData.ID);
                                const opponent = war.factions.find(f => f.id !== factionData.ID);

                                if (myFaction && opponent) {
                                    return (
                                        <Card>
                                            <View className="relative overflow-hidden flex-row justify-between items-center border-b border-tactical-800" style={{ padding: vs(16) }}>
                                                <LinearGradient
                                                    colors={['rgba(244, 63, 94, .3)', 'rgba(0, 0, 0, 1)', 'rgba(16, 185, 129, .3)']}
                                                    start={{ x: 0, y: 0.5 }}
                                                    end={{ x: 1, y: 0.5 }}
                                                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 1 }}
                                                />
                                                <Text className="uppercase text-accent-red" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(12), zIndex: 10 }}>{opponent.name}</Text>
                                                <Text className="uppercase text-accent-green" style={{ fontFamily: "Inter_400Regular", fontSize: ms(12), zIndex: 10 }}>{myFaction.name}</Text>
                                            </View>
                                            <View style={{ padding: vs(16), gap: vs(4) }}>
                                                <View className="flex-row justify-between items-center">
                                                    <Text className="text-accent-red" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(28) }}>{opponent.score.toLocaleString()}</Text>
                                                    <View className="flex-col items-center">
                                                        <Text className="text-white/50" style={{ fontFamily: "Inter_400Regular", fontSize: ms(10) }}>Lead Target</Text>
                                                        <Text className="text-white" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(16) }}>
                                                            {Math.abs(myFaction.score - opponent.score).toLocaleString()}/{war.target.toLocaleString()}
                                                        </Text>
                                                    </View>
                                                    <Text className="text-accent-green" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(28) }}>{myFaction.score.toLocaleString()}</Text>
                                                </View>
                                                <View className="flex-row justify-between items-center">
                                                    <Text className="text-white" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(12) }}>{formatChainStatus(opponent.chain)}</Text>
                                                    <Text className="text-accent-yellow" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(12) }}>
                                                        {(() => {
                                                            const now = Math.floor(Date.now() / 1000);
                                                            if (now < war.start) return formatTimeDetailed(war.start - now);
                                                            if (war.end === 0 || now < war.end) return war.end === 0 ? "Ongoing" : formatTimeDetailed(war.end - now);
                                                            return formatTimeDetailed(war.end - war.start);
                                                        })()}
                                                    </Text>
                                                    <Text className="text-white" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(12) }}>{formatChainStatus(myFaction.chain)}</Text>
                                                </View>
                                            </View>
                                        </Card>
                                    );
                                }
                            }

                            // Fallback to DB View if API data missing
                            if (f1 && f2) {
                                return (
                                    <Card>
                                        <View className="relative overflow-hidden flex-row justify-between items-center border-b border-tactical-800" style={{ padding: vs(16) }}>
                                            <LinearGradient
                                                colors={['rgba(244, 63, 94, .3)', 'rgba(0, 0, 0, 1)', 'rgba(16, 185, 129, .3)']}
                                                start={{ x: 0, y: 0.5 }}
                                                end={{ x: 1, y: 0.5 }}
                                                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 1 }}
                                            />
                                            <Text className="uppercase text-accent-red" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(12), zIndex: 10 }}>{f1.name}</Text>
                                            <Text className="uppercase text-accent-green" style={{ fontFamily: "Inter_400Regular", fontSize: ms(12), zIndex: 10 }}>{f2.name}</Text>
                                        </View>
                                        <View style={{ padding: vs(16), gap: vs(4) }}>
                                            <View className="flex-row justify-between items-center">
                                                <Text className="text-accent-red" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(28) }}>{f1.score.toLocaleString()}</Text>
                                                <View className="flex-col items-center">
                                                    <Text className="text-white/50" style={{ fontFamily: "Inter_400Regular", fontSize: ms(10) }}>Score Diff</Text>
                                                    <Text className="text-white" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(16) }}>
                                                        {Math.abs(f1.score - f2.score).toLocaleString()}
                                                    </Text>
                                                </View>
                                                <Text className="text-accent-green" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(28) }}>{f2.score.toLocaleString()}</Text>
                                            </View>
                                        </View>
                                    </Card>
                                );
                            }
                            return null;
                        })()}

                        {/* Members Section */}
                        <Text className="uppercase font-sans-extrabold text-white/50" style={{ fontSize: ms(14) }}>Members ({sortedMembers.length})</Text>

                        {/* Faction Navigation Tabs */}
                        {dbOverview && (
                            <View className="flex-row justify-between items-center" style={{ gap: vs(6) }}>
                                {dbOverview.factions.map((faction) => (
                                    <Pressable
                                        key={faction.id}
                                        onPress={() => setSelectedFactionId(faction.id)}
                                        className={`flex-1 items-center justify-center ${selectedFactionId === faction.id
                                            ? 'bg-accent-yellow'
                                            : 'bg-tactical-900 border border-tactical-800'
                                            }`}
                                        style={{ padding: vs(10), borderRadius: vs(8) }}
                                    >
                                        <Text
                                            className={`uppercase ${selectedFactionId === faction.id ? 'text-tactical-950' : 'text-white'}`}
                                            style={{ fontFamily: "Inter_500Medium", fontSize: ms(10) }}
                                            numberOfLines={1}
                                        >
                                            {faction.name}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>
                }

                ListEmptyComponent={
                    <View className="items-center py-4">
                        {isInitialLoading ? (
                            <ActivityIndicator size="small" color="#F59E0B" />
                        ) : (
                            <Text className="text-white/50" style={{ fontFamily: 'Inter_400Regular', fontSize: ms(12) }}>
                                {selectedFactionId ? 'No members found' : 'Select a faction to view members'}
                            </Text>
                        )}
                    </View>
                }
                renderItem={({ item: member }) => {
                    const now = Math.floor(Date.now() / 1000);
                    const timeLeft = member.status_until > now ? member.status_until - now : 0;
                    const isAlertActive = activeAlerts.includes(member.user_id);
                    const showCountdown = member.status_state === 'Hospital' || member.status_state === 'Jail';

                    return (
                        <Card
                            className={`flex-row justify-between items-center border ${getCardBgColor(member.status_state)}`}
                            style={{ padding: vs(10) }}
                        >
                            <View className="flex-col flex-1">
                                <Text className="text-white/50 bg-tactical-950 self-start" style={{ fontFamily: "Inter_500Medium", fontSize: ms(10), paddingVertical: vs(2), paddingHorizontal: vs(4) }}>
                                    Level {member.level}
                                </Text>
                                <Text className="text-white uppercase" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(16) }}>
                                    {member.name}
                                </Text>
                                <View className="flex-row items-center" style={{ gap: vs(4) }}>
                                    <View className="flex-row items-center" style={{ gap: vs(2) }}>
                                        <Text className="text-white/50 uppercase" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(10) }}>Attack:</Text>
                                        <Text className="text-white/50" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(10) }}>{member.attacks}</Text>
                                    </View>
                                    <Text className="text-white/50">·</Text>
                                    <View className="flex-row items-center" style={{ gap: vs(2) }}>
                                        <Text className="text-white/50 uppercase" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(10) }}>Score:</Text>
                                        <Text className="text-white/50" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(10) }}>{member.score.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                    </View>
                                </View>
                            </View>
                            <View className="flex-row items-center" style={{ gap: vs(10) }}>
                                <View className="flex-col items-end">
                                    <Text className={`uppercase ${getStatusColor(member.status_state)}`} style={{ fontFamily: "Inter_600SemiBold", fontSize: ms(14) }}>
                                        {getStatusText(member.status_state)}
                                    </Text>
                                    {showCountdown && timeLeft > 0 && (
                                        <Text className="text-white" style={{ fontFamily: "Inter_500Medium", fontSize: ms(10) }}>
                                            {formatTimeRemaining(timeLeft)}
                                        </Text>
                                    )}
                                </View>
                                {/* Alert Bell - Only show for Hospital status */}
                                {member.status_state === 'Hospital' && (
                                    <Pressable onPress={() => handleToggleAlert(member.user_id, member.faction_id)}>
                                        {isAlertActive ? (
                                            <Bell size={ms(20)} color="#F59E0B" />
                                        ) : (
                                            <BellOff size={ms(20)} color="rgba(255, 255, 255, 0.3)" />
                                        )}
                                    </Pressable>
                                )}
                            </View>
                        </Card>
                    );
                }}
            />
        </SafeAreaView>
    );
}