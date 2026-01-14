import { BellIcon, BellOffIcon, CheckIcon, FunnelIcon, XIcon } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../src/components/ui/card";
import { GridPattern } from "../../src/components/ui/grid-pattern";
import { ProgressBar } from "../../src/components/ui/progress-bar";
import { TitleBar } from "../../src/components/ui/title-bar";
import TravelLoader from "../../src/components/ui/travel-loader";
import { supabase } from "../../src/services/supabase";
import { fetchUserData, formatTimeRemaining, TornUserData } from "../../src/services/torn-api";
import { horizontalScale as hs, moderateScale as ms, verticalScale as vs } from '../../src/utils/responsive';

interface ForeignStock {
    id: number;
    item_id: number;
    country_code: string;
    country_name: string;
    quantity: number;
    price: number;
    updated_at: string;
    item_name?: string;
    item_image?: string;
}

interface StockAlert {
    item_id: number;
    country_code: string;
    last_qty: number;
}

interface CountryCount {
    country_code: string;
    country_name: string;
    count: number;
}



export default function Travel() {
    const [userData, setUserData] = useState<TornUserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [travelTimer, setTravelTimer] = useState(0);

    // Foreign Stock states
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [filter, setFilter] = useState('All');
    const [countries, setCountries] = useState<CountryCount[]>([]);
    const [totalStocks, setTotalStocks] = useState(0);
    const [showFilterModal, setShowFilterModal] = useState(false);

    const [stocks, setStocks] = useState<ForeignStock[]>([]);
    const [isLoadingStocks, setIsLoadingStocks] = useState(false);

    // Stock alerts state
    const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
    const [togglingAlert, setTogglingAlert] = useState<string | null>(null); // "item_id-country_code"

    // Fetch user data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const data = await fetchUserData();
            setUserData(data);
            setIsLoading(false);

            // Fetch stock alerts for this user
            if (data?.profile?.id) {
                const { data: notifData } = await supabase
                    .from('user_notifications')
                    .select('stock_alerts')
                    .eq('user_id', data.profile.id)
                    .single();

                if (notifData?.stock_alerts) {
                    setStockAlerts(notifData.stock_alerts as StockAlert[]);
                }
            }
        };
        loadData();

        const refreshInterval = setInterval(() => {
            fetchUserData().then(setUserData);
        }, 30000);

        return () => clearInterval(refreshInterval);
    }, []);

    // Toggle stock alert
    const toggleStockAlert = async (item: ForeignStock) => {
        const userId = userData?.profile?.id;
        if (!userId) return;

        const alertKey = `${item.item_id}-${item.country_code}`;
        setTogglingAlert(alertKey);

        try {
            const isEnabled = stockAlerts.some(
                a => a.item_id === item.item_id && a.country_code === item.country_code
            );

            let newAlerts: StockAlert[];
            if (isEnabled) {
                // Remove alert
                newAlerts = stockAlerts.filter(
                    a => !(a.item_id === item.item_id && a.country_code === item.country_code)
                );
            } else {
                // Add alert
                newAlerts = [...stockAlerts, {
                    item_id: item.item_id,
                    country_code: item.country_code,
                    last_qty: item.quantity
                }];
            }

            // Update database
            const { error } = await supabase
                .from('user_notifications')
                .update({ stock_alerts: newAlerts })
                .eq('user_id', userId);

            if (!error) {
                setStockAlerts(newAlerts);
            }
        } catch (err) {
            console.error('Error toggling stock alert:', err);
        } finally {
            setTogglingAlert(null);
        }
    };

    // Check if alert is enabled for an item
    const isAlertEnabled = (itemId: number, countryCode: string) => {
        return stockAlerts.some(a => a.item_id === itemId && a.country_code === countryCode);
    };

    // Update travel timer every second
    useEffect(() => {
        const arrivalAt = userData?.travel?.arrival_at;
        if (!arrivalAt) return;

        const updateTimer = () => {
            const now = Math.floor(Date.now() / 1000);
            setTravelTimer(Math.max(0, arrivalAt - now));
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [userData?.travel?.arrival_at]);

    // Fetch countries with counts
    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const { count: totalCount } = await supabase
                    .from('item_foreign_stocks')
                    .select('*', { count: 'exact', head: true });

                setTotalStocks(totalCount || 0);

                const { data, error } = await supabase
                    .from('item_foreign_stocks')
                    .select('country_code, country_name');

                if (error) {
                    console.error('Error fetching countries:', error);
                    return;
                }

                if (data) {
                    const countMap = new Map<string, { name: string; count: number }>();
                    data.forEach(item => {
                        const existing = countMap.get(item.country_code);
                        if (existing) {
                            existing.count++;
                        } else {
                            countMap.set(item.country_code, { name: item.country_name, count: 1 });
                        }
                    });

                    const countriesArray: CountryCount[] = Array.from(countMap.entries())
                        .map(([code, { name, count }]) => ({ country_code: code, country_name: name, count }))
                        .sort((a, b) => a.country_name.localeCompare(b.country_name));

                    setCountries(countriesArray);
                }
            } catch (err) {
                console.error('Error:', err);
            }
        };

        fetchCountries();
    }, []);

    // Fetch stocks with pagination
    const fetchStocks = useCallback(async () => {
        if (isLoadingStocks) return;

        try {
            setIsLoadingStocks(true);

            // Fetch ALL stocks
            const { data: stocksData, error: stocksError } = await supabase
                .from('item_foreign_stocks')
                .select('*, items!inner(name, image_url)');

            if (stocksError) {
                console.error('Error fetching stocks:', stocksError);
                return;
            }

            if (stocksData) {
                const enrichedStocks: ForeignStock[] = stocksData.map((stock: any) => ({
                    id: stock.id,
                    item_id: stock.item_id,
                    country_code: stock.country_code,
                    country_name: stock.country_name,
                    quantity: stock.quantity,
                    price: stock.price,
                    updated_at: stock.updated_at,
                    item_name: stock.items?.name || `Item #${stock.item_id}`,
                    item_image: stock.items?.image_url
                }));

                // Sort A-Z Client Side
                enrichedStocks.sort((a, b) => (a.item_name || '').localeCompare(b.item_name || ''));

                setStocks(enrichedStocks);
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setIsLoadingStocks(false);
        }
    }, [isLoadingStocks]);

    // Initial fetch only
    useEffect(() => {
        fetchStocks();
    }, []);

    // Filter stocks client-side
    const filteredStocks = stocks.filter(stock => {
        const matchesFilter = filter === 'All' || stock.country_code === filter;
        const matchesSearch = !searchQuery.trim() ||
            (stock.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        return matchesFilter && matchesSearch;
    });

    const travel = userData?.travel;
    const profile = userData?.profile;

    let originCity = "Torn City";
    if (profile?.status?.description.startsWith("Returning to Torn from ")) {
        originCity = profile.status.description.replace("Returning to Torn from ", "");
    }

    const travelProgress = travel
        ? 1 - (travel.time_left / (travel.arrival_at - travel.departed_at))
        : 0;

    const formatPrice = (value: number) => {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
        return `$${value.toLocaleString()}`;
    };

    const renderStockItem = ({ item }: { item: ForeignStock }) => {
        const alertEnabled = isAlertEnabled(item.item_id, item.country_code);
        const isToggling = togglingAlert === `${item.item_id}-${item.country_code}`;

        return (
            <Card className="flex-row items-center justify-between bg-tactical-900 border border-tactical-800" style={{ padding: ms(10), gap: ms(10) }}>
                <Image
                    className="bg-tactical-950 border border-tactical-800 rounded-[6px]"
                    source={{ uri: item.item_image || 'https://www.torn.com/images/items/1/large.png' }}
                    style={{ width: ms(50), height: ms(50) }}
                    resizeMode="contain"
                />
                <View className="flex-col flex-1 items-start justify-between">
                    <Text className="uppercase text-white" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(14) }} numberOfLines={1}>
                        {item.item_name}
                    </Text>
                    <Text className="text-white/50" style={{ fontFamily: "Inter_500Medium", fontSize: ms(10) }}>
                        {item.country_name}
                    </Text>
                </View>
                <View className="flex-col items-end justify-between">
                    <Text className="uppercase text-white" style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: ms(14) }}>
                        {formatPrice(item.price)}
                    </Text>
                    <Text className="text-accent-green" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(10) }}>
                        x{item.quantity.toLocaleString()}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => toggleStockAlert(item)}
                    disabled={isToggling}
                    className={`rounded-full ${alertEnabled ? 'bg-accent-yellow' : 'bg-tactical-800'}`}
                    style={{ padding: ms(8) }}
                >
                    {isToggling ? (
                        <ActivityIndicator size={ms(16)} color={alertEnabled ? "#0C0A09" : "#F59E0B"} />
                    ) : alertEnabled ? (
                        <BellIcon size={ms(16)} color="#0C0A09" />
                    ) : (
                        <BellOffIcon size={ms(16)} color="#A8A29E" />
                    )}
                </TouchableOpacity>
            </Card>
        );
    };

    const renderFooter = () => {
        if (!isLoadingStocks) return null;
        return (
            <View style={{ paddingVertical: vs(20) }}>
                <ActivityIndicator size="small" color="#F59E0B" />
            </View>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-tactical-950 items-center justify-center">
                <ActivityIndicator color="#F59E0B" size="large" />
                <Text className="text-white/50 mt-4 font-mono uppercase text-xs">Loading...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <TitleBar title="Travel" />
            <View className="flex-1" style={{ gap: vs(12), padding: ms(16) }}>
                {/* Travel Card - Active Travel */}
                {travel && travel.time_left > 0 && (
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
                )}

                {/* Search Bar */}
                <View className="flex-row" style={{ gap: vs(10) }}>
                    <View className="flex-row flex-1 items-center" style={{ gap: hs(8) }}>
                        <TextInput
                            className="bg-tactical-900 border"
                            placeholder="Search items..."
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
                                {countries.find(c => c.country_code === filter)?.country_name || filter}
                            </Text>
                            <XIcon size={ms(14)} color="#F59E0B" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Country Filter Modal */}
                <Modal
                    visible={showFilterModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowFilterModal(false)}
                >
                    <View className="flex-1 justify-end bg-black/50">
                        <View className="bg-tactical-950 rounded-t-[20px] border-t border-tactical-800" style={{ maxHeight: '70%' }}>
                            <View className="flex-row justify-between items-center border-b border-tactical-800" style={{ padding: ms(16) }}>
                                <Text className="text-white" style={{ fontFamily: "Inter_700Bold", fontSize: ms(18) }}>
                                    Filter by Country
                                </Text>
                                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                    <XIcon size={ms(24)} color="#A8A29E" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ padding: ms(16) }} contentContainerStyle={{ gap: vs(8), paddingBottom: vs(40) }}>
                                {[{ country_code: 'All', country_name: 'All Countries', count: totalStocks }, ...countries].map((country) => (
                                    <TouchableOpacity
                                        key={country.country_code}
                                        className={`flex-row justify-between items-center rounded-[10px] border ${filter === country.country_code ? 'bg-accent-yellow/20 border-accent-yellow' : 'bg-tactical-900 border-tactical-800'}`}
                                        style={{ padding: ms(14) }}
                                        onPress={() => {
                                            setFilter(country.country_code);
                                            setShowFilterModal(false);
                                        }}
                                    >
                                        <View className="flex-row items-center" style={{ gap: hs(12) }}>
                                            <Text
                                                className={filter === country.country_code ? 'text-accent-yellow' : 'text-white'}
                                                style={{ fontFamily: "Inter_500Medium", fontSize: ms(14) }}
                                            >
                                                {country.country_name}
                                            </Text>
                                            <Text className="text-white/30" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(12) }}>
                                                {country.count}
                                            </Text>
                                        </View>
                                        {filter === country.country_code && (
                                            <CheckIcon size={ms(20)} color="#F59E0B" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                <View className="flex-row justify-between items-center">
                    <Text className="text-white/50 uppercase" style={{ fontFamily: "Inter_800ExtraBold", fontSize: ms(14) }}>Foreign Stocks</Text>
                    <Text className="text-white/50 uppercase" style={{ fontFamily: "JetBrainsMono_400Regular", fontSize: ms(10) }}>
                        {filteredStocks.length} Items
                    </Text>
                </View>

                {/* Stock List */}
                <FlatList
                    data={filteredStocks}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderStockItem}
                    contentContainerStyle={{ gap: vs(8) }}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={
                        !isLoadingStocks ? (
                            <View className="flex-1 justify-center items-center" style={{ paddingVertical: vs(40) }}>
                                <Text className="text-stone-400" style={{ fontFamily: "Inter_400Regular", fontSize: ms(14) }}>
                                    No stocks found
                                </Text>
                            </View>
                        ) : null
                    }
                />
            </View>
        </SafeAreaView>
    );
}