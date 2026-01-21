import { Card } from "@/src/components/ui/card";
import { GridPattern } from "@/src/components/ui/grid-pattern";
import { TitleBar } from "@/src/components/ui/title-bar";
import { supabase } from "@/src/services/supabase";
import { formatNumber } from "@/src/services/torn-api";
import { moderateScale as ms, verticalScale as vs } from "@/src/utils/responsive";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Linking, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PAGE_SIZE = 10;

interface ChainTarget {
    id: number;
    torn_id: number;
    name: string;
    level: number;
    total_stats: number;
    strength: number;
    defense: number;
    speed: number;
    dexterity: number;
    status: 'Okay' | 'Hospital' | 'Jail' | 'Traveling' | 'Unknown';
    status_priority: number;
    status_until: number | null;
    last_checked_at: string | null;
}

// Format countdown timer
function formatCountdown(statusUntil: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = statusUntil - now;

    if (diff <= 0) return "Ready soon";

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
}

// Get status color
function getStatusColor(status: string): string {
    switch (status) {
        case 'Okay': return '#10B981'; // Green
        case 'Hospital': return '#F43F5E'; // Red
        case 'Jail': return '#F59E0B'; // Yellow
        case 'Traveling': return '#3B82F6'; // Blue
        default: return '#94A3B8'; // Gray
    }
}

