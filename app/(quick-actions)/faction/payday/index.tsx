import { Card } from "@/src/components/ui/card";
import { GridPattern } from "@/src/components/ui/grid-pattern";
import { TitleBar } from "@/src/components/ui/title-bar";
import { fetchRankedWarMembersFromDB, RankedWarMember } from "@/src/services/faction-service";
import { FactionBasicData, fetchFactionBasic, formatCurrency, formatNumber } from "@/src/services/torn-api";
import { moderateScale as ms, verticalScale as vs } from '@/src/utils/responsive';
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SplitMode = 'score' | 'attacks' | 'equal';

const SPLIT_MODES: { key: SplitMode; label: string }[] = [
    { key: 'score', label: 'By Score' },
    { key: 'attacks', label: 'By Hits' },
    { key: 'equal', label: 'Equal' },
];

const FACTION_CUTS = [0, 10, 20, 30];

// Format currency in short form (K, M, B)
const formatCurrencyShort = (num: number): string => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(0)}`;
};

export default function Payday() {
    const [faction, setFaction] = useState<FactionBasicData | null>(null);
    const [members, setMembers] = useState<RankedWarMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [payoutInput, setPayoutInput] = useState('');
    const [factionCut, setFactionCut] = useState(10);
    const [splitMode, setSplitMode] = useState<SplitMode>('score');

    useEffect(() => {
        const loadData = async () => {
            const factionData = await fetchFactionBasic();
            setFaction(factionData);
            if (factionData?.ID) {
                setMembers(await fetchRankedWarMembersFromDB(factionData.ID));
            }
            setIsLoading(false);
        };
        loadData();
    }, []);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-tactical-950 items-center justify-center">
                <ActivityIndicator color="#F59E0B" size="large" />
                <Text className="text-white/50 mt-4 font-mono uppercase text-xs">Loading...</Text>
            </SafeAreaView>
        );
    }

    // Parse payout amount (remove commas and convert to number)
    const totalPayout = Number(payoutInput.replace(/,/g, '')) || 0;
    const factionShare = Math.floor(totalPayout * (factionCut / 100));
    const memberPool = totalPayout - factionShare;

    // Weight per member depends on the split mode; members with zero weight get nothing
    const getWeight = (m: RankedWarMember): number => {
        if (splitMode === 'score') return Math.max(0, m.score || 0);
        if (splitMode === 'attacks') return Math.max(0, m.attacks || 0);
        return 1;
    };
    const totalWeight = members.reduce((sum, m) => sum + getWeight(m), 0);
    const payouts = members
        .map(m => {
            const weight = getWeight(m);
            const share = totalWeight > 0 ? weight / totalWeight : 0;
            return { member: m, share, amount: Math.floor(memberPool * share) };
        })
        .filter(p => p.share > 0)
        .sort((a, b) => b.amount - a.amount);

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <TitleBar title="Payday" />
            <ScrollView className="flex-1" contentContainerStyle={{ padding: ms(16), gap: vs(16) }} keyboardShouldPersistTaps="handled">

                {/* Payout Setup */}
                <Card style={{ padding: ms(16), gap: vs(16) }}>
                    <View className="flex-row justify-between items-center">
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>War Payout</Text>
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }} numberOfLines={1}>
                            {faction?.name ?? 'No Faction'}
                        </Text>
                    </View>
                    <View className="flex-row items-center bg-tactical-950 border border-tactical-800 rounded-[2px]" style={{ gap: vs(6), padding: ms(16) }}>
                        <Text className="text-white uppercase" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(14) }}>$</Text>
                        <TextInput
                            value={payoutInput}
                            onChangeText={setPayoutInput}
                            onBlur={() => totalPayout > 0 && setPayoutInput(totalPayout.toLocaleString('en-US'))}
                            placeholder="1,000,000,000"
                            placeholderTextColor="rgba(255, 255, 255, 0.5)"
                            className="text-white flex-1"
                            style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(14) }}
                            keyboardType="numeric"
                        />
                    </View>

                    {/* Faction Cut */}
                    <View style={{ gap: vs(6) }}>
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Faction Cut</Text>
                        <View className="flex-row" style={{ gap: vs(6) }}>
                            {FACTION_CUTS.map(cut => (
                                <TouchableOpacity key={cut} className="flex-1" onPress={() => setFactionCut(cut)} activeOpacity={0.7}>
                                    <Text
                                        className={`text-center ${factionCut === cut ? "text-tactical-950 bg-accent-yellow" : "text-white/50 bg-tactical-950 border border-tactical-800"}`}
                                        style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10), paddingVertical: vs(6), borderRadius: ms(4), overflow: 'hidden' }}
                                    >
                                        {cut}%
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Split Mode */}
                    <View style={{ gap: vs(6) }}>
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Split Members</Text>
                        <View className="flex-row" style={{ gap: vs(6) }}>
                            {SPLIT_MODES.map(mode => (
                                <TouchableOpacity key={mode.key} className="flex-1" onPress={() => setSplitMode(mode.key)} activeOpacity={0.7}>
                                    <Text
                                        className={`text-center ${splitMode === mode.key ? "text-tactical-950 bg-accent-yellow" : "text-white/50 bg-tactical-950 border border-tactical-800"}`}
                                        style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10), paddingVertical: vs(6), borderRadius: ms(4), overflow: 'hidden' }}
                                    >
                                        {mode.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Card>

                {/* Summary */}
                <View className="flex-row" style={{ gap: vs(10) }}>
                    <Card className="flex-1" style={{ padding: ms(16) }}>
                        <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Faction Share</Text>
                        <Text className="text-white uppercase" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(18) }}>{formatCurrencyShort(factionShare)}</Text>
                    </Card>
                    <Card className="flex-1" style={{ padding: ms(16) }}>
                        <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Member Pool</Text>
                        <Text className="text-white uppercase" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(18) }}>{formatCurrencyShort(memberPool)}</Text>
                    </Card>
                </View>

                {/* Member Payouts */}
                <View style={{ gap: vs(10) }}>
                    <View className="flex-row justify-between">
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Member Payouts</Text>
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>{payouts.length} Members</Text>
                    </View>
                    {payouts.length > 0 ? (
                        <View style={{ gap: vs(8) }}>
                            {payouts.map(({ member, share, amount }) => (
                                <Card key={member.user_id} className="flex-row justify-between" style={{ padding: ms(16) }}>
                                    <View className="flex-col flex-1">
                                        <Text className="text-white uppercase" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(14) }} numberOfLines={1}>{member.name}</Text>
                                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>
                                            {formatNumber(member.score || 0)} pts · {formatNumber(member.attacks || 0)} hits
                                        </Text>
                                    </View>
                                    <View className="flex-col items-end">
                                        <Text className="text-accent-green" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(14) }}>{formatCurrency(amount)}</Text>
                                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>{(share * 100).toFixed(2)}%</Text>
                                    </View>
                                </Card>
                            ))}
                        </View>
                    ) : (
                        <Card style={{ padding: ms(16) }}>
                            <Text className="text-white/50 text-center" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(12) }}>
                                {members.length === 0 ? 'No ranked war data for your faction' : 'No members with contributions'}
                            </Text>
                        </Card>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
