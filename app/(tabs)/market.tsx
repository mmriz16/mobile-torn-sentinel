import { CheckIcon, FunnelIcon, XIcon } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../src/components/ui/card";
import { GridPattern } from "../../src/components/ui/grid-pattern";
import { supabase } from "../../src/services/supabase";
import { horizontalScale as hs, moderateScale as ms, verticalScale as vs } from '../../src/utils/responsive';

interface CategoryCount {
    type: string;
    count: number;
}

interface Item {
    id: number;
    name: string;
    type: string;
    image_url: string | null;
    market_value: number;
    price_change_percent: number | null;
}

const PAGE_SIZE = 20;

export default function Market() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [filter, setFilter] = useState('All');
    const [categories, setCategories] = useState<CategoryCount[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [showFilterModal, setShowFilterModal] = useState(false);

    // Items state
    const [items, setItems] = useState<Item[]>([]);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);

    // Fetch categories with counts from Supabase
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setIsLoading(true);

                // Get exact total count (not affected by row limit)
                const { count: totalCount, error: countError } = await supabase
                    .from('items')
                    .select('*', { count: 'exact', head: true });

                if (countError) {
                    console.error('Error fetching count:', countError);
                    return;
                }

                setTotalItems(totalCount || 0);

                // Get category counts using RPC or multiple paginated queries
                // Fetch in batches to get all items for category counting
                const allTypes: string[] = [];
                let offset = 0;
                const batchSize = 1000;
                let hasMore = true;

                while (hasMore) {
                    const { data, error } = await supabase
                        .from('items')
                        .select('type')
                        .range(offset, offset + batchSize - 1);

                    if (error) {
                        console.error('Error fetching categories:', error);
                        break;
                    }

                    if (data && data.length > 0) {
                        allTypes.push(...data.map(item => item.type || 'Unknown'));
                        offset += batchSize;
                        hasMore = data.length === batchSize;
                    } else {
                        hasMore = false;
                    }
                }

                // Count items per category
                const countMap = new Map<string, number>();
                allTypes.forEach(type => {
                    countMap.set(type, (countMap.get(type) || 0) + 1);
                });

                // Convert to array and sort alphabetically
                const categoriesArray: CategoryCount[] = Array.from(countMap.entries())
                    .map(([type, count]) => ({ type, count }))
                    .sort((a, b) => a.type.localeCompare(b.type));

                setCategories(categoriesArray);
            } catch (err) {
                console.error('Error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategories();
    }, []);

    // Fetch items with pagination
    const fetchItems = useCallback(async (pageNum: number, reset: boolean = false) => {
        if (isLoadingItems) return;

        try {
            setIsLoadingItems(true);

            let query = supabase
                .from('items')
                .select('id, name, type, image_url, market_value, price_change_percent')
                .order('name', { ascending: true })
                .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

            // Apply category filter
            if (filter !== 'All') {
                query = query.eq('type', filter);
            }

            // Apply search filter
            if (searchQuery.trim()) {
                query = query.ilike('name', `%${searchQuery.trim()}%`);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching items:', error);
                return;
            }

            if (data) {
                if (reset) {
                    setItems(data);
                } else {
                    setItems(prev => [...prev, ...data]);
                }
                setHasMore(data.length === PAGE_SIZE);
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setIsLoadingItems(false);
        }
    }, [filter, searchQuery, isLoadingItems]);

    // Reset and fetch items when filter or search changes
    useEffect(() => {
        setPage(0);
        setItems([]);
        setHasMore(true);
        fetchItems(0, true);
    }, [filter, searchQuery]);

    // Load more items
    const loadMore = () => {
        if (!isLoadingItems && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchItems(nextPage, false);
        }
    };

    // Format price with commas
    const formatPrice = (value: number) => {
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(2)}M`;
        } else if (value >= 1000) {
            return `$${(value / 1000).toFixed(2)}K`;
        }
        return `$${value.toLocaleString()}`;
    };

    // Get price change color
    const getPriceChangeColor = (percent: number | null) => {
        if (percent === null || percent === 0) return 'text-white/50';
        if (percent > 0) return 'text-accent-green';
        return 'text-accent-red';
    };

    // Format price change percent
    const formatPriceChange = (percent: number | null) => {
        if (percent === null || percent === 0) return '0.00%';
        const sign = percent > 0 ? '+' : '';
        return `${sign}${percent.toFixed(2)}%`;
    };

    // Render item
    const renderItem = ({ item }: { item: Item }) => (
        <Card className="flex-row items-center justify-between bg-tactical-900 border border-tactical-800" style={{ padding: ms(10), gap: ms(10) }}>
            <Image
                className="bg-tactical-950 border border-tactical-800 rounded-[6px]"
                source={{ uri: item.image_url || 'https://www.torn.com/images/items/1/large.png' }}
                style={{ width: ms(50), height: ms(50) }}
                resizeMode="contain"
            />
            <View className="flex-col flex-1 items-start justify-between">
                <Text className="uppercase text-white" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(14) }} numberOfLines={1}>
                    {item.name}
                </Text>
                <Text className="text-white/50" style={{ fontFamily: "Inter_500Medium", fontSize: ms(10) }}>
                    {item.type}
                </Text>
            </View>
            <View className="flex-col items-end justify-between">
                <Text className="uppercase text-white" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(14) }}>
                    {formatPrice(item.market_value)}
                </Text>
                <Text className={`${getPriceChangeColor(item.price_change_percent)}`} style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(10) }}>
                    {formatPriceChange(item.price_change_percent)}
                </Text>
            </View>
        </Card>
    );

    // Render footer (loading indicator)
    const renderFooter = () => {
        if (!isLoadingItems) return null;
        return (
            <View style={{ paddingVertical: vs(20) }}>
                <ActivityIndicator size="small" color="#F59E0B" />
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <View className="flex-1" style={{ gap: vs(10), paddingTop: ms(10), paddingHorizontal: (16) }}>

                {/* Search Bar */}
                <View className="flex-row" style={{ gap: vs(10) }}>
                    <View className="flex-row flex-1 items-center" style={{ gap: hs(8) }}>
                        <TextInput
                            className="bg-tactical-900 border"
                            placeholder="Search Xanax, Armalite..."
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
                    <TouchableOpacity
                        className="flex justify-center items-center bg-accent-yellow aspect-square rounded-[8px]"
                        style={{ padding: ms(10) }}
                        onPress={() => setShowFilterModal(true)}
                        activeOpacity={0.8}
                    >
                        <FunnelIcon size={ms(20)} color="#0C0A09" />
                    </TouchableOpacity>
                </View>

                {/* Active Filter Badge */}
                {filter !== 'All' && (
                    <View className="flex-row items-center" style={{ gap: hs(8) }}>
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
                    </View>
                )}

                {/* Category Filter Modal */}
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
                                    Filter by Category
                                </Text>
                                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                    <XIcon size={ms(24)} color="#A8A29E" />
                                </TouchableOpacity>
                            </View>

                            {/* Category List */}
                            <ScrollView style={{ padding: ms(16) }} contentContainerStyle={{ gap: vs(8), paddingBottom: vs(40) }}>
                                {[{ type: 'All', count: totalItems }, ...categories].map((category) => (
                                    <TouchableOpacity
                                        key={category.type}
                                        className={`flex-row justify-between items-center rounded-[10px] border ${filter === category.type ? 'bg-accent-yellow/20 border-accent-yellow' : 'bg-tactical-900 border-tactical-800'}`}
                                        style={{ padding: ms(14) }}
                                        onPress={() => {
                                            setFilter(category.type);
                                            setShowFilterModal(false);
                                        }}
                                    >
                                        <View className="flex-row items-center" style={{ gap: hs(12) }}>
                                            <Text
                                                className={filter === category.type ? 'text-accent-yellow' : 'text-white'}
                                                style={{ fontFamily: "Inter_500Medium", fontSize: ms(14) }}
                                            >
                                                {category.type}
                                            </Text>
                                            <Text className="text-white/30" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(12) }}>
                                                {category.count}
                                            </Text>
                                        </View>
                                        {filter === category.type && (
                                            <CheckIcon size={ms(20)} color="#F59E0B" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                <View className="flex-row justify-between items-center">
                    <Text className="text-white/50 uppercase" style={{ fontFamily: "Inter_800ExtraBold", fontSize: ms(14) }}>Market List</Text>
                    <Text className="text-white/50 uppercase" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(10) }}>{filter === 'All' ? totalItems : (categories.find(c => c.type === filter)?.count || 0)} Items</Text>
                </View>

                {/* Item List */}
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ gap: vs(8) }}
                    showsVerticalScrollIndicator={false}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={
                        !isLoadingItems ? (
                            <View className="flex-1 justify-center items-center" style={{ paddingVertical: vs(40) }}>
                                <Text className="text-stone-400" style={{ fontFamily: "Inter_400Regular", fontSize: ms(14) }}>
                                    No items found
                                </Text>
                            </View>
                        ) : null
                    }
                />

            </View>
        </SafeAreaView>
    );
}