import { Card } from "@/src/components/ui/card";
import { GridPattern } from "@/src/components/ui/grid-pattern";
import { PhysicalCard } from "@/src/components/ui/physical-card";
import { ProgressBar } from "@/src/components/ui/progress-bar";
import { fetchUserDataWithNetworth, formatCurrency, getCityBankAmount, TornNetworth, TornUserData } from "@/src/services/torn-api";
import { horizontalScale as hs, moderateScale as ms, verticalScale as vs } from '@/src/utils/responsive';
import { router } from "expo-router";
import { ChartNoAxesCombined, LucideIcon, Package, Wallet } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Human-readable labels for networth fields
const NETWORTH_LABELS: Record<string, string> = {
    wallet: "Wallet",
    vaults: "Vaults",
    bank: "City Bank",
    overseas_bank: "Cayman Bank",
    points: "Points",
    inventory: "Inventory",
    display_case: "Display Case",
    bazaar: "Bazaar",
    item_market: "Item Market",
    trade: "Trade",
    property: "Property",
    stock_market: "Stock Market",
    auction_house: "Auction House",
    bookie: "Bookie",
    company: "Company",
    enlisted_cars: "Enlisted Cars",
    piggy_bank: "Piggy Bank",
    pending: "Pending",
};

// Asset classes (liabilities are shown separately)
const ASSET_CLASSES: { key: string; label: string; icon: LucideIcon; color: string; text: string; fields: string[] }[] = [
    { key: 'liquid', label: 'Liquid', icon: Wallet, color: 'bg-accent-green', text: 'text-accent-green', fields: ["wallet", "vaults", "bank", "overseas_bank", "points"] },
    { key: 'items', label: 'Items', icon: Package, color: 'bg-accent-blue', text: 'text-accent-blue', fields: ["inventory", "display_case", "bazaar", "item_market", "trade"] },
    { key: 'investments', label: 'Investments', icon: ChartNoAxesCombined, color: 'bg-accent-yellow', text: 'text-accent-yellow', fields: ["property", "stock_market", "auction_house", "bookie", "company", "enlisted_cars", "piggy_bank", "pending"] },
];

