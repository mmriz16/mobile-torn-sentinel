import { Card } from "@/src/components/ui/card";
import { GridPattern } from "@/src/components/ui/grid-pattern";
import { TitleBar } from "@/src/components/ui/title-bar";
import { FactionMemberWithTravel, calculateTravelTimeLeft, fetchFactionMembersTravelStatus, syncFactionData } from "@/src/services/faction-service";
import { FactionBasicData, FactionMember, fetchFactionBasic, formatFactionStatus, formatTimeRemaining } from "@/src/services/torn-api";
import { horizontalScale as hs, moderateScale as ms, verticalScale as vs } from "@/src/utils/responsive";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Extended member type with Supabase travel data
interface MemberWithTravelData extends FactionMember {
    id: number;
    isAppUser: boolean;
    supabaseTravelArrival: number | null;
}

export default function MemberFaction() {
    const [factionData, setFactionData] = useState<FactionBasicData | null>(null);
    const [travelStatusMap, setTravelStatusMap] = useState<Map<number, FactionMemberWithTravel>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'All' | 'Okay' | 'Travel' | 'Hospital'>('All');
    // Tick state to force re-render every second for countdown
    const [tick, setTick] = useState(0);
    const [isFocused, setIsFocused] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Initial load
    useEffect(() => {
        loadData(true);
    }, []);

    // Countdown timer - update every second
    useEffect(() => {
        const countdownInterval = setInterval(() => {
            setTick(prev => prev + 1);
        }, 1000);
        return () => clearInterval(countdownInterval);
    }, []);

    // Auto-refresh data every 60 seconds
    useEffect(() => {
        const refreshInterval = setInterval(() => {
            loadData(false);
        }, 60000); // 60 seconds
        return () => clearInterval(refreshInterval);
    }, []);

    const loadData = async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        const data = await fetchFactionBasic();
        if (data) {
            setFactionData(data);
            // Sync faction data to Supabase
            syncFactionData(data).catch(err => console.error('Failed to sync faction:', err));

            // Fetch travel status from Supabase
            const travelData = await fetchFactionMembersTravelStatus(data.ID);
            const statusMap = new Map<number, FactionMemberWithTravel>();
            travelData.forEach(item => {
                statusMap.set(item.user_id, item);
            });
            setTravelStatusMap(statusMap);
        }
        if (showLoading) setIsLoading(false);
    };

    // Pull to refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData(false);
        setRefreshing(false);
    }, []);

    const sortedMembers: MemberWithTravelData[] = factionData
        ? Object.entries(factionData.members)
            .map(([id, member]) => {
                const numId = Number(id);
                const supabaseData = travelStatusMap.get(numId);
                return {
                    ...member,
                    id: numId,
                    isAppUser: !!supabaseData,
                    supabaseTravelArrival: supabaseData?.travel_arrival || null
                };
            })
            .sort((a, b) => {
                // Prioritize Leader/Co-Leader, then by level
                const roles: Record<string, number> = { 'Leader': 1, 'Co-leader': 2, 'Admin': 3 };
                const roleA = roles[a.position] || 99;
                const roleB = roles[b.position] || 99;
                if (roleA !== roleB) return roleA - roleB;
                return b.level - a.level;
            })
        : [];

    const filteredMembers = sortedMembers.filter(member => {
        // First apply search filter
        if (searchQuery && !member.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        // Then apply status filter
        if (filter === 'All') return true;
        if (filter === 'Okay') return member.status.state === 'Okay';
        if (filter === 'Travel') return ['Traveling', 'Abroad'].includes(member.status.state);
        if (filter === 'Hospital') return member.status.state === 'Hospital';
        return true;
    });

    // Get travel time - prefer Supabase data if available (more accurate)
    // This function is called on every render (every second due to tick)
    const getTravelTimeDisplay = (member: MemberWithTravelData): string | null => {
        if (!['Traveling', 'Abroad'].includes(member.status.state)) return null;

        // If user is an app user, use Supabase travel_arrival for accurate ETA
        if (member.isAppUser && member.supabaseTravelArrival) {
            const timeLeft = calculateTravelTimeLeft(member.supabaseTravelArrival);
            if (timeLeft > 0) {
                return formatTimeRemaining(timeLeft);
            }
            return 'Arrived';
        }

        // Fallback: no accurate time available for non-app users traveling
        return null;
    };

    // Get status time remaining (hospital, jail, etc.)
    const getStatusTimeDisplay = (member: MemberWithTravelData): string | null => {
        if (['Traveling', 'Abroad'].includes(member.status.state)) return null;
        if (member.status.until <= 0) return null;

        const timeLeft = member.status.until - Math.floor(Date.now() / 1000);
        if (timeLeft <= 0) return null;
        return formatTimeRemaining(timeLeft);
    };

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <TitleBar title="Member List" />
            <View className="flex-1" style={{ padding: hs(16), gap: vs(10) }}>

                {/* Search Bar */}
                <View className="flex-row items-center" style={{ gap: hs(8) }}>
                    <TextInput
                        className="bg-tactical-900 border"
                        placeholder="Search Members..."
                        placeholderTextColor="#A8A29E"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        selectionColor="#F59E0B"
                        style={{
                            color: "#F59E0B",
                            flex: 1,
                            padding: ms(14),
                            borderRadius: ms(8),
                            borderWidth: 1,
                            borderColor: isFocused ? "#44403C" : "#292524",
                            // @ts-ignore - Web only property
                            outlineStyle: 'none' as any
                        }}
                    />
                </View>

                {/* Filter */}
                <View className="flex-row items-center" style={{ gap: hs(8) }}>
                    <TouchableOpacity className="flex-1" onPress={() => setFilter('All')}>
                        <Text className={`text-center rounded-full ${filter === 'All' ? 'text-tactical-950 bg-accent-yellow border border-accent-yellow' : 'text-white bg-tactical-900 border border-tactical-800'}`} style={{ fontFamily: "Inter_500Medium", fontSize: ms(12), paddingVertical: vs(4), paddingHorizontal: hs(8) }}>All ({sortedMembers.length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1" onPress={() => setFilter('Okay')}>
                        <Text className={`text-center rounded-full ${filter === 'Okay' ? 'text-tactical-950 bg-accent-yellow border border-accent-yellow' : 'text-white bg-tactical-900 border border-tactical-800'}`} style={{ fontFamily: "Inter_500Medium", fontSize: ms(12), paddingVertical: vs(4), paddingHorizontal: hs(8) }}>Okay ({sortedMembers.filter(member => member.status.state === 'Okay').length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1" onPress={() => setFilter('Travel')}>
                        <Text className={`text-center rounded-full ${filter === 'Travel' ? 'text-tactical-950 bg-accent-yellow border border-accent-yellow' : 'text-white bg-tactical-900 border border-tactical-800'}`} style={{ fontFamily: "Inter_500Medium", fontSize: ms(12), paddingVertical: vs(4), paddingHorizontal: hs(8) }}>Travel ({sortedMembers.filter(member => ['Traveling', 'Abroad'].includes(member.status.state)).length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1" onPress={() => setFilter('Hospital')}>
                        <Text className={`text-center rounded-full ${filter === 'Hospital' ? 'text-tactical-950 bg-accent-yellow border border-accent-yellow' : 'text-white bg-tactical-900 border border-tactical-800'}`} style={{ fontFamily: "Inter_500Medium", fontSize: ms(12), paddingVertical: vs(4), paddingHorizontal: hs(8) }}>Hospital ({sortedMembers.filter(member => member.status.state === 'Hospital').length})</Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#EAB308" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredMembers}
                        keyExtractor={(item) => String(item.id)}
                        contentContainerStyle={{ gap: vs(10) }}
                        extraData={tick} // Force re-render on tick change for countdown
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#EAB308']}
                                tintColor="#EAB308"
                                progressBackgroundColor="#1a1a1a"
                            />
                        }
                        renderItem={({ item: member }) => {
                            const travelTime = getTravelTimeDisplay(member);
                            const statusTime = getStatusTimeDisplay(member);

                            // Determine card colors based on status
                            const isTravel = ['Traveling', 'Abroad'].includes(member.status.state);
                            const isHospital = member.status.state === 'Hospital';
                            const cardBg = isHospital ? '#321D1E' : isTravel ? '#1B272C' : '#1B2922';
                            const cardBorder = isHospital ? 'rgba(244, 63, 94, 0.4)' : isTravel ? 'rgba(14, 165, 233, 0.4)' : 'rgba(16, 185, 129, 0.4)';

                            return (
                                <Card
                                    className="flex-row justify-between items-center"
                                    style={{
                                        padding: vs(16),
                                        backgroundColor: cardBg,
                                        borderWidth: 1,
                                        borderColor: cardBorder
                                    }}
                                >
                                    <View className="flex-col justify-between">
                                        <View className="flex-row items-center" style={{ gap: vs(4) }}>
                                            <Text className="text-white/50 CamelCase bg-tactical-950" style={{ fontFamily: "Inter_500Medium", fontSize: ms(10), paddingVertical: vs(2), paddingHorizontal: hs(4) }}>Level {member.level}</Text>
                                            <Text className="text-white/50 CamelCase" style={{ fontFamily: "Inter_500Medium", fontSize: ms(10) }}>· {member.position}</Text>
                                            <Text className="text-white/50 CamelCase" style={{ fontFamily: "Inter_500Medium", fontSize: ms(10) }}>· {member.days_in_faction.toLocaleString('en-US')} Days</Text>
                                            {member.isAppUser && (
                                                <Text className="text-accent-yellow bg-tactical-950 rounded-full" style={{ fontFamily: "Inter_500Medium", fontSize: ms(8), paddingVertical: vs(1), paddingHorizontal: hs(4) }}>📱</Text>
                                            )}
                                        </View>
                                        <Text className="text-white uppercase" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(16) }}>{member.name}</Text>
                                    </View>
                                    <View className="flex-col justify-between items-end">
                                        <Text className={`${member.status.color === 'red' ? 'text-accent-red' : member.status.color === 'blue' ? 'text-accent-blue' : 'text-accent-green'}`} style={{ fontFamily: "Inter_600SemiBold", fontSize: ms(14) }}>{formatFactionStatus(member.status)}</Text>
                                        {/* Show travel time from Supabase if available (realtime countdown) */}
                                        {travelTime && (
                                            <Text className="text-accent-yellow" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(10) }}>{travelTime}</Text>
                                        )}
                                        {/* For non-travel status with until time (realtime countdown) */}
                                        {statusTime && (
                                            <Text className="text-white CamelCase" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(10) }}>{statusTime}</Text>
                                        )}
                                    </View>
                                </Card>
                            );
                        }}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
