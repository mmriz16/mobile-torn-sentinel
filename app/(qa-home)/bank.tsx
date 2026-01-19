import { Card } from "@/src/components/ui/card";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Logo from "../../assets/logo.svg";
import { GridPattern } from "../../src/components/ui/grid-pattern";
import { TitleBar } from "../../src/components/ui/title-bar";
import { supabase } from "../../src/services/supabase";
import { fetchBankRates, fetchCityBankDetails, fetchUserDataWithNetworth, formatCurrency, TornBankRates, TornCityBankDetails, TornNetworth, TornUserData } from "../../src/services/torn-api";
import { moderateScale as ms, verticalScale as vs } from "../../src/utils/responsive";

// Helper: Get today's date string at midnight in user's timezone (YYYY-MM-DD)
const getTodayDateString = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Helper: Get yesterday's date string
const getYesterdayDateString = (): string => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Interface for daily snapshot
interface DailySnapshot {
    date: string;
    wallet: number;
    stocks: number;
}

// Bank transaction log from database
interface BankLog {
    log_hash: string;
    user_id: number;
    log_type: number;
    category: string;
    title: string;
    amount: number;
    transaction_time: string;
    invest_worth: number | null;
    invest_duration: number | null;
    invest_percent: number | null;
}

export default function Bank() {
    const [networth, setNetworth] = useState<TornNetworth | null>(null);
    const [userData, setUserData] = useState<TornUserData | null>(null);
    const [bankRates, setBankRates] = useState<TornBankRates | null>(null);
    const [cityBankDetails, setCityBankDetails] = useState<TornCityBankDetails | null>(null);
    const [bankLogs, setBankLogs] = useState<BankLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isInitialLoad = useRef(true);

    // Daily comparison state
    const [yesterdayWallet, setYesterdayWallet] = useState<number | null>(null);
    const [yesterdayStocks, setYesterdayStocks] = useState<number | null>(null);

    const loadData = async () => {
        if (isInitialLoad.current) {
            setIsLoading(true);
        }
        const [{ userData: userDataResult, networth: networthData }, rates, cityBank] = await Promise.all([
            fetchUserDataWithNetworth(),
            fetchBankRates(),
            fetchCityBankDetails()
        ]);
        setNetworth(networthData);
        setUserData(userDataResult);
        setBankRates(rates);
        setCityBankDetails(cityBank);

        // Fetch bank logs from database if user id is available
        if (userDataResult?.profile?.id) {
            console.log('🏦 Fetching bank logs for user:', userDataResult.profile.id);
            const { data: logs, error } = await supabase
                .from('bank_logs')
                .select('*')
                .eq('user_id', userDataResult.profile.id)
                .order('transaction_time', { ascending: false })
                .limit(2);
            console.log('🏦 Bank logs result:', logs, 'error:', error);
            setBankLogs(logs || []);
        } else {
            console.log('🏦 No user ID available');
        }

        setIsLoading(false);
        isInitialLoad.current = false;

        // Handle daily snapshots for comparison
        await handleDailySnapshots(userDataResult, networthData);
    };

    // Daily snapshot logic
    const handleDailySnapshots = async (user: TornUserData | null, nw: TornNetworth | null) => {
        if (Platform.OS === 'web') return; // Skip on web
        if (!user) return;

        const todayDate = getTodayDateString();
        const yesterdayDate = getYesterdayDateString();

        // Calculate current values
        const moneyData = user.money;
        const networthData = nw?.personalstats?.networth;
        const currentWallet = Number(moneyData?.wallet) || Number(networthData?.wallet) || 0;
        const currentStocks = Number(networthData?.stock_market) || 0;

        try {
            // Get stored snapshots
            const storedData = await SecureStore.getItemAsync('bank_daily_snapshots');
            let snapshots: DailySnapshot[] = storedData ? JSON.parse(storedData) : [];

            // Find yesterday's snapshot
            const yesterdaySnapshot = snapshots.find(s => s.date === yesterdayDate);
            if (yesterdaySnapshot) {
                setYesterdayWallet(yesterdaySnapshot.wallet);
                setYesterdayStocks(yesterdaySnapshot.stocks);
            }

            // Check if today's snapshot already exists
            const todaySnapshotIndex = snapshots.findIndex(s => s.date === todayDate);
            if (todaySnapshotIndex === -1) {
                // First check of the day - save snapshot
                snapshots.push({ date: todayDate, wallet: currentWallet, stocks: currentStocks });
            }

            // Keep only last 7 days of snapshots
            snapshots = snapshots
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 7);

            await SecureStore.setItemAsync('bank_daily_snapshots', JSON.stringify(snapshots));
        } catch (e) {
            console.warn('Failed to handle daily snapshots:', e);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Format player ID like: **** **** *238 1000
    const formatPlayerId = (id: number): string => {
        const idStr = id.toString();
        const lastFour = idStr.slice(-4).padStart(4, '0');
        const beforeLastFour = idStr.slice(-7, -4).padStart(3, '0');
        return `**** **** *${beforeLastFour.slice(-3)} ${lastFour}`;
    };

    // Format days played as XX/XX
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

    // Format currency in short form (K, M, B)
    const formatCurrencyShort = (num: number): string => {
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
        return `$${num.toFixed(0)}`;
    };

    // Determine tenor from time_left (in seconds)
    const getTenorFromTimeLeft = (timeLeft: number | null): string => {
        if (!timeLeft || timeLeft <= 0) return "-";
        const days = Math.ceil(timeLeft / 86400);
        if (days <= 7) return "1w";
        if (days <= 14) return "2w";
        if (days <= 30) return "1m";
        if (days <= 60) return "2m";
        return "3m";
    };

    // Get human readable tenor label
    const getTenorLabel = (tenor: string): string => {
        const labels: Record<string, string> = {
            "1w": "1 Week",
            "2w": "2 Weeks",
            "1m": "1 Month",
            "2m": "2 Months",
            "3m": "3 Months",
        };
        return labels[tenor] || "-";
    };

    // Get rate for the current tenor
    const getCurrentBankRate = (): { rate: number; tenor: string } => {
        const timeLeft = cityBankDetails?.time_left ?? null;
        const tenor = getTenorFromTimeLeft(timeLeft);
        if (!bankRates || tenor === "-") return { rate: 0, tenor: "-" };
        const rate = bankRates[tenor as keyof TornBankRates] || 0;
        return { rate, tenor };
    };

    // Cayman Bank daily rate (fixed at ~0.03% per day = ~10.95% APY)
    const caymanDailyRate = 0.03;

    // Calculate Bank Total: wallet + stock_market + bank (Torn Bank) + overseas_bank (Offshore)
    const wallet = Number(moneyData?.wallet) || Number(networthData?.wallet) || 0;
    const stockMarket = Number(networthData?.stock_market) || 0;
    const tornBank = Number(moneyData?.city_bank) || Number(networthData?.bank) || 0;
    const offshoreBank = Number(moneyData?.cayman_bank) || Number(networthData?.overseas_bank) || 0;
    const bankTotal = wallet + stockMarket + tornBank + offshoreBank;

    const { rate: currentBankRate, tenor: currentTenor } = getCurrentBankRate();

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <TitleBar title="Bank" />
            <View className="flex-1" style={{ padding: ms(16), gap: vs(16) }}>
                <View style={{ gap: vs(10) }}>

                    {/* Bank Card */}
                    <Card style={{ padding: ms(16), gap: vs(24), overflow: 'hidden' }}>
                        <Image
                            source={require('../../assets/images/card.png')}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                width: '100%',
                                height: '100%',
                            }}
                            resizeMode="cover"
                        />
                        <View className="flex-row justify-between">
                            <View style={{ gap: vs(2) }}>
                                <Text className="text-white/50" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Name</Text>
                                <Text className="text-white uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(20) }}>{userData?.profile?.name ?? "Loading..."}</Text>
                            </View>
                            <View className="flex-row items-center" style={{ gap: vs(2) }}>
                                <Logo width={ms(20)} height={ms(20)} />
                                <Text className="text-white camelCase font-sans" style={{ fontSize: ms(12) }}>Torn Sentinel</Text>
                            </View>
                        </View>
                        <Text className="text-accent-yellow text-start" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(34) }}>{formatCurrency(bankTotal)}</Text>
                        <View className="flex-row justify-between">
                            <View style={{ gap: vs(2) }}>
                                <Text className="text-white/50" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Player ID</Text>
                                <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(20) }}>{userData?.profile?.id ? formatPlayerId(userData.profile.id) : "Loading..."}</Text>
                            </View>
                            <View className="items-start" style={{ gap: vs(2) }}>
                                <Text className="text-white/50" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Days</Text>
                                <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(20) }}>{userData?.profile?.age ? formatDaysPlayed(userData.profile.age) : "--/--"}</Text>
                            </View>
                        </View>
                    </Card>

                    {/* Wallet & Company Stocks */}
                    <View className="flex-row" style={{ gap: vs(10) }}>
                        <Card className="flex-1" style={{ padding: ms(16), gap: vs(2) }}>
                            <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Wallet</Text>
                            <Text className={wallet > 0 ? "text-white" : "text-white/50"} style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(24) }}>{wallet > 0 ? formatCurrencyShort(wallet) : "-"}</Text>
                            <View className="flex-row" style={{ gap: vs(4) }}>
                                {yesterdayWallet !== null && wallet > 0 ? (
                                    <>
                                        <Text className={wallet - yesterdayWallet >= 0 ? "text-accent-green" : "text-accent-red"} style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>
                                            {wallet - yesterdayWallet >= 0 ? '+' : ''}{formatCurrencyShort(wallet - yesterdayWallet)}
                                        </Text>
                                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>VS Yesterday</Text>
                                    </>
                                ) : (
                                    <>
                                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>-</Text>
                                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>VS Yesterday</Text>
                                    </>
                                )}
                            </View>
                        </Card>
                        <Card className="flex-1" style={{ padding: ms(16), gap: vs(2) }}>
                            <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Company Stocks</Text>
                            <Text className={stockMarket > 0 ? "text-white" : "text-white/50"} style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(24) }}>{stockMarket > 0 ? formatCurrencyShort(stockMarket) : "-"}</Text>
                            <View className="flex-row" style={{ gap: vs(4) }}>
                                {yesterdayStocks !== null && stockMarket > 0 ? (
                                    <>
                                        <Text className={stockMarket - yesterdayStocks >= 0 ? "text-accent-green" : "text-accent-red"} style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>
                                            {stockMarket - yesterdayStocks >= 0 ? '+' : ''}{formatCurrencyShort(stockMarket - yesterdayStocks)}
                                        </Text>
                                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>VS Yesterday</Text>
                                    </>
                                ) : (
                                    <>
                                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>-</Text>
                                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>VS Yesterday</Text>
                                    </>
                                )}
                            </View>
                        </Card>
                    </View>

                    {/* Torn Bank & Offshore Bank */}
                    <View className="flex-row" style={{ gap: vs(10) }}>
                        <Card className="flex-1" style={{ padding: ms(16), gap: vs(2) }}>
                            <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Torn Bank</Text>
                            <Text className={tornBank > 0 ? "text-white" : "text-white/50"} style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(24) }}>{tornBank > 0 ? formatCurrencyShort(tornBank) : "-"}</Text>
                            <View className="flex-row" style={{ gap: vs(4) }}>
                                <Text className={currentBankRate > 0 ? "text-accent-green" : "text-white/50"} style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>{currentBankRate > 0 ? `${currentBankRate.toFixed(2)}%` : "-"}</Text>
                                <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>{currentTenor !== "-" ? getTenorLabel(currentTenor) : "Rate / Tenor"}</Text>
                            </View>
                        </Card>
                        <Card className="flex-1" style={{ padding: ms(16), gap: vs(2) }}>
                            <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Offshore Bank</Text>
                            <Text className={offshoreBank > 0 ? "text-white" : "text-white/50"} style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(24) }}>{offshoreBank > 0 ? formatCurrencyShort(offshoreBank) : "-"}</Text>
                            <View className="flex-row" style={{ gap: vs(4) }}>
                                <Text className={offshoreBank > 0 ? "text-accent-green" : "text-white/50"} style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>{offshoreBank > 0 ? `+${caymanDailyRate.toFixed(2)}%` : "-"}</Text>
                                <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>Daily Rate</Text>
                            </View>
                        </Card>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={{ gap: vs(10) }}>
                    <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Quick Actions</Text>
                    <View className="flex-row" style={{ gap: vs(10) }}>
                        <TouchableOpacity className="flex-1" activeOpacity={0.7} onPress={() => router.push('/(qa-bank)/torn-bank')}>
                            <Card className="items-center" style={{ padding: ms(16) }}>
                                <Text className="text-white uppercase" style={{ fontFamily: 'Inter_600SemiBold', fontSize: ms(8) }}>Torn Bank</Text>
                            </Card>
                        </TouchableOpacity>
                        <TouchableOpacity className="flex-1" activeOpacity={0.7} onPress={() => router.push('/(qa-bank)/offshore-bank')}>
                            <Card className="items-center" style={{ padding: ms(16) }}>
                                <Text className="text-white uppercase" style={{ fontFamily: 'Inter_600SemiBold', fontSize: ms(8) }}>Offshore Bank</Text>
                            </Card>
                        </TouchableOpacity>
                        <TouchableOpacity className="flex-1" activeOpacity={0.7} onPress={() => router.push('/(qa-bank)/stock')}>
                            <Card className="items-center" style={{ padding: ms(16) }}>
                                <Text className="text-white uppercase" style={{ fontFamily: 'Inter_600SemiBold', fontSize: ms(8) }}>Company Stocks</Text>
                            </Card>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bank Investments History */}
                <View style={{ gap: vs(10) }}>
                    <View className="flex-row justify-between">
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Bank Transaction History</Text>
                        <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_400Regular', fontSize: ms(10) }}>See All</Text>
                    </View>
                    <View style={{ gap: vs(8) }}>
                        {bankLogs.length > 0 ? (
                            bankLogs.map((log) => (
                                <Card key={log.log_hash} className="flex-row justify-between" style={{ padding: ms(16) }}>
                                    <View className="flex-col">
                                        <Text className="text-white uppercase" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(14) }}>{log.title}</Text>
                                        <Text className="text-white/50" style={{ fontSize: ms(10) }}>{new Date(log.transaction_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                                    </View>
                                    <View className="flex-col items-end">
                                        <Text className={log.amount >= 0 ? "text-accent-green" : "text-accent-red"} style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(14) }}>{log.amount >= 0 ? "+" : ""}{formatCurrencyShort(Math.abs(log.amount))}</Text>
                                        {log.invest_percent ? (
                                            <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>{log.invest_percent.toFixed(2)}%</Text>
                                        ) : null}
                                    </View>
                                </Card>
                            ))
                        ) : (
                            <Text className="text-white/50 text-center" style={{ fontSize: ms(12) }}>No transaction history</Text>
                        )}
                    </View>
                </View>

                {/* Company Stocks History */}
                <View style={{ gap: vs(10) }}>
                    <View className="flex-row justify-between">
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Company Stocks History</Text>
                        <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_400Regular', fontSize: ms(10) }}>See All</Text>
                    </View>
                    <View>
                        <Card className="flex-row justify-between" style={{ padding: ms(16) }}>
                            <View className="flex-col">
                                <Text className="text-white uppercase" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(14) }}>THS</Text>
                                <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>Torn City Health Service</Text>
                            </View>
                            <View className="flex-col items-end">
                                <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(14) }}>$20,000,000</Text>
                                <Text className="text-accent-green" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>+0.78%</Text>
                            </View>
                        </Card>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}