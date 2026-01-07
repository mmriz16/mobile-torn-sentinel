import { ChartNoAxesCombined, HelpCircle, LucideIcon, Package, Receipt, Wallet } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Logo from "../../assets/logo.svg";
import { GridPattern } from "../../src/components/ui/grid-pattern";
import { TitleBar } from "../../src/components/ui/title-bar";
import { fetchNetworth, fetchUserData, formatCurrency, TornNetworth, TornUserData } from "../../src/services/torn-api";
import { horizontalScale as hs, moderateScale as ms, verticalScale as vs } from "../../src/utils/responsive";

// Human-readable labels for networth fields
const NETWORTH_LABELS: Record<string, string> = {
    total: "Total Networth",
    wallet: "Wallet",
    vaults: "Vaults",
    bank: "City Bank",
    overseas_bank: "Cayman Bank",
    points: "Points",
    inventory: "Inventory",
    display_case: "Display Case",
    bazaar: "Bazaar",
    item_market: "Item Market",
    property: "Property",
    stock_market: "Stock Market",
    auction_house: "Auction House",
    bookie: "Bookie",
    company: "Company",
    enlisted_cars: "Enlisted Cars",
    piggy_bank: "Piggy Bank",
    pending: "Pending",
    loans: "Loans",
    unpaid_fees: "Unpaid Fees",
    trade: "Trade",
};

// Category groupings
const ASSET_CATEGORIES = {
    liquid: ["wallet", "vaults", "bank", "overseas_bank", "points"],
    items: ["inventory", "display_case", "bazaar", "item_market", "trade"],
    investments: ["property", "stock_market", "auction_house", "bookie", "company", "enlisted_cars", "piggy_bank"],
    other: ["pending"],
    liabilities: ["loans", "unpaid_fees"],
};

const CATEGORY_LABELS: Record<string, string> = {
    liquid: "Liquid Assets",
    items: "Items",
    investments: "Investments",
    other: "Other",
    liabilities: "Liabilities",
};

const CATEGORY_COLORS: Record<string, string> = {
    liquid: "text-white/50",
    items: "text-white/50",
    investments: "text-white/50",
    other: "text-white/50",
    liabilities: "text-accent-red",
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    liquid: Wallet,
    items: Package,
    investments: ChartNoAxesCombined,
    other: HelpCircle,
    liabilities: Receipt,
};