export default function ChainList() {
    const [targets, setTargets] = useState<ChainTarget[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'okay' | 'hospital'>('all');
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);

    // Stats for header
    const [stats, setStats] = useState({ okay: 0, hospital: 0, total: 0 });

    const countdownInterval = useRef<NodeJS.Timeout | null>(null);
    const [, forceUpdate] = useState(0);

    // Fetch stats counts separately from main list
    const fetchStats = async () => {
        const { data, error } = await supabase
            .from('chain_target')
            .select('status');

        if (data) {
            const okay = data.filter(t => t.status === 'Okay').length;
            const hospital = data.filter(t => t.status === 'Hospital' || t.status === 'Jail').length;
            const total = data.length;
            setStats({ okay, hospital, total });
        }
    };

    // Fetch list items with server-side pagination
    const fetchItems = useCallback(async (pageNum: number, shouldRefresh: boolean = false) => {
        try {
            if (shouldRefresh) setIsLoading(true);
            else if (pageNum > 0) setIsLoadingMore(true);

            let query = supabase
                .from('chain_target')
                .select('*')
                .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

            // Apply filter
            if (filter === 'okay') {
                query = query.eq('status', 'Okay');
            } else if (filter === 'hospital') {
                // Supabase query to filter both Hospital OR Jail is tricky with .eq
                // We use .in() for multiple values
                query = query.in('status', ['Hospital', 'Jail']);
            }

            // Apply sorting: Priority first (Okay=0, Hospital=1...), then Level desc
            query = query
                .order('status_priority', { ascending: true })
                .order('level', { ascending: false });

            const { data, error } = await query;

            if (data) {
                if (shouldRefresh || pageNum === 0) {
                    setTargets(data as ChainTarget[]);
                } else {
                    setTargets(prev => [...prev, ...data as ChainTarget[]]);
                }
                setHasMore(data.length === PAGE_SIZE);
            }
        } catch (error) {
            console.error('Error fetching chain targets:', error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
            setIsRefreshing(false);
        }
    }, [filter]);

    // Initial load and filter change
    useEffect(() => {
        setPage(0);
        setHasMore(true);
        fetchItems(0, true);
        fetchStats();
    }, [filter]); // Re-fetch when filter changes

    // Load more handler
    const loadMore = () => {
        if (!isLoadingMore && !isLoading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchItems(nextPage, false);
        }
    };

    // Refresh handler
    const onRefresh = () => {
        setIsRefreshing(true);
        setPage(0);
        fetchItems(0, true);
        fetchStats();
    };

    useEffect(() => {
        // Real-time subscription for status updates
        const channel = supabase
            .channel('chain_target_changes')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'chain_target'
            }, (payload) => {
                // Optimistically update existing items in list
                setTargets(prev => prev.map(t =>
                    t.id === payload.new.id ? { ...t, ...payload.new } : t
                ));
                fetchStats(); // Refresh stats
            })
            .subscribe();

        // Countdown timer update every second
        countdownInterval.current = setInterval(() => {
            forceUpdate(prev => prev + 1);
        }, 1000);

        return () => {
            channel.unsubscribe();
            if (countdownInterval.current) {
                clearInterval(countdownInterval.current);
            }
        };
    }, []);

    const renderTarget = ({ item }: { item: ChainTarget }) => {
        const statusColor = getStatusColor(item.status);
        const isHospitalized = item.status === 'Hospital' || item.status === 'Jail';

        return (
            <TouchableOpacity
                onPress={() => Linking.openURL(`https://www.torn.com/loader2.php?sid=getInAttack&user2ID=${item.torn_id}`)}
                activeOpacity={0.7}
                style={{ marginBottom: vs(8) }}
            >
                <Card style={{ padding: ms(12) }}>
                    <View className="flex-row items-center justify-between">
                        {/* Left: Name and Level */}
                        <View style={{ flex: 1, gap: vs(4) }}>
                            <View className="flex-row items-center" style={{ gap: ms(8) }}>
                                <Text
                                    className="text-white"
                                    style={{ fontFamily: 'Inter_700Bold', fontSize: ms(14) }}
                                >
                                    {item.name}
                                </Text>
                                <View className="bg-tactical-700 rounded px-2 py-0.5">
                                    <Text
                                        className="text-white/70"
                                        style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}
                                    >
                                        Lvl {item.level}
                                    </Text>
                                </View>
                            </View>
                            <Text
                                className="text-white/50"
                                style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}
                            >
                                Stats: {formatNumber(item.total_stats)} | ID: {item.torn_id}
                            </Text>
                        </View>

                        {/* Right: Status */}
                        <View style={{ alignItems: 'flex-end', gap: vs(4) }}>
                            <View
                                className="rounded px-3 py-1"
                                style={{ backgroundColor: statusColor + '30' }}
                            >
                                <Text
                                    style={{
                                        fontFamily: 'Inter_700Bold',
                                        fontSize: ms(11),
                                        color: statusColor
                                    }}
                                >
                                    {item.status.toUpperCase()}
                                </Text>
                            </View>
                            {isHospitalized && item.status_until && (
                                <Text
                                    style={{
                                        fontFamily: 'JetBrainsMono_400Regular',
                                        fontSize: ms(10),
                                        color: statusColor
                                    }}
                                >
                                    {formatCountdown(item.status_until)}
                                </Text>
                            )}
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    const renderFooter = () => {
        if (!isLoadingMore) return null;
        return (
            <View style={{ paddingVertical: vs(16), alignItems: 'center' }}>
                <ActivityIndicator color="#F59E0B" size="small" />
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <TitleBar title="Chain List" />

            {/* Stats Summary */}
            <View className="flex-row justify-center" style={{ paddingHorizontal: ms(16), gap: ms(12), marginBottom: vs(12) }}>
                <View className="bg-accent-green/20 rounded-lg px-4 py-2 items-center">
                    <Text className="text-accent-green" style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: ms(18) }}>
                        {stats.okay}
                    </Text>
                    <Text className="text-accent-green/70" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>
                        OKAY
                    </Text>
                </View>
                <View className="bg-accent-red/20 rounded-lg px-4 py-2 items-center">
                    <Text className="text-accent-red" style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: ms(18) }}>
                        {stats.hospital}
                    </Text>
                    <Text className="text-accent-red/70" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>
                        HOSPITAL
                    </Text>
                </View>
                <View className="bg-white/10 rounded-lg px-4 py-2 items-center">
                    <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: ms(18) }}>
                        {stats.total}
                    </Text>
                    <Text className="text-white/50" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>
                        TOTAL
                    </Text>
                </View>
            </View>

            {/* Filter Tabs */}
            <View className="flex-row" style={{ paddingHorizontal: ms(16), marginBottom: vs(12), gap: ms(8) }}>
                {(['all', 'okay', 'hospital'] as const).map((f) => (
                    <TouchableOpacity
                        key={f}
                        onPress={() => setFilter(f)}
                        className={`flex-1 rounded-lg py-2 items-center ${filter === f ? 'bg-white' : 'bg-tactical-800'}`}
                    >
                        <Text
                            style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: ms(12),
                                color: filter === f ? '#0A0A0A' : '#FFFFFF80',
                                textTransform: 'capitalize'
                            }}
                        >
                            {f === 'hospital' ? 'In Hospital' : f}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Target List with Server-Side Pagination */}
            <FlatList
                data={targets}
                renderItem={renderTarget}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingHorizontal: ms(16), paddingBottom: vs(32) }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        tintColor="#F59E0B"
                    />
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={
                    !isLoading ? (
                        <View className="items-center justify-center py-8">
                            <Text className="text-white/50" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(14) }}>
                                No targets found
                            </Text>
                        </View>
                    ) : (
                        <View className="items-center justify-center py-8">
                            <ActivityIndicator color="#F59E0B" size="large" />
                        </View>
                    )
                }
            />
        </SafeAreaView>
    );
}
