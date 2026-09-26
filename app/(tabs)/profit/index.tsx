import { Card } from "@/src/components/ui/card";
import { GridPattern } from "@/src/components/ui/grid-pattern";
import { PhysicalCard } from "@/src/components/ui/physical-card";
import { ProgressBar } from "@/src/components/ui/progress-bar";
import { syncNetworthAndGetProfit } from "@/src/services/profit-tracker";
import { fetchBankInterestModifier, fetchBankRates, fetchCityBankDetails, fetchUserDataWithNetworth, formatCurrency, TornBankRates, TornCityBank, TornCityBankDetails, TornNetworth } from "@/src/services/torn-api";
import { moderateScale as ms, verticalScale as vs } from '@/src/utils/responsive';
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Tenor buckets derived from the remaining investment time (same buckets as the Bank pages)
const TENORS = [
    { key: '1w' as const, label: '1 Week', days: 7 },
    { key: '2w' as const, label: '2 Weeks', days: 14 },
    { key: '1m' as const, label: '1 Month', days: 30 },
    { key: '2m' as const, label: '2 Months', days: 60 },
    { key: '3m' as const, label: '3 Months', days: 90 },
];

const getTenor = (timeLeft: number) => {
    const days = Math.ceil(timeLeft / 86400);
    return TENORS.find(t => days <= t.days) ?? TENORS[TENORS.length - 1];
};

