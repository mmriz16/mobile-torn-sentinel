import Logo from "@/assets/logo.svg";
import { Card } from "@/src/components/ui/card";
import { GridPattern } from "@/src/components/ui/grid-pattern";
import { PhysicalCard } from "@/src/components/ui/physical-card";
import { ProgressBar } from "@/src/components/ui/progress-bar";
import { TitleBar } from "@/src/components/ui/title-bar";
import { fetchUserDataWithNetworth, formatCurrency, TornNetworth, TornUserData, getCityBankAmount } from "@/src/services/torn-api";
import { moderateScale as ms, verticalScale as vs } from '@/src/utils/responsive';
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OffshoreBank() {
    const [userData, setUserData] = useState<TornUserData | null>(null);
    const [networth, setNetworth] = useState<TornNetworth | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const isInitialLoad = useRef(true);

    const loadData = async () => {
        if (isInitialLoad.current) {
            setIsLoading(true);
        }
        const { userData: userDataResult, networth: networthData } = await fetchUserDataWithNetworth();
        setUserData(userDataResult);
        setNetworth(networthData);
        setIsLoading(false);
        isInitialLoad.current = false;
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
        return `${daysStr.slice(0, 2)}/${daysStr.slice(-2)}`;
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-tactical-950 items-center justify-center">
                <ActivityIndicator color="#F59E0B" size="large" />
                <Text className="text-white/50 mt-4 font-mono uppercase text-xs">Loading...</Text>
            </SafeAreaView>
        );
    }

    const moneyData = userData?.money;
    const networthData = networth?.personalstats?.networth;

    // Real-time money values first, cached networth as fallback (same approach as Networth page)
    const offshoreBank = Number(moneyData?.cayman_bank) || Number(networthData?.overseas_bank) || 0;
    const liquid = [
        { key: 'cayman', label: 'Offshore Bank', value: offshoreBank, color: 'bg-accent-yellow' },
        { key: 'city', label: 'Torn Bank', value: getCityBankAmount(moneyData) || Number(networthData?.bank) || 0, color: 'bg-accent-green' },
        { key: 'vault', label: 'Vault', value: Number(moneyData?.vault) || Number(networthData?.vaults) || 0, color: 'bg-accent-blue' },
        { key: 'wallet', label: 'Wallet', value: Number(moneyData?.wallet) || Number(networthData?.wallet) || 0, color: 'bg-accent-red' },
    ];
    const liquidTotal = liquid.reduce((sum, l) => sum + l.value, 0);
    const networthTotal = Number(networthData?.total) || 0;
    const shareOfLiquid = liquidTotal > 0 ? offshoreBank / liquidTotal : 0;
    const shareOfNetworth = networthTotal > 0 ? offshoreBank / networthTotal : 0;

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <TitleBar title="Offshore Bank" />
            <ScrollView className="flex-1" contentContainerStyle={{ padding: ms(16), gap: vs(16) }}>

                {/* Bank Card */}
                <PhysicalCard>
                    <View className="flex-row justify-between">
                        <View style={{ gap: vs(2) }}>
                            <Text className="text-white/50" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Name</Text>
                            <Text className="text-white uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(20) }}>{userData?.profile?.name ?? "Loading..."}</Text>
                        </View>
                        <View className="flex-row items-center" style={{ gap: vs(2) }}>
                            <Logo width={ms(20)} height={ms(20)} />
                            <Text className="text-white camelCase font-sans" style={{ fontSize: ms(12) }}>Cayman Islands</Text>
                        </View>
                    </View>
                    <Text className="text-accent-yellow text-start" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(34) }}>{formatCurrency(offshoreBank)}</Text>
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
                </PhysicalCard>

                {/* Exposure */}
                <View className="flex-row" style={{ gap: vs(10) }}>
                    <Card className="flex-1" style={{ padding: ms(16), gap: vs(2) }}>
                        <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Of Liquid</Text>
                        <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(24) }}>{(shareOfLiquid * 100).toFixed(1)}%</Text>
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>Cash Held Offshore</Text>
                    </Card>
                    <Card className="flex-1" style={{ padding: ms(16), gap: vs(2) }}>
                        <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Of Networth</Text>
                        <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(24) }}>{(shareOfNetworth * 100).toFixed(1)}%</Text>
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>Total Networth</Text>
                    </Card>
                </View>

                {/* Liquid Distribution */}
                <View style={{ gap: vs(10) }}>
                    <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Liquid Distribution</Text>
                    <Card>
                        <View className="flex-row justify-between items-center border-b border-tactical-800" style={{ padding: ms(16) }}>
                            <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Total Liquid</Text>
                            <Text className="font-mono bg-tactical-950 border border-tactical-800 text-accent-green" style={{ fontSize: ms(10), padding: ms(6) }}>{formatCurrency(liquidTotal)}</Text>
                        </View>
                        <View className="bg-tactical-950" style={{ padding: ms(16), gap: vs(14) }}>
                            {liquid.map(item => {
                                const share = liquidTotal > 0 ? item.value / liquidTotal : 0;
                                return (
                                    <View key={item.key} style={{ gap: vs(6) }}>
                                        <View className="flex-row justify-between items-end">
                                            <Text className="text-white/70 font-sans" style={{ fontSize: ms(12) }}>{item.label}</Text>
                                            <View className="flex-row items-end" style={{ gap: ms(6) }}>
                                                <Text className="text-white font-mono" style={{ fontSize: ms(12) }}>{formatCurrency(item.value)}</Text>
                                                <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>{(share * 100).toFixed(1)}%</Text>
                                            </View>
                                        </View>
                                        <ProgressBar
                                            value={share}
                                            height={ms(6)}
                                            className="rounded-full"
                                            trackClassName="bg-tactical-900"
                                            fillClassName={`${item.color} rounded-full`}
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    </Card>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
