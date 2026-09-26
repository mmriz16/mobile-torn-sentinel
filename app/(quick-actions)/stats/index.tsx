import { Card } from "@/src/components/ui/card";
import { GridPattern } from "@/src/components/ui/grid-pattern";
import { ProgressBar } from "@/src/components/ui/progress-bar";
import { TitleBar } from "@/src/components/ui/title-bar";
import { fetchBattleStats, fetchDrugStats, fetchUserData, formatNumber, TornBattleStats, TornDrugStats, TornUserData } from "@/src/services/torn-api";
import { moderateScale as ms, verticalScale as vs } from '@/src/utils/responsive';
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BATTLE_STATS = [
    { key: 'strength' as const, label: 'Strength', color: 'bg-accent-red', text: 'text-accent-red' },
    { key: 'defense' as const, label: 'Defense', color: 'bg-accent-blue', text: 'text-accent-blue' },
    { key: 'speed' as const, label: 'Speed', color: 'bg-accent-green', text: 'text-accent-green' },
    { key: 'dexterity' as const, label: 'Dexterity', color: 'bg-accent-yellow', text: 'text-accent-yellow' },
];

const DRUG_LABELS: Record<string, string> = {
    xanax: 'Xanax',
    ecstasy: 'Ecstasy',
    ketamine: 'Ketamine',
    lsd: 'LSD',
    opium: 'Opium',
    pcp: 'PCP',
    shrooms: 'Shrooms',
    speed: 'Speed',
    vicodin: 'Vicodin',
    cannabis: 'Cannabis',
};

export default function Stats() {
    const [userData, setUserData] = useState<TornUserData | null>(null);
    const [battleStats, setBattleStats] = useState<TornBattleStats | null>(null);
    const [drugStats, setDrugStats] = useState<TornDrugStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const isInitialLoad = useRef(true);

    const loadData = async () => {
        if (isInitialLoad.current) {
            setIsLoading(true);
        }
        const [userDataResult, battleStatsResult] = await Promise.all([
            fetchUserData(),
            fetchBattleStats(),
        ]);
        setUserData(userDataResult);
        setBattleStats(battleStatsResult);

        if (userDataResult?.profile?.id) {
            setDrugStats(await fetchDrugStats(userDataResult.profile.id));
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

    const profile = userData?.profile;
    const total = battleStats?.total || 0;
    const drugs = drugStats?.personalstats?.drugs;
    const drugEntries = drugs
        ? Object.entries(DRUG_LABELS)
            .map(([key, label]) => ({ key, label, value: Number(drugs[key as keyof typeof drugs]) || 0 }))
            .filter(d => d.value > 0)
            .sort((a, b) => b.value - a.value)
        : [];

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <TitleBar title="Stats" />
            <ScrollView className="flex-1" contentContainerStyle={{ padding: ms(16), gap: vs(16) }}>

                {/* Profile Summary */}
                <View className="flex-row" style={{ gap: vs(10) }}>
                    <Card className="flex-1" style={{ padding: ms(16), gap: vs(2) }}>
                        <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Level</Text>
                        <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(24) }}>{profile?.level ?? '-'}</Text>
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }} numberOfLines={1}>{profile?.rank ?? '-'}</Text>
                    </Card>
                    <Card className="flex-1" style={{ padding: ms(16), gap: vs(2) }}>
                        <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Age</Text>
                        <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(24) }}>{profile?.age ? formatNumber(profile.age) : '-'}</Text>
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>Days in Torn</Text>
                    </Card>
                </View>

                {/* Battle Stats */}
                <View style={{ gap: vs(10) }}>
                    <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Battle Stats</Text>
                    <Card>
                        <View className="flex-row justify-between items-center border-b border-tactical-800" style={{ padding: ms(16) }}>
                            <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Total</Text>
                            <Text className="text-accent-yellow" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(20) }}>{battleStats ? formatNumber(total) : '-'}</Text>
                        </View>
                        <View className="bg-tactical-950" style={{ padding: ms(16), gap: vs(14) }}>
                            {BATTLE_STATS.map(stat => {
                                const value = battleStats?.[stat.key] || 0;
                                const share = total > 0 ? value / total : 0;
                                return (
                                    <View key={stat.key} style={{ gap: vs(6) }}>
                                        <View className="flex-row justify-between items-end">
                                            <Text className={`uppercase ${stat.text}`} style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>{stat.label}</Text>
                                            <View className="flex-row items-end" style={{ gap: ms(6) }}>
                                                <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(14) }}>{formatNumber(value)}</Text>
                                                <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>{(share * 100).toFixed(1)}%</Text>
                                            </View>
                                        </View>
                                        <ProgressBar
                                            value={share}
                                            height={ms(6)}
                                            className="rounded-full"
                                            trackClassName="bg-tactical-900"
                                            fillClassName={`${stat.color} rounded-full`}
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    </Card>
                </View>

                {/* Drug Usage */}
                <View style={{ gap: vs(10) }}>
                    <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Drug Usage</Text>
                    <View className="flex-row" style={{ gap: vs(10) }}>
                        <Card className="flex-1" style={{ padding: ms(16), gap: vs(2) }}>
                            <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Total Taken</Text>
                            <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(24) }}>{drugs ? formatNumber(drugs.total || 0) : '-'}</Text>
                        </Card>
                        <Card className="flex-1" style={{ padding: ms(16), gap: vs(2) }}>
                            <Text className="text-accent-red uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Overdoses</Text>
                            <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(24) }}>{drugs ? formatNumber(drugs.overdoses || 0) : '-'}</Text>
                        </Card>
                    </View>
                    {drugEntries.length > 0 ? (
                        <Card>
                            <View className="bg-tactical-950" style={{ padding: ms(16), gap: vs(10) }}>
                                {drugEntries.map(drug => (
                                    <View key={drug.key} className="flex-row justify-between items-center">
                                        <Text className="text-white/70 font-sans" style={{ fontSize: ms(12) }}>{drug.label}</Text>
                                        <Text className="text-white font-mono" style={{ fontSize: ms(12) }}>{formatNumber(drug.value)}</Text>
                                    </View>
                                ))}
                            </View>
                        </Card>
                    ) : (
                        <Card style={{ padding: ms(16) }}>
                            <Text className="text-white/50 text-center" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(12) }}>No drug usage recorded</Text>
                        </Card>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