// Format currency in short form (K, M, B)
const formatCurrencyShort = (num: number): string => {
    const sign = num < 0 ? '-' : '';
    const abs = Math.abs(num);
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`;
    return `${sign}$${abs.toFixed(0)}`;
};

const parseAmount = (value: string): number => Number(value.replace(/,/g, '')) || 0;

export default function Profit() {
    const [networth, setNetworth] = useState<TornNetworth | null>(null);
    const [dailyProfit, setDailyProfit] = useState(0);
    const [profitPercent, setProfitPercent] = useState(0);
    const [cityBank, setCityBank] = useState<TornCityBankDetails | null>(null);
    const [userCityBank, setUserCityBank] = useState<TornCityBank | null>(null);
    const [bankRates, setBankRates] = useState<TornBankRates | null>(null);
    const [bankBonus, setBankBonus] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const isInitialLoad = useRef(true);

    // Trade calculator inputs
    const [buyPrice, setBuyPrice] = useState('');
    const [sellPrice, setSellPrice] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [feePercent, setFeePercent] = useState('0');

    const loadData = async () => {
        if (isInitialLoad.current) {
            setIsLoading(true);
        }
        const [{ userData, networth: networthData }, cityBankResult, rates, bonus] = await Promise.all([
            fetchUserDataWithNetworth(),
            fetchCityBankDetails(),
            fetchBankRates(),
            fetchBankInterestModifier(),
        ]);
        setNetworth(networthData);
        setCityBank(cityBankResult);
        const liveCityBank = userData?.money?.city_bank;
        setUserCityBank(liveCityBank && typeof liveCityBank === 'object' ? liveCityBank : null);
        setBankRates(rates);
        setBankBonus(bonus);

        const total = networthData?.personalstats?.networth?.total;
        if (userData?.profile?.id && total) {
            const profitData = await syncNetworthAndGetProfit(userData.profile.id, total);
            setDailyProfit(profitData.profit);
            setProfitPercent(profitData.percentChange);
        }

        setIsLoading(false);
        isInitialLoad.current = false;
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 60 * 1000);
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

    const networthTotal = networth?.personalstats?.networth?.total || 0;

    // Torn Bank investment. v2 money.city_bank carries the exact profit/rate/until; fall back to an
    // estimate from the tenor rates: Interest = Principal × APR × (1 + merit bonus) × (days/365)
    const liveCB = userCityBank && userCityBank.amount > 0 ? userCityBank : null;
    const principal = liveCB?.amount ?? cityBank?.amount ?? 0;
    const timeLeft = liveCB?.until ? Math.max(0, liveCB.until - Math.floor(Date.now() / 1000)) : (cityBank?.time_left ?? 0);
    const hasInvestment = principal > 0 && timeLeft > 0;
    const tenor = hasInvestment
        ? (liveCB?.duration ? TENORS.find(t => t.days === liveCB.duration) ?? getTenor(liveCB.duration * 86400) : getTenor(timeLeft))
        : null;
    const baseRate = liveCB?.interest_rate ?? (tenor && bankRates ? bankRates[tenor.key] || 0 : 0);
    const apr = baseRate * (1 + bankBonus);
    const projectedInterest = hasInvestment && tenor
        ? (liveCB?.profit ?? Math.floor(principal * (apr / 100) * (tenor.days / 365)))
        : 0;
    const investProgress = hasInvestment && tenor ? 1 - timeLeft / (tenor.days * 86400) : 0;
    const daysLeft = hasInvestment ? Math.ceil(timeLeft / 86400) : 0;

    // Trade calculator
    const buy = parseAmount(buyPrice);
    const sell = parseAmount(sellPrice);
    const qty = parseAmount(quantity);
    const fee = Math.min(100, Math.max(0, Number(feePercent) || 0));
    const grossRevenue = sell * qty;
    const feeCost = Math.floor(grossRevenue * (fee / 100));
    const cost = buy * qty;
    const tradeProfit = grossRevenue - feeCost - cost;
    const tradeRoi = cost > 0 ? (tradeProfit / cost) * 100 : 0;
    const breakEven = qty > 0 && fee < 100 ? Math.ceil(buy / (1 - fee / 100)) : 0;

    const renderInput = (label: string, value: string, onChange: (v: string) => void, prefix?: string) => (
        <View className="flex-1" style={{ gap: vs(6) }}>
            <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>{label}</Text>
            <View className="flex-row items-center bg-tactical-950 border border-tactical-800 rounded-[2px]" style={{ gap: vs(6), paddingHorizontal: ms(12), paddingVertical: ms(10) }}>
                {prefix ? <Text className="text-white" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(12) }}>{prefix}</Text> : null}
                <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="0"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    className="text-white flex-1"
                    style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(12), padding: 0 }}
                    keyboardType="numeric"
                />
            </View>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <ScrollView className="flex-1" contentContainerStyle={{ padding: ms(16), gap: vs(16) }} keyboardShouldPersistTaps="handled">

                {/* Daily Profit Card */}
                <PhysicalCard>
                    <View style={{ gap: vs(2) }}>
                        <Text className="text-white/50" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Daily Profit</Text>
                        <Text className={dailyProfit >= 0 ? "text-accent-green" : "text-accent-red"} style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(34) }}>
                            {dailyProfit >= 0 ? '+' : '-'}{formatCurrency(Math.abs(dailyProfit))}
                        </Text>
                    </View>
                    <View className="flex-row justify-between">
                        <View style={{ gap: vs(2) }}>
                            <Text className="text-white/50" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Networth</Text>
                            <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(20) }}>{formatCurrencyShort(networthTotal)}</Text>
                        </View>
                        <View className="items-end" style={{ gap: vs(2) }}>
                            <Text className="text-white/50" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>VS Yesterday</Text>
                            <Text className={profitPercent >= 0 ? "text-accent-green" : "text-accent-red"} style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(20) }}>
                                {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                            </Text>
                        </View>
                    </View>
                </PhysicalCard>

                {/* Investment Income */}
                <View style={{ gap: vs(10) }}>
                    <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Investment Income</Text>
                    {hasInvestment && tenor ? (
                        <Card style={{ padding: ms(16), gap: vs(16) }}>
                            <View className="flex-row justify-between items-center">
                                <View className="flex-col items-start">
                                    <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Torn Bank Interest</Text>
                                    <Text className="text-accent-green" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(24) }}>+{formatCurrency(projectedInterest)}</Text>
                                </View>
                                <View className="flex-col items-end">
                                    <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>{tenor.label}</Text>
                                    <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(18) }}>{apr.toFixed(2)}%</Text>
                                </View>
                            </View>
                            <ProgressBar
                                value={investProgress}
                                height={ms(6)}
                                className="rounded-full"
                                trackClassName="bg-tactical-950"
                                fillClassName="bg-accent-green rounded-full"
                            />
                            <View className="flex-row justify-between items-center">
                                <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Principal {formatCurrencyShort(principal)}</Text>
                                <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>{daysLeft} Days Left</Text>
                            </View>
                        </Card>
                    ) : (
                        <Card style={{ padding: ms(16) }}>
                            <Text className="text-white/50 text-center" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(12) }}>No active investment</Text>
                        </Card>
                    )}
                </View>

                {/* Trade Calculator */}
                <View style={{ gap: vs(10) }}>
                    <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Trade Calculator</Text>
                    <Card style={{ padding: ms(16), gap: vs(12) }}>
                        <View className="flex-row" style={{ gap: ms(10) }}>
                            {renderInput('Buy Price', buyPrice, setBuyPrice, '$')}
                            {renderInput('Sell Price', sellPrice, setSellPrice, '$')}
                        </View>
                        <View className="flex-row" style={{ gap: ms(10) }}>
                            {renderInput('Quantity', quantity, setQuantity)}
                            {renderInput('Sell Fee %', feePercent, setFeePercent)}
                        </View>
                    </Card>
                    <View className="flex-row" style={{ gap: vs(10) }}>
                        <Card className="flex-1" style={{ padding: ms(16) }}>
                            <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Net Profit</Text>
                            <Text className={tradeProfit >= 0 ? "text-accent-green" : "text-accent-red"} style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(18) }}>{formatCurrencyShort(tradeProfit)}</Text>
                            <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>ROI {tradeRoi.toFixed(2)}%</Text>
                        </Card>
                        <Card className="flex-1" style={{ padding: ms(16) }}>
                            <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Break Even</Text>
                            <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(18) }}>{breakEven > 0 ? formatCurrencyShort(breakEven) : '-'}</Text>
                            <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>Min Sell / Unit</Text>
                        </Card>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