export default function Networth() {
    const [networth, setNetworth] = useState<TornNetworth | null>(null);
    const [userData, setUserData] = useState<TornUserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const isInitialLoad = useRef(true);

    const loadData = async () => {
        // Only show loading on initial load, not on background refresh
        if (isInitialLoad.current) {
            setIsLoading(true);
        }
        const [networthData, userDataResult] = await Promise.all([
            fetchNetworth(),
            fetchUserData()
        ]);
        setNetworth(networthData);
        setUserData(userDataResult);
        setIsLoading(false);
        isInitialLoad.current = false;
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10 * 1000); // Auto-refresh every 10 seconds
        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    // Format player ID like: **** **** *238 1000
    const formatPlayerId = (id: number): string => {
        const idStr = id.toString();
        const lastFour = idStr.slice(-4).padStart(4, '0');
        const beforeLastFour = idStr.slice(-7, -4).padStart(3, '0');
        return `**** **** *${beforeLastFour.slice(-3)} ${lastFour}`;
    };

    // Format days played as XX/XX (first 2 digits / last 2 digits)
    const formatDaysPlayed = (days: number): string => {
        const daysStr = days.toString().padStart(4, '0');
        const firstTwo = daysStr.slice(0, 2);
        const lastTwo = daysStr.slice(-2);
        return `${firstTwo}/${lastTwo}`;
    };

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

    // Hybrid approach: Use real-time money data for liquid assets
    // Map real-time money fields to networth keys
    const realTimeLiquid: Record<string, number> = {
        wallet: moneyData?.wallet ?? networthData?.wallet ?? 0,
        vaults: moneyData?.vault ?? networthData?.vaults ?? 0,
        bank: moneyData?.city_bank ?? networthData?.bank ?? 0,
        overseas_bank: moneyData?.cayman_bank ?? networthData?.overseas_bank ?? 0,
        points: moneyData?.points ?? networthData?.points ?? 0,
    };

    // Calculate hybrid total: replace liquid assets in cached total with real-time values
    const cachedLiquidTotal = (networthData?.wallet ?? 0) + (networthData?.vaults ?? 0) +
        (networthData?.bank ?? 0) + (networthData?.overseas_bank ?? 0) + (networthData?.points ?? 0);
    const realTimeLiquidTotal = Object.values(realTimeLiquid).reduce((sum, val) => sum + val, 0);
    const total = (networthData?.total ?? 0) - cachedLiquidTotal + realTimeLiquidTotal;

    // Group non-zero items by category
    const groupedItems: Record<string, { key: string; value: number }[]> = {
        liquid: [],
        items: [],
        investments: [],
        other: [],
        liabilities: [],
    };
    if (networthData) {
        Object.entries(networthData).forEach(([key, value]) => {
            if (key === "total") return;

            // For liquid assets, use real-time values from money endpoint
            let displayValue: number;
            if (key in realTimeLiquid) {
                displayValue = realTimeLiquid[key];
            } else {
                displayValue = value as number;
            }

            // Skip items with value 0
            if (displayValue === 0) return;

            for (const [category, keys] of Object.entries(ASSET_CATEGORIES)) {
                if (keys.includes(key)) {
                    groupedItems[category].push({ key, value: displayValue });
                    break;
                }
            }
        });
    }

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <TitleBar title="Networth" />
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: hs(16), gap: vs(10) }}
            >
                {/* Total Networth Header */}
                <View
                    className="bg-tactical-900 border border-tactical-800 rounded-lg"
                    style={{ padding: ms(16), gap: ms(24) }}
                >
                    <View className="flex-row items-center justify-between">
                        <View style={{ gap: ms(4) }}>
                            <Text
                                className="text-white/50 camelCase font-sans"
                                style={{ fontSize: ms(10) }}
                            >
                                Name
                            </Text>
                            <Text
                                className="text-white uppercase"
                                style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(20), }}
                            >
                                {userData?.profile?.name || 'Unknown'}
                            </Text>
                        </View>
                        <View className="flex-row items-center" style={{ gap: ms(4) }}>
                            <Logo width={ms(20)} height={ms(20)} />
                            <Text
                                className="text-white camelCase font-sans"
                                style={{ fontSize: ms(12) }}
                            >
                                Torn Sentinel
                            </Text>
                        </View>
                    </View>
                    <Text
                        className="text-accent-yellow"
                        style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(34) }}
                    >
                        {formatCurrency(total)}
                    </Text>
                    <View style={{ gap: ms(4), flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ gap: ms(4) }}>
                            <Text
                                className="text-white/50 camelCase font-sans"
                                style={{ fontSize: ms(10) }}
                            >
                                Player ID
                            </Text>
                            <Text
                                className="text-white uppercase"
                                style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(20), }}
                            >
                                {userData?.profile?.id ? formatPlayerId(userData.profile.id) : '**** **** *000 0000'}
                            </Text>
                        </View>
                        <View style={{ gap: ms(4) }}>
                            <Text
                                className="text-white/50 camelCase font-sans"
                                style={{ fontSize: ms(10) }}
                            >
                                Days
                            </Text>
                            <Text
                                className="text-white uppercase"
                                style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(20), }}
                            >
                                {userData?.profile?.age ? formatDaysPlayed(userData.profile.age) : '00/00'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Category Sections */}
                {Object.entries(groupedItems).map(([category, items]) => {
                    if (items.length === 0) return null;

                    const categoryTotal = items.reduce((sum, item) => sum + item.value, 0);

                    return (
                        <View
                            key={category}
                            className="bg-tactical-900 border border-tactical-800 rounded-lg"
                            style={{ overflow: 'hidden' }}
                        >
                            {/* Category Header */}
                            <View
                                className="flex-row justify-between items-center border-b border-tactical-800"
                                style={{ padding: ms(14) }}
                            >
                                <View className="flex-row items-center" style={{ gap: hs(8) }}>
                                    {(() => {
                                        const IconComponent = CATEGORY_ICONS[category];
                                        return <IconComponent size={ms(16)} color={category === 'liabilities' ? '#EF4444' : 'rgba(255,255,255,0.5)'} />;
                                    })()}
                                    <Text
                                        className={`uppercase font-sans-extrabold ${CATEGORY_COLORS[category]}`}
                                        style={{ fontSize: ms(12) }}
                                    >
                                        {CATEGORY_LABELS[category]}
                                    </Text>
                                </View>
                                <Text
                                    className={`font-mono bg-tactical-950 border border-tactical-800 ${category === 'liabilities' ? 'text-accent-red' : 'text-accent-green'}`}
                                    style={{ fontSize: ms(10), padding: ms(6) }}
                                >
                                    {category === 'liabilities' ? '-' : ''}{formatCurrency(Math.abs(categoryTotal))}
                                </Text>
                            </View>

                            {/* Items List */}
                            <View className="bg-tactical-950 border border-tactical-800 rounded-[2px] m-4" style={{ padding: ms(14), gap: vs(10) }}>
                                {items.map((item) => (
                                    <View
                                        key={item.key}
                                        className="flex-row justify-between items-center"
                                    >
                                        <Text
                                            className="text-white/70 font-sans"
                                            style={{ fontSize: ms(12) }}
                                        >
                                            {NETWORTH_LABELS[item.key] || item.key}
                                        </Text>
                                        <Text
                                            className={`font-mono ${item.value < 0 ? 'text-accent-red' : 'text-white'}`}
                                            style={{ fontSize: ms(12) }}
                                        >
                                            {item.value < 0 ? '-' : ''}{formatCurrency(Math.abs(item.value))}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </SafeAreaView >
    );
}