export default function Assets() {
    const [networth, setNetworth] = useState<TornNetworth | null>(null);
    const [userData, setUserData] = useState<TornUserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const isInitialLoad = useRef(true);

    const loadData = async () => {
        if (isInitialLoad.current) {
            setIsLoading(true);
        }
        const { userData: userDataResult, networth: networthData } = await fetchUserDataWithNetworth();
        setNetworth(networthData);
        setUserData(userDataResult);
        setIsLoading(false);
        isInitialLoad.current = false;
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-tactical-950 items-center justify-center">
                <ActivityIndicator color="#F59E0B" size="large" />
                <Text className="text-white/50 mt-4 font-mono uppercase text-xs">Loading...</Text>
            </SafeAreaView>
        );
    }

    const networthData = networth?.personalstats?.networth;
    const moneyData = userData?.money;

    // Real-time money values for liquid assets, cached networth for everything else (same as Networth page)
    const values: Record<string, number> = {};
    if (networthData) {
        for (const key of Object.keys(NETWORTH_LABELS)) {
            values[key] = Number(networthData[key as keyof typeof networthData]) || 0;
        }
    }
    values.wallet = Number(moneyData?.wallet) || values.wallet || 0;
    values.vaults = Number(moneyData?.vault) || values.vaults || 0;
    values.bank = getCityBankAmount(moneyData) || values.bank || 0;
    values.overseas_bank = Number(moneyData?.cayman_bank) || values.overseas_bank || 0;

    const classes = ASSET_CLASSES.map(c => ({
        ...c,
        total: c.fields.reduce((sum, f) => sum + Math.max(0, values[f] || 0), 0),
    }));
    const grossAssets = classes.reduce((sum, c) => sum + c.total, 0);
    const liabilities = Math.abs(Number(networthData?.loans) || 0) + Math.abs(Number(networthData?.unpaid_fees) || 0);
    const netAssets = grossAssets - liabilities;

    const topHoldings = Object.entries(values)
        .filter(([, value]) => value > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <ScrollView className="flex-1" contentContainerStyle={{ padding: ms(16), gap: vs(16) }}>

                {/* Net Assets Card */}
                <PhysicalCard>
                    <View style={{ gap: vs(2) }}>
                        <Text className="text-white/50" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Net Assets</Text>
                        <Text className="text-accent-yellow" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(34) }}>{formatCurrency(netAssets)}</Text>
                    </View>
                    <View className="flex-row justify-between">
                        <View style={{ gap: vs(2) }}>
                            <Text className="text-white/50" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Gross Assets</Text>
                            <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(16) }}>{formatCurrency(grossAssets)}</Text>
                        </View>
                        <View className="items-end" style={{ gap: vs(2) }}>
                            <Text className="text-white/50" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Liabilities</Text>
                            <Text className={liabilities > 0 ? "text-accent-red" : "text-white"} style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(16) }}>
                                {liabilities > 0 ? '-' : ''}{formatCurrency(liabilities)}
                            </Text>
                        </View>
                    </View>
                </PhysicalCard>

                {/* Allocation */}
                <View style={{ gap: vs(10) }}>
                    <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Allocation</Text>
                    <Card>
                        {/* Stacked allocation bar */}
                        <View className="border-b border-tactical-800" style={{ padding: ms(16) }}>
                            <View className="flex-row rounded-full overflow-hidden bg-tactical-950" style={{ height: ms(8) }}>
                                {classes.map(c => (
                                    <View key={c.key} className={c.color} style={{ flex: grossAssets > 0 ? c.total / grossAssets : 0 }} />
                                ))}
                            </View>
                        </View>
                        <View className="bg-tactical-950" style={{ padding: ms(16), gap: vs(14) }}>
                            {classes.map(c => {
                                const share = grossAssets > 0 ? c.total / grossAssets : 0;
                                const Icon = c.icon;
                                return (
                                    <View key={c.key} style={{ gap: vs(6) }}>
                                        <View className="flex-row justify-between items-center">
                                            <View className="flex-row items-center" style={{ gap: hs(8) }}>
                                                <Icon size={ms(14)} color="rgba(255,255,255,0.5)" />
                                                <Text className={`uppercase ${c.text}`} style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>{c.label}</Text>
                                            </View>
                                            <View className="flex-row items-end" style={{ gap: ms(6) }}>
                                                <Text className="text-white font-mono" style={{ fontSize: ms(12) }}>{formatCurrency(c.total)}</Text>
                                                <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>{(share * 100).toFixed(1)}%</Text>
                                            </View>
                                        </View>
                                        <ProgressBar
                                            value={share}
                                            height={ms(6)}
                                            className="rounded-full"
                                            trackClassName="bg-tactical-900"
                                            fillClassName={`${c.color} rounded-full`}
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    </Card>
                </View>

                {/* Top Holdings */}
                <View style={{ gap: vs(10) }}>
                    <View className="flex-row justify-between">
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Top Holdings</Text>
                        <TouchableOpacity onPress={() => router.push('/(quick-actions)/networth' as any)}>
                            <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_400Regular', fontSize: ms(10) }}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    {topHoldings.length > 0 ? (
                        <View style={{ gap: vs(8) }}>
                            {topHoldings.map(([key, value], index) => (
                                <Card key={key} className="flex-row justify-between items-center" style={{ padding: ms(16) }}>
                                    <View className="flex-row items-center" style={{ gap: hs(10) }}>
                                        <Text className="text-white/30" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(14) }}>{String(index + 1).padStart(2, '0')}</Text>
                                        <Text className="text-white uppercase" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(14) }}>{NETWORTH_LABELS[key]}</Text>
                                    </View>
                                    <View className="flex-col items-end">
                                        <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(14) }}>{formatCurrency(value)}</Text>
                                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>
                                            {grossAssets > 0 ? ((value / grossAssets) * 100).toFixed(1) : '0.0'}%
                                        </Text>
                                    </View>
                                </Card>
                            ))}
                        </View>
                    ) : (
                        <Card style={{ padding: ms(16) }}>
                            <Text className="text-white/50 text-center" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(12) }}>No assets found</Text>
                        </Card>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
