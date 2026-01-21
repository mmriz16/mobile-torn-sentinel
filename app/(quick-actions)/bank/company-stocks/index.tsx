import { Card } from "@/src/components/ui/card";
import { GridPattern } from "@/src/components/ui/grid-pattern";
import { TitleBar } from "@/src/components/ui/title-bar";
import {
    calculateStockAnalytics,
    fetchStockDetails,
    fetchStockHistory,
    formatStockPrice,
    StockHistoryPoint,
    TimePeriod,
    TornStock
} from "@/src/services/torn-stocks";
import { horizontalScale as hs, moderateScale as ms, verticalScale as vs } from '@/src/utils/responsive';
import { TrendingDown, TrendingUp } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 32;

// Torn City Health Service stock ID
const STOCK_ID = 25;

export default function Stock() {
    const [stock, setStock] = useState<TornStock | null>(null);
    const [history, setHistory] = useState<StockHistoryPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('W');
    const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');

    const loadData = useCallback(async () => {
        setIsLoading(true);

        const [stockData, historyData] = await Promise.all([
            fetchStockDetails(STOCK_ID),
            fetchStockHistory(STOCK_ID, selectedPeriod),
        ]);

        setStock(stockData);
        setHistory(historyData);
        setIsLoading(false);
    }, [selectedPeriod]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const analytics = calculateStockAnalytics(history);
    const isPositive = analytics.changePercent >= 0;

    // Prepare chart data for react-native-chart-kit
    const chartData = {
        labels: history.length > 0
            ? history
                .filter((_, i) => i % Math.ceil(history.length / 5) === 0)
                .map(p => new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
            : [''],
        datasets: [{
            data: history.length > 0 ? history.map(h => h.price) : [0],
            color: () => isPositive ? '#10B981' : '#F43F5E',
            strokeWidth: 2,
        }],
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-tactical-950 items-center justify-center">
                <GridPattern />
                <ActivityIndicator color="#F59E0B" size="large" />
                <Text className="text-white/50 mt-4 font-mono uppercase text-xs">Loading Stock Data...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: vs(32) }}>
                {/* Header */}
                <TitleBar title={stock?.acronym || 'Company Stocks'} />

                {/* Stock Info */}
                <View style={{ paddingHorizontal: hs(16), gap: vs(8) }}>
                    <View className="flex-row items-center" style={{ gap: hs(8) }}>
                        <View className="bg-accent-green/20 rounded-full" style={{ padding: ms(8) }}>
                            <Text style={{ fontSize: ms(16) }}>💊</Text>
                        </View>
                        <Text className="text-white/70" style={{ fontFamily: 'Inter_600SemiBold', fontSize: ms(14) }}>
                            {stock?.name || 'Torn City Health Service'}
                        </Text>
                    </View>

                    <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(32) }}>
                        {formatStockPrice(stock?.current_price || 0)}
                    </Text>

                    <View className="flex-row items-center" style={{ gap: hs(8) }}>
                        {isPositive ? (
                            <TrendingUp size={ms(16)} color="#10B981" />
                        ) : (
                            <TrendingDown size={ms(16)} color="#F43F5E" />
                        )}
                        <Text
                            className={isPositive ? 'text-accent-green' : 'text-accent-red'}
                            style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(12) }}
                        >
                            {isPositive ? '+' : ''}{analytics.changePercent.toFixed(2)}%
                        </Text>
                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>
                            ({selectedPeriod === 'D' ? '24H' : selectedPeriod === 'W' ? '7D' : selectedPeriod === 'M' ? '30D' : 'All'})
                        </Text>
                    </View>
                </View>

                {/* Chart */}
                <View style={{ marginTop: vs(24), alignItems: 'center' }}>
                    {history.length > 0 ? (
                        <LineChart
                            data={chartData}
                            width={CHART_WIDTH}
                            height={220}
                            chartConfig={{
                                backgroundColor: 'transparent',
                                backgroundGradientFrom: '#0a0a0a',
                                backgroundGradientTo: '#0a0a0a',
                                decimalPlaces: 2,
                                color: () => isPositive ? '#10B981' : '#F43F5E',
                                labelColor: () => 'rgba(255, 255, 255, 0.5)',
                                style: { borderRadius: 8 },
                                propsForDots: { r: '0' },
                                propsForBackgroundLines: { strokeDasharray: '', stroke: 'rgba(255,255,255,0.1)' },
                            }}
                            bezier
                            withInnerLines={false}
                            withOuterLines={false}
                            withVerticalLabels={true}
                            withHorizontalLabels={true}
                            style={{ borderRadius: 8, paddingRight: 0 }}
                        />
                    ) : (
                        <View className="items-center justify-center" style={{ height: 200 }}>
                            <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(12) }}>
                                No data available for this period
                            </Text>
                        </View>
                    )}

                    {/* Chart Labels (Min/Max) */}
                    {history.length > 0 && (
                        <View className="flex-row justify-between w-full" style={{ marginTop: vs(8), paddingHorizontal: hs(16) }}>
                            <View className="bg-accent-red/20 rounded" style={{ paddingHorizontal: hs(8), paddingVertical: vs(4) }}>
                                <Text className="text-accent-red" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>
                                    Low: {formatStockPrice(analytics.low)}
                                </Text>
                            </View>
                            <View className="bg-accent-green/20 rounded" style={{ paddingHorizontal: hs(8), paddingVertical: vs(4) }}>
                                <Text className="text-accent-green" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>
                                    High: {formatStockPrice(analytics.high)}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Time Period Selector */}
                <View className="flex-row justify-center" style={{ marginTop: vs(24), gap: hs(8) }}>
                    {(['D', 'W', 'M', 'All'] as TimePeriod[]).map((period) => (
                        <TouchableOpacity
                            key={period}
                            onPress={() => setSelectedPeriod(period)}
                            className={`rounded ${selectedPeriod === period ? 'bg-white' : 'bg-tactical-800'}`}
                            style={{ paddingHorizontal: hs(16), paddingVertical: vs(8) }}
                        >
                            <Text
                                className={selectedPeriod === period ? 'text-tactical-950' : 'text-white/50'}
                                style={{ fontFamily: 'Inter_700Bold', fontSize: ms(12) }}
                            >
                                {period}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Tabs */}
                <View className="flex-row justify-center border-b border-tactical-800" style={{ marginTop: vs(24), marginHorizontal: hs(16) }}>
                    {(['overview', 'details'] as const).map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            className={`flex-1 items-center ${activeTab === tab ? 'border-b-2 border-white' : ''}`}
                            style={{ paddingVertical: vs(12) }}
                        >
                            <Text
                                className={activeTab === tab ? 'text-white' : 'text-white/50'}
                                style={{ fontFamily: 'Inter_600SemiBold', fontSize: ms(12), textTransform: 'capitalize' }}
                            >
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Tab Content */}
                <View style={{ padding: ms(16), gap: vs(16) }}>
                    {activeTab === 'overview' && (
                        <>
                            {/* Stock Analysis Card */}
                            <Card style={{ padding: ms(16) }}>
                                <Text className="text-white uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14), marginBottom: vs(16) }}>
                                    Stock Analysis Overview
                                </Text>

                                <View className="flex-row flex-wrap" style={{ gap: hs(16) }}>
                                    <View className="flex-1" style={{ minWidth: '40%' }}>
                                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>Open</Text>
                                        <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: ms(14) }}>{formatStockPrice(analytics.open)}</Text>
                                    </View>
                                    <View className="flex-1" style={{ minWidth: '40%' }}>
                                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>Close</Text>
                                        <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: ms(14) }}>{formatStockPrice(analytics.close)}</Text>
                                    </View>
                                    <View className="flex-1" style={{ minWidth: '40%' }}>
                                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>High</Text>
                                        <Text className="text-accent-green" style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: ms(14) }}>{formatStockPrice(analytics.high)}</Text>
                                    </View>
                                    <View className="flex-1" style={{ minWidth: '40%' }}>
                                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>Low</Text>
                                        <Text className="text-accent-red" style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: ms(14) }}>{formatStockPrice(analytics.low)}</Text>
                                    </View>
                                    <View className="flex-1" style={{ minWidth: '40%' }}>
                                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>Average</Text>
                                        <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: ms(14) }}>{formatStockPrice(analytics.average)}</Text>
                                    </View>
                                    <View className="flex-1" style={{ minWidth: '40%' }}>
                                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>Change</Text>
                                        <Text
                                            className={isPositive ? 'text-accent-green' : 'text-accent-red'}
                                            style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: ms(14) }}
                                        >
                                            {isPositive ? '+' : ''}{analytics.changePercent.toFixed(2)}%
                                        </Text>
                                    </View>
                                </View>
                            </Card>

                            {/* Stock Info Card */}
                            <Card style={{ padding: ms(16) }}>
                                <Text className="text-white uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14), marginBottom: vs(16) }}>
                                    Stock Info
                                </Text>

                                <View style={{ gap: vs(12) }}>
                                    <View className="flex-row justify-between">
                                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(12) }}>Investors</Text>
                                        <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: ms(12) }}>{stock?.investors?.toLocaleString() || 'N/A'}</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(12) }}>Market Cap</Text>
                                        <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: ms(12) }}>${(stock?.market_cap || 0).toLocaleString()}</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(12) }}>Total Shares</Text>
                                        <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: ms(12) }}>{(stock?.total_shares || 0).toLocaleString()}</Text>
                                    </View>
                                </View>
                            </Card>
                        </>
                    )}

                    {activeTab === 'details' && (
                        <Card style={{ padding: ms(16) }}>
                            <Text className="text-white uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14), marginBottom: vs(16) }}>
                                Stock Benefit
                            </Text>

                            <View style={{ gap: vs(12) }}>
                                <View className="flex-row justify-between">
                                    <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(12) }}>Benefit Type</Text>
                                    <Text className="text-accent-yellow" style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: ms(12) }}>{stock?.benefit_type || 'N/A'}</Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(12) }}>Requirement</Text>
                                    <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: ms(12) }}>{stock?.benefit_requirement?.toLocaleString() || 'N/A'} shares</Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(12) }}>Frequency</Text>
                                    <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: ms(12) }}>Every {stock?.benefit_frequency || 'N/A'} days</Text>
                                </View>
                                {stock?.benefit_description && (
                                    <View style={{ marginTop: vs(8) }}>
                                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10), marginBottom: vs(4) }}>Description</Text>
                                        <Text className="text-white/80" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(11) }}>{stock.benefit_description}</Text>
                                    </View>
                                )}
                            </View>
                        </Card>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}