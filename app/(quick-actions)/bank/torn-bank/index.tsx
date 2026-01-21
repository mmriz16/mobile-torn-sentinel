import Logo from "@/assets/logo.svg";
import { Card } from "@/src/components/ui/card";
import { GridPattern } from "@/src/components/ui/grid-pattern";
import { ProgressBar } from "@/src/components/ui/progress-bar";
import { TitleBar } from "@/src/components/ui/title-bar";
import { fetchBankRates, fetchCityBankDetails, fetchUserDataWithNetworth, formatCurrency, TornBankRates, TornCityBankDetails, TornNetworth, TornUserData } from "@/src/services/torn-api";
import { moderateScale as ms, verticalScale as vs } from "@/src/utils/responsive";
import { Bell } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ImageBackground, PanResponder, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AmountMode = 'wallet' | 'cap';

const TENORS = [
    { label: '1 Week', key: '1w' as const, days: 7 },
    { label: '2 Weeks', key: '2w' as const, days: 14 },
    { label: '1 Month', key: '1m' as const, days: 30 },
    { label: '2 Months', key: '2m' as const, days: 60 },
    { label: '3 Months', key: '3m' as const, days: 90 },
];

export default function TornBank() {
    const [amountMode, setAmountMode] = useState<AmountMode>('wallet');
    const [tenorStep, setTenorStep] = useState(0);
    const [userData, setUserData] = useState<TornUserData | null>(null);
    const [networth, setNetworth] = useState<TornNetworth | null>(null);
    const [cityBankDetails, setCityBankDetails] = useState<TornCityBankDetails | null>(null);
    const [bankRates, setBankRates] = useState<TornBankRates | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [countdown, setCountdown] = useState<number>(0);
    const [investAmount, setInvestAmount] = useState<string>('');
    const trackWidth = useRef(0);
    const isInitialLoad = useRef(true);

    // Load user data
    const loadData = async () => {
        if (isInitialLoad.current) {
            setIsLoading(true);
        }
        const [{ userData: userDataResult, networth: networthData }, cityBank, rates] = await Promise.all([
            fetchUserDataWithNetworth(),
            fetchCityBankDetails(),
            fetchBankRates()
        ]);
        setUserData(userDataResult);
        setNetworth(networthData);
        setCityBankDetails(cityBank);
        setBankRates(rates);
        if (cityBank?.time_left) {
            setCountdown(cityBank.time_left);
        }
        setIsLoading(false);
        isInitialLoad.current = false;
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Countdown timer effect
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setInterval(() => {
            setCountdown(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [countdown]);

    // Format countdown as DD:HH:MM:SS
    const formatCountdown = (seconds: number): string => {
        if (seconds <= 0) return "00:00:00:00";
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // Get tenor duration in seconds based on time_left
    const getTenorDuration = (timeLeft: number): number => {
        const days = Math.ceil(timeLeft / 86400);
        if (days <= 7) return 7 * 86400;     // 1 week
        if (days <= 14) return 14 * 86400;   // 2 weeks
        if (days <= 30) return 30 * 86400;   // 1 month
        if (days <= 60) return 60 * 86400;   // 2 months
        return 90 * 86400;                    // 3 months
    };

    // Calculate progress (0-1) based on elapsed time
    const getInvestmentProgress = (): number => {
        const timeLeft = countdown;
        if (timeLeft <= 0) return 0;
        const totalDuration = getTenorDuration(cityBankDetails?.time_left || timeLeft);
        const elapsed = totalDuration - timeLeft;
        return Math.min(1, Math.max(0, elapsed / totalDuration));
    };

    // Parse invest amount (remove commas and convert to number)
    const parseInvestAmount = (): number => {
        const cleaned = investAmount.replace(/,/g, '');
        return Number(cleaned) || 0;
    };

    // Get current APR rate for selected tenor
    const getCurrentRate = (): number => {
        if (!bankRates) return 0;
        const tenorKey = TENORS[tenorStep].key;
        return bankRates[tenorKey] || 0;
    };

    // Calculate projected return based on invest amount and selected tenor rate
    // Formula: Interest = Principal × APR × (days/365)
    const getProjectedReturn = (): number => {
        const principal = parseInvestAmount();
        const apr = getCurrentRate() / 100; // Convert percentage to decimal
        const days = TENORS[tenorStep].days;
        return principal * apr * (days / 365);
    };

    // Calculate total maturity (principal + projected return)
    const getTotalMaturity = (): number => {
        return parseInvestAmount() + getProjectedReturn();
    };

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

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const x = evt.nativeEvent.locationX;
                const stepWidth = trackWidth.current / TENORS.length;
                const newStep = Math.min(TENORS.length - 1, Math.max(0, Math.floor(x / stepWidth)));
                setTenorStep(newStep);
            },
            onPanResponderMove: (evt) => {
                const x = evt.nativeEvent.locationX;
                const stepWidth = trackWidth.current / TENORS.length;
                const newStep = Math.min(TENORS.length - 1, Math.max(0, Math.floor(x / stepWidth)));
                setTenorStep(newStep);
            },
        })
    ).current;

    // Get bank balance (city_bank from money or bank from networth)
    const moneyData = userData?.money;
    const networthData = networth?.personalstats?.networth;
    const tornBank = Number(moneyData?.city_bank) || Number(networthData?.bank) || 0;

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
            <TitleBar title="Torn Bank" />
            <View className="flex-1" style={{ padding: ms(16), gap: vs(16) }}>

                {/* Bank Card */}
                <ImageBackground
                    source={require('@/assets/images/card.png')}
                    resizeMode="cover"
                    className="bg-tactical-900 border border-tactical-800 rounded-lg overflow-hidden"
                    style={{ padding: ms(16), gap: vs(24) }}
                    imageStyle={{ borderRadius: 8 }}
                >
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
                    <Text className="text-accent-yellow text-start" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(34) }}>{formatCurrency(tornBank)}</Text>
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
                </ImageBackground>

                {/* Active Investsments */}
                <View style={{ gap: vs(10) }}>
                    <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Investments</Text>

                    {/* Tenor Card */}
                    {cityBankDetails && cityBankDetails.amount > 0 ? (
                        <Card style={{ padding: ms(16), gap: vs(16) }}>
                            <View className="flex-row justify-between items-center">
                                <View className="flex-col items-start">
                                    <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Principal</Text>
                                    <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(24) }}>{formatCurrency(cityBankDetails.amount)}</Text>
                                </View>
                                <View className="flex-col items-end">
                                    <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Maturity In</Text>
                                    <Text className="text-accent-green" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(18) }}>{formatCountdown(countdown)}</Text>
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <ProgressBar
                                    value={getInvestmentProgress()}
                                    height={ms(6)}
                                    className="rounded-full"
                                    trackClassName="bg-tactical-950"
                                    fillClassName="bg-accent-green rounded-full"
                                />
                            </View>
                            <View className="flex-row justify-between items-center">
                                <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Notifications</Text>
                                <Bell className="text-accent-yellow" />
                            </View>
                        </Card>
                    ) : (
                        <Card style={{ padding: ms(16) }}>
                            <Text className="text-white/50 text-center" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(12) }}>No active investment</Text>
                        </Card>
                    )}

                    {/* Investment Rate */}
                    <Card style={{ padding: ms(16), gap: vs(16) }}>
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Interest Rate</Text>
                        <View style={{ gap: vs(6) }}>
                            <View className="flex-row justify-between">
                                <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Amount</Text>
                                <View className="flex-row items-end" style={{ gap: vs(6) }}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setAmountMode('wallet');
                                            const wallet = Number(userData?.money?.wallet) || Number(networth?.personalstats?.networth?.wallet) || 0;
                                            setInvestAmount(wallet.toLocaleString('en-US'));
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                            className={amountMode === 'wallet' ? "text-tactical-950 bg-accent-yellow" : "text-white/50 bg-tactical-950 border border-tactical-800"}
                                            style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10), paddingHorizontal: ms(8), paddingVertical: vs(4), borderRadius: ms(4), overflow: 'hidden' }}
                                        >
                                            Current Wallet
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setAmountMode('cap');
                                            setInvestAmount('2,000,000,000');
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                            className={amountMode === 'cap' ? "text-tactical-950 bg-accent-yellow" : "text-white/50 bg-tactical-950 border border-tactical-800"}
                                            style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10), paddingHorizontal: ms(8), paddingVertical: vs(4), borderRadius: ms(4), overflow: 'hidden' }}
                                        >
                                            $2B Cap
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View className="flex-row items-center bg-tactical-950 border border-tactical-800 rounded-[2px] outline-none focus:border-tactical-700" style={{ gap: vs(6), padding: ms(16) }}>
                                <Text className="text-white uppercase" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(14) }}>$</Text>
                                <TextInput
                                    value={investAmount}
                                    onChangeText={setInvestAmount}
                                    placeholder="2,000,000,000"
                                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                    className="text-white flex-1"
                                    style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(14) }}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                        {/* Step Slider */}
                        <View style={{ gap: vs(16) }}>
                            {/* Slider Track */}
                            <View
                                style={{ position: 'relative' }}
                                onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
                                {...panResponder.panHandlers}
                            >
                                {/* Background Track */}
                                <View
                                    className="bg-tactical-950 border border-tactical-800 rounded-[10px]"
                                    style={{ height: ms(8) }}
                                />
                                {/* Active Track with dot */}
                                <View
                                    className="bg-accent-green rounded-[10px] absolute flex-row justify-end items-center"
                                    style={{
                                        height: ms(8),
                                        left: 0,
                                        top: 0,
                                        width: `${((tenorStep + 0.5) / TENORS.length) * 100}%`,
                                        paddingHorizontal: ms(1),
                                    }}
                                    pointerEvents="none"
                                >
                                    <View className="bg-white rounded-full" style={{ width: ms(6), height: ms(6) }} />
                                </View>
                            </View>

                            {/* Step Labels */}
                            <View className="flex-row">
                                {TENORS.map((tenor, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => setTenorStep(index)}
                                        activeOpacity={0.7}
                                        className="flex-1 items-center"
                                        style={{ gap: vs(2) }}
                                    >
                                        <Text
                                            className={index === tenorStep ? "text-white uppercase" : "text-white/50 uppercase"}
                                            style={{ fontFamily: 'Inter_600SemiBold', fontSize: ms(12) }}
                                        >
                                            {tenor.label}
                                        </Text>
                                        <Text
                                            className={index === tenorStep ? "text-accent-green" : "text-white/30"}
                                            style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}
                                        >
                                            +{bankRates ? bankRates[tenor.key]?.toFixed(2) : '0.00'}%
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </Card>

                    {/* Simulated Profit */}
                    <View className="flex-row" style={{ gap: vs(10) }}>
                        <Card className="flex-1" style={{ padding: ms(16) }}>
                            <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Projected Return</Text>
                            <Text className="text-white uppercase" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(18) }}>{formatCurrency(Math.floor(getProjectedReturn()))}</Text>
                        </Card>
                        <Card className="flex-1" style={{ padding: ms(16) }}>
                            <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Total Maturity</Text>
                            <Text className="text-white uppercase" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(18) }}>{formatCurrency(Math.floor(getTotalMaturity()))}</Text>
                        </Card>
                    </View>
                </View>

            </View>
        </SafeAreaView>
    );
}