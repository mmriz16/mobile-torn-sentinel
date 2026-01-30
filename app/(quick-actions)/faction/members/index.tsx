
import { Card } from "@/src/components/ui/card";
import { GridPattern } from "@/src/components/ui/grid-pattern";
import { TitleBar } from "@/src/components/ui/title-bar";
import { FactionMemberWithTravel, calculateTravelTimeLeft, fetchFactionMembersStats, fetchFactionMembersTravelStatus, syncFactionData } from "@/src/services/faction-service";
import { FactionBasicData, FactionMember, fetchFactionBasic, formatFactionStatus, formatTimeRemaining } from "@/src/services/torn-api";
import { horizontalScale as hs, moderateScale as ms, verticalScale as vs } from "@/src/utils/responsive";
import { CheckIcon, ChevronDown, Filter, XIcon } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Extended member type with Supabase travel data
interface MemberWithTravelData extends FactionMember {
    id: number;
    isAppUser: boolean;
    supabaseTravelArrival: number | null;
    xanaxWeekly: number;
}

export default function MemberFaction() {
    const [factionData, setFactionData] = useState<FactionBasicData | null>(null);
    const [travelStatusMap, setTravelStatusMap] = useState<Map<number, FactionMemberWithTravel>>(new Map());
    const [statsMap, setStatsMap] = useState<Map<number, number>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'All' | 'Okay' | 'Travel' | 'Hospital'>('All');
    // Tick state to force re-render every second for countdown
    const [tick, setTick] = useState(0);
    const [isFocused, setIsFocused] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter Modal State
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [xanaxFilter, setXanaxFilter] = useState<'All' | '<6' | '>6'>('All');
    const [levelFilter, setLevelFilter] = useState<'All' | '<25' | '25-50' | '50-75' | '>75'>('All');

    // Dropdown expanded states
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);

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

            // Fetch member stats from Supabase
            const statsData = await fetchFactionMembersStats(data.ID);
            const sMap = new Map<number, number>();
            statsData.forEach(item => {
                sMap.set(item.member_id, item.xanax_weekly_usage);
            });
            setStatsMap(sMap);
        }
        if (showLoading) setIsLoading(false);
    };

    // Pull to refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData(false);
        setRefreshing(false);
    }, []);

    const sortedMembers: MemberWithTravelData[] = useMemo(() => {
        if (!factionData) return [];
        return Object.entries(factionData.members)
            .map(([id, member]) => {
                const numId = Number(id);
                const supabaseData = travelStatusMap.get(numId);
                return {
                    ...member,
                    id: numId,
                    isAppUser: !!supabaseData,
                    supabaseTravelArrival: supabaseData?.travel_arrival || null,
                    xanaxWeekly: statsMap.get(numId) || 0
                };
            })
            .sort((a, b) => {
                // Prioritize Leader/Co-Leader, then by level
                const roles: Record<string, number> = { 'Leader': 1, 'Co-leader': 2, 'Admin': 3 };
                const roleA = roles[a.position] || 99;
                const roleB = roles[b.position] || 99;
                if (roleA !== roleB) return roleA - roleB;
                return b.level - a.level;
            });
    }, [factionData, travelStatusMap, statsMap]);

    const filteredMembers = useMemo(() => sortedMembers.filter(member => {
        // First apply search filter
        if (searchQuery && !member.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        // Apply status filter
        if (filter !== 'All') {
            if (filter === 'Okay' && member.status.state !== 'Okay') return false;
            if (filter === 'Travel' && !['Traveling', 'Abroad'].includes(member.status.state)) return false;
            if (filter === 'Hospital' && member.status.state !== 'Hospital') return false;
        }
        // Apply xanax filter
        if (xanaxFilter === '<6' && member.xanaxWeekly >= 6) return false;
        if (xanaxFilter === '>6' && member.xanaxWeekly < 6) return false;
        // Apply level filter
        if (levelFilter === '<25' && member.level >= 25) return false;
        if (levelFilter === '25-50' && (member.level < 25 || member.level > 50)) return false;
        if (levelFilter === '50-75' && (member.level < 50 || member.level > 75)) return false;
        if (levelFilter === '>75' && member.level <= 75) return false;
        return true;
    }), [sortedMembers, searchQuery, filter, xanaxFilter, levelFilter]);

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
                    <TouchableOpacity
                        className="bg-accent-yellow w-[48px] h-[48px] items-center justify-center"
                        style={{ borderRadius: ms(8) }}
                        onPress={() => setShowFilterModal(true)}
                        activeOpacity={0.8}
                    >
                        <Filter size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Active Filters Badge */}
                {(filter !== 'All' || xanaxFilter !== 'All' || levelFilter !== 'All') && (
                    <View className="flex-row flex-wrap items-center" style={{ gap: hs(8) }}>
                        {filter !== 'All' && (
                            <TouchableOpacity
                                className="flex-row items-center bg-accent-yellow/20 border border-accent-yellow rounded-full"
                                style={{ paddingVertical: vs(4), paddingHorizontal: hs(12), gap: hs(6) }}
                                onPress={() => setFilter('All')}
                            >
                                <Text className="text-accent-yellow" style={{ fontFamily: "Inter_500Medium", fontSize: ms(12) }}>
                                    {filter}
                                </Text>
                                <XIcon size={ms(14)} color="#F59E0B" />
                            </TouchableOpacity>
                        )}
                        {xanaxFilter !== 'All' && (
                            <TouchableOpacity
                                className="flex-row items-center bg-accent-yellow/20 border border-accent-yellow rounded-full"
                                style={{ paddingVertical: vs(4), paddingHorizontal: hs(12), gap: hs(6) }}
                                onPress={() => setXanaxFilter('All')}
                            >
                                <Text className="text-accent-yellow" style={{ fontFamily: "Inter_500Medium", fontSize: ms(12) }}>
                                    {xanaxFilter === '<6' ? 'Use <6 Xanax' : 'Use ≥6 Xanax'}
                                </Text>
                                <XIcon size={ms(14)} color="#F59E0B" />
                            </TouchableOpacity>
                        )}
                        {levelFilter !== 'All' && (
                            <TouchableOpacity
                                className="flex-row items-center bg-accent-yellow/20 border border-accent-yellow rounded-full"
                                style={{ paddingHorizontal: hs(12), gap: hs(6) }}
                                onPress={() => setLevelFilter('All')}
                            >
                                <Text className="text-accent-yellow" style={{ fontFamily: "Inter_500Medium", fontSize: ms(12) }}>
                                    {levelFilter === '<25' ? '<25 Level' : levelFilter === '25-50' ? '25-50 Level' : levelFilter === '50-75' ? '50-75 Level' : '>75 Level'}
                                </Text>
                                <XIcon size={ms(14)} color="#F59E0B" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

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
                                            <Text className="text-white/50 CamelCase" style={{ fontFamily: "Inter_500Medium", fontSize: ms(10) }}>{member.position}</Text>
                                            <Text className="text-white/50 CamelCase" style={{ fontFamily: "Inter_500Medium", fontSize: ms(10) }}>· {member.days_in_faction.toLocaleString('en-US')} Days</Text>
                                            {member.isAppUser && (
                                                <Text className="text-accent-yellow bg-tactical-950 rounded-full" style={{ fontFamily: "Inter_500Medium", fontSize: ms(8), paddingVertical: vs(1), paddingHorizontal: hs(4) }}>📱</Text>
                                            )}
                                            <Text className="text-white/50 CamelCase" style={{ fontFamily: "Inter_500Medium", fontSize: ms(10) }}>· Level {member.level}</Text>
                                        </View>
                                        <Text className="text-white uppercase" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(16) }}>{member.name}</Text>
                                        <View className="flex-row items-center" style={{ gap: vs(4) }}>
                                            <Text className="text-white/50 uppercase bg-tactical-950" style={{ fontFamily: "Inter_500Medium", fontSize: ms(10), paddingVertical: vs(2), paddingHorizontal: hs(4) }}>
                                                Use <Text className="text-accent-blue"> {member.xanaxWeekly} Xanax</Text>  this week.
                                            </Text>
                                        </View>
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

                {/* Filter Modal */}
                <Modal
                    visible={showFilterModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowFilterModal(false)}
                >
                    <View className="flex-1 justify-end bg-black/50">
                        <View className="bg-tactical-950 rounded-t-[20px] border-t border-tactical-800" style={{ maxHeight: '70%' }}>
                            {/* Header */}
                            <View className="flex-row justify-between items-center border-b border-tactical-800" style={{ padding: ms(16) }}>
                                <Text className="text-white" style={{ fontFamily: "Inter_700Bold", fontSize: ms(18) }}>
                                    Filter Members
                                </Text>
                                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                    <XIcon size={ms(24)} color="#A8A29E" />
                                </TouchableOpacity>
                            </View>

                            {/* Filter Content */}
                            <ScrollView style={{ padding: ms(16) }} contentContainerStyle={{ gap: vs(20) }}>
                                {/* Status Filter - Dropdown */}
                                <View style={{ gap: vs(8) }}>
                                    <Text className="text-white/70 uppercase" style={{ fontFamily: "Inter_600SemiBold", fontSize: ms(12) }}>
                                        Status
                                    </Text>
                                    <TouchableOpacity
                                        className="flex-row justify-between items-center bg-tactical-900 border border-tactical-800 rounded-[10px]"
                                        style={{ padding: ms(14) }}
                                        onPress={() => setStatusDropdownOpen(!statusDropdownOpen)}
                                    >
                                        <Text className="text-white" style={{ fontFamily: "Inter_500Medium", fontSize: ms(14) }}>
                                            {filter === 'All' ? 'All Status' : filter}
                                        </Text>
                                        <ChevronDown
                                            size={ms(20)}
                                            color="#A8A29E"
                                            style={{ transform: [{ rotate: statusDropdownOpen ? '180deg' : '0deg' }] }}
                                        />
                                    </TouchableOpacity>
                                    {statusDropdownOpen && (
                                        <View className="bg-tactical-900 border border-tactical-800 rounded-[10px] overflow-hidden">
                                            {(['All', 'Okay', 'Travel', 'Hospital'] as const).map((option, index) => (
                                                <TouchableOpacity
                                                    key={option}
                                                    className={`flex-row justify-between items-center ${filter === option ? 'bg-accent-yellow/20' : ''} ${index > 0 ? 'border-t border-tactical-800' : ''}`}
                                                    style={{ padding: ms(14) }}
                                                    onPress={() => {
                                                        setFilter(option);
                                                        setStatusDropdownOpen(false);
                                                    }}
                                                >
                                                    <Text
                                                        className={filter === option ? 'text-accent-yellow' : 'text-white'}
                                                        style={{ fontFamily: "Inter_500Medium", fontSize: ms(14) }}
                                                    >
                                                        {option === 'All' ? 'All Status' : option}
                                                    </Text>
                                                    {filter === option && (
                                                        <CheckIcon size={ms(18)} color="#F59E0B" />
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {/* Xanax Usage Filter - Radio Buttons */}
                                <View style={{ gap: vs(12) }}>
                                    <Text className="text-white/70 uppercase" style={{ fontFamily: "Inter_600SemiBold", fontSize: ms(12) }}>
                                        Xanax Usage (Weekly)
                                    </Text>
                                    <View className="flex-row" style={{ gap: hs(8) }}>
                                        {(['All', '<6', '>6'] as const).map((option) => (
                                            <TouchableOpacity
                                                key={option}
                                                className={`flex-1 flex-row items-center justify-center rounded-full border ${xanaxFilter === option ? 'bg-accent-yellow border-accent-yellow' : 'bg-tactical-900 border-tactical-800'}`}
                                                style={{ paddingVertical: vs(10), paddingHorizontal: hs(12), gap: hs(6) }}
                                                onPress={() => setXanaxFilter(option)}
                                            >
                                                <View
                                                    className={`w-[16px] h-[16px] rounded-full border-2 items-center justify-center ${xanaxFilter === option ? 'border-tactical-950' : 'border-tactical-600'}`}
                                                >
                                                    {xanaxFilter === option && (
                                                        <View className="w-[8px] h-[8px] rounded-full bg-tactical-950" />
                                                    )}
                                                </View>
                                                <Text
                                                    className={xanaxFilter === option ? 'text-tactical-950' : 'text-white'}
                                                    style={{ fontFamily: "Inter_500Medium", fontSize: ms(12) }}
                                                >
                                                    {option === 'All' ? 'All' : option === '<6' ? '<6' : '≥6'}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* Level Filter - Dropdown */}
                                <View style={{ gap: vs(8) }}>
                                    <Text className="text-white/70 uppercase" style={{ fontFamily: "Inter_600SemiBold", fontSize: ms(12) }}>
                                        Level Range
                                    </Text>
                                    <TouchableOpacity
                                        className="flex-row justify-between items-center bg-tactical-900 border border-tactical-800 rounded-[10px]"
                                        style={{ padding: ms(14) }}
                                        onPress={() => setLevelDropdownOpen(!levelDropdownOpen)}
                                    >
                                        <Text className="text-white" style={{ fontFamily: "Inter_500Medium", fontSize: ms(14) }}>
                                            {levelFilter === 'All' ? 'All Levels' : levelFilter === '<25' ? '<25 Level' : levelFilter === '>75' ? '>75 Level' : `${levelFilter} Level`}
                                        </Text>
                                        <ChevronDown
                                            size={ms(20)}
                                            color="#A8A29E"
                                            style={{ transform: [{ rotate: levelDropdownOpen ? '180deg' : '0deg' }] }}
                                        />
                                    </TouchableOpacity>
                                    {levelDropdownOpen && (
                                        <View className="bg-tactical-900 border border-tactical-800 rounded-[10px] overflow-hidden">
                                            {(['All', '<25', '25-50', '50-75', '>75'] as const).map((option, index) => (
                                                <TouchableOpacity
                                                    key={option}
                                                    className={`flex-row justify-between items-center ${levelFilter === option ? 'bg-accent-yellow/20' : ''} ${index > 0 ? 'border-t border-tactical-800' : ''}`}
                                                    style={{ padding: ms(14) }}
                                                    onPress={() => {
                                                        setLevelFilter(option);
                                                        setLevelDropdownOpen(false);
                                                    }}
                                                >
                                                    <Text
                                                        className={levelFilter === option ? 'text-accent-yellow' : 'text-white'}
                                                        style={{ fontFamily: "Inter_500Medium", fontSize: ms(14) }}
                                                    >
                                                        {option === 'All' ? 'All Levels' : option === '<25' ? '<25 Level' : option === '>75' ? '>75 Level' : `${option} Level`}
                                                    </Text>
                                                    {levelFilter === option && (
                                                        <CheckIcon size={ms(18)} color="#F59E0B" />
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {/* Reset & Apply Buttons */}
                                <View className="flex-row" style={{ gap: hs(12) }}>
                                    <TouchableOpacity
                                        className="flex-1 items-center justify-center bg-tactical-900 border border-tactical-800 rounded-[10px]"
                                        onPress={() => {
                                            setFilter('All');
                                            setXanaxFilter('All');
                                            setLevelFilter('All');
                                        }}
                                    >
                                        <Text className="text-white" style={{ fontFamily: "Inter_600SemiBold", fontSize: ms(14) }}>
                                            Reset
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        className="flex-1 items-center justify-center bg-accent-yellow rounded-[10px]"
                                        style={{ padding: ms(14) }}
                                        onPress={() => setShowFilterModal(false)}
                                    >
                                        <Text className="text-tactical-950" style={{ fontFamily: "Inter_600SemiBold", fontSize: ms(14) }}>
                                            Apply
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
}
