import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../src/components/ui/card";
import { GridPattern } from "../../src/components/ui/grid-pattern";
import { ProgressBar } from "../../src/components/ui/progress-bar";
import {
    fetchDrugStats,
    fetchNetworth,
    fetchUserData,
    formatCurrency,
    formatNumber,
    formatTimeRemaining,
    getWeeklyXanaxUsage,
    TornNetworth,
    TornUserData
} from "../../src/services/torn-api";

import QaCompany from '../../assets/icons/qa-company.svg';
import QaNetworth from '../../assets/icons/qa-networth.svg';
import QaOthers from '../../assets/icons/qa-others.svg';
import QaProperty from '../../assets/icons/qa-property.svg';
import QaStats from '../../assets/icons/qa-stats.svg';

export default function Home() {
    const [userData, setUserData] = useState<TornUserData | null>(null);
    const [networth, setNetworth] = useState<TornNetworth | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [cooldownTimers, setCooldownTimers] = useState({ drug: 0, booster: 0, medical: 0, jail: 0 });
    const [barTimers, setBarTimers] = useState({
        energy: 0,
        nerve: 0,
        happy: 0,
        life: 0,
        chain: 0
    });
    const [weeklyXanax, setWeeklyXanax] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    // Update cooldown timers and bar timers every second
    useEffect(() => {
        if (!userData) return;

        // Calculate jail cooldown from profile status if in jail
        let jailTime = 0;
        if (userData.profile?.status?.state === "Jail" && userData.profile?.status?.until) {
            jailTime = Math.max(0, userData.profile.status.until - Math.floor(Date.now() / 1000));
        }

        setCooldownTimers({
            drug: userData.cooldowns.drug,
            booster: userData.cooldowns.booster,
            medical: userData.cooldowns.medical,
            jail: jailTime,
        });

        setBarTimers({
            energy: userData.bars?.energy?.full_time ?? 0,
            nerve: userData.bars?.nerve?.full_time ?? 0,
            happy: userData.bars?.happy?.full_time ?? 0,
            life: userData.bars?.life?.full_time ?? 0,
            chain: userData.bars?.chain?.timeout ?? 0,
        });

        const interval = setInterval(() => {
            setCooldownTimers(prev => ({
                drug: Math.max(0, prev.drug - 1),
                booster: Math.max(0, prev.booster - 1),
                medical: Math.max(0, prev.medical - 1),
                jail: Math.max(0, prev.jail - 1),
            }));
            setBarTimers(prev => ({
                energy: Math.max(0, prev.energy - 1),
                nerve: Math.max(0, prev.nerve - 1),
                happy: Math.max(0, prev.happy - 1),
                life: Math.max(0, prev.life - 1),
                chain: Math.max(0, prev.chain - 1),
            }));
        }, 1000);

        return () => clearInterval(interval);
    }, [userData]);

    const loadData = async () => {
        setIsLoading(true);
        const data = await fetchUserData();
        setUserData(data);

        if (data?.profile?.id) {
            const nw = await fetchNetworth(data.profile.id);
            setNetworth(nw);

            // Fetch drug stats and calculate weekly xanax
            const drugStats = await fetchDrugStats(data.profile.id);
            if (drugStats?.personalstats?.drugs?.xanax !== undefined) {
                const weekly = getWeeklyXanaxUsage(drugStats.personalstats.drugs.xanax, data.profile.id);
                setWeeklyXanax(weekly);
            }
        }
        setIsLoading(false);
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-tactical-950 items-center justify-center">
                <ActivityIndicator color="#F59E0B" size="large" />
                <Text className="text-white/50 mt-4 font-mono uppercase text-xs">Loading...</Text>
            </SafeAreaView>
        );
    }

    const profile = userData?.profile;
    const bars = userData?.bars;
    const travel = userData?.travel;
    const education = userData?.education?.current;
    const totalNetworth = networth?.personalstats?.networth?.total ?? 0;
    const walletAmount = networth?.personalstats?.networth?.wallet ?? 0;

    // Calculate education time remaining
    const educationTimeLeft = education ? Math.max(0, education.until - Math.floor(Date.now() / 1000)) : 0;
    const educationDays = Math.floor(educationTimeLeft / 86400);
    const educationHours = Math.floor((educationTimeLeft % 86400) / 3600);
    const educationMins = Math.floor((educationTimeLeft % 3600) / 60);
    const educationSecs = educationTimeLeft % 60;
    const educationTimeString = `${educationDays.toString().padStart(2, '0')}:${educationHours.toString().padStart(2, '0')}:${educationMins.toString().padStart(2, '0')}:${educationSecs.toString().padStart(2, '0')}`;

    // Travel progress
    const travelProgress = travel
        ? 1 - (travel.time_left / (travel.arrival_at - travel.departed_at))
        : 0;

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }}>
                {/* Header */}
                <View className="flex-row justify-between items-center">
                    <View>
                        <Text className="text-white font-sans font-bold text-lg">
                            Welcome back, <Text className="text-accent-yellow">{profile?.name ?? "Agent"}</Text>
                        </Text>
                        <Text className="text-white/50 text-[10px] font-mono uppercase">
                            id : {profile?.id ?? "---"} - Level {profile?.level ?? "--"}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <View>
                            <Text className="uppercase rounded-[4px] p-[6px] text-accent-green font-mono text-[10px] bg-tactical-900 border border-tactical-800">API Req: 5/min</Text>
                        </View>
                    </View>
                </View>

                {/* Top Sections */}
                <View className="gap-2.5">
                    {/* Travel Card */}
                    {travel && (
                        <Card className="pt-4">
                            <View className="flex-row px-4 items-start justify-between">
                                <View className="flex-1">
                                    <Text className="font-mono text-white/80 text-[10px]">
                                        {profile?.status?.state === "Traveling" ? "Traveling" : "Location"}
                                    </Text>
                                    <Text className="text-white font-bold text-lg">
                                        Torn City
                                    </Text>
                                </View>
                                <View className="flex-1 items-end">
                                    <Text className="font-mono text-white/80 text-[10px]">
                                        {formatTimeRemaining(travel.time_left)}
                                    </Text>
                                    <Text className="text-white font-bold text-lg">
                                        {travel.destination}
                                    </Text>
                                </View>
                            </View>
                            <View className="mt-3">
                                <ProgressBar
                                    value={travelProgress}
                                    height={4}
                                    trackClassName="bg-tactical-950"
                                    fillClassName="bg-accent-blue"
                                />
                            </View>
                        </Card>
                    )}

                    {/* KPI Section */}
                    <View className="flex-row gap-2.5">
                        {/* Daily Profit Card */}
                        <Card className="p-4 flex-1">
                            <View className="gap-0">
                                <Text className="uppercase font-sans text-xs font-extrabold text-accent-yellow">daily profit</Text>
                                <Text className="text-lg font-extrabold font-mono text-white">--</Text>
                            </View>
                            <View className="flex-row gap-1">
                                <Text className="text-[10px] uppercase font-mono text-white/50">no data</Text>
                            </View>
                        </Card>

                        {/* Networth Card */}
                        <Card className="p-4 flex-1">
                            <View className="gap-0">
                                <Text className="uppercase font-sans text-xs font-extrabold text-accent-yellow">networth</Text>
                                <Text className="text-lg font-extrabold font-mono text-white">{formatCurrency(totalNetworth)}</Text>
                            </View>
                            <Text className="text-[10px] uppercase font-mono text-white/50">Wallet {formatCurrency(walletAmount)}</Text>
                        </Card>
                    </View>
                </View>

                {/* Bottom Section */}
                <View className="gap-2.5">
                    {/* Quick Actions */}
                    <View className="flex-row justify-between items-center">
                        <Text className="uppercase font-sans text-sm font-extrabold text-white/50">quick actions</Text>
                        <Text className="text-[10px] uppercase font-mono text-white/50">edit</Text>
                    </View>
                    <View className="flex-row gap-2.5">
                        <Card className="items-center justify-center p-2.5 flex-1 gap-1 aspect-square">
                            <QaProperty width={24} height={24} />
                            <Text className="text-[8px] font-bold uppercase font-sans text-white/80">property</Text>
                        </Card>
                        <Card className="items-center justify-center p-2.5 flex-1 gap-1 aspect-square">
                            <QaCompany width={24} height={24} />
                            <Text className="text-[8px] font-bold uppercase font-sans text-white/80">company</Text>
                        </Card>
                        <Card className="items-center justify-center p-2.5 flex-1 gap-1 aspect-square">
                            <QaStats width={24} height={24} />
                            <Text className="text-[8px] font-bold uppercase font-sans text-white/80">stats</Text>
                        </Card>
                        <Card className="items-center justify-center p-2.5 flex-1 gap-1 aspect-square">
                            <QaNetworth width={24} height={24} />
                            <Text className="text-[8px] font-bold uppercase font-sans text-white/80">networth</Text>
                        </Card>
                        <Card className="items-center justify-center p-2.5 flex-1 gap-1 aspect-square">
                            <QaOthers width={24} height={24} />
                            <Text className="text-[8px] font-bold uppercase font-sans text-white/80">others</Text>
                        </Card>
                    </View>

                    {/* Status Overview */}
                    <Card>
                        <Text className="uppercase font-sans text-sm font-extrabold text-tactical-700 p-4 border-b border-tactical-800">status overview</Text>
                        <View className="gap-2.5 p-4">
                            {/* ROW 1 */}
                            <View className="flex-row gap-2.5">
                                {/* Energy */}
                                <View className="flex-1 bg-tactical-950 border border-tactical-800 pt-2.5 rounded-sm">
                                    <View className="px-2.5">
                                        <Text className="text-accent-green uppercase font-extrabold text-[10px]">Energy</Text>
                                        <View className="flex-row items-end gap-1">
                                            <Text className="text-white font-extrabold text-lg font-mono">{bars?.energy?.current ?? 0}</Text>
                                            <Text className="text-white/50 text-[10px] pb-1 font-mono">
                                                {barTimers.energy > 0
                                                    ? formatTimeRemaining(barTimers.energy)
                                                    : `/${bars?.energy?.maximum ?? 0}`}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="mt-2.5">
                                        <ProgressBar
                                            value={(bars?.energy?.current ?? 0) / (bars?.energy?.maximum || 1)}
                                            height={4}
                                            trackClassName="bg-tactical-950"
                                            fillClassName="bg-accent-green"
                                        />
                                    </View>
                                </View>
                                {/* Nerve */}
                                <View className="flex-1 bg-tactical-950 border border-tactical-800 pt-2.5 rounded-sm">
                                    <View className="px-2.5">
                                        <Text className="text-accent-red uppercase font-extrabold text-[10px]">Nerve</Text>
                                        <View className="flex-row items-end gap-1">
                                            <Text className="text-white font-extrabold text-lg font-mono">{bars?.nerve?.current ?? 0}</Text>
                                            <Text className="text-white/50 text-[10px] pb-1 font-mono">
                                                {barTimers.nerve > 0
                                                    ? formatTimeRemaining(barTimers.nerve)
                                                    : `/${bars?.nerve?.maximum ?? 0}`}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="mt-2.5">
                                        <ProgressBar
                                            value={(bars?.nerve?.current ?? 0) / (bars?.nerve?.maximum || 1)}
                                            height={4}
                                            trackClassName="bg-tactical-950"
                                            fillClassName="bg-accent-red"
                                        />
                                    </View>
                                </View>
                                {/* Happy */}
                                <View className="flex-1 bg-tactical-950 border border-tactical-800 pt-2.5 rounded-sm">
                                    <View className="px-2.5">
                                        <Text className="text-accent-yellow uppercase font-extrabold text-[10px]">Happy</Text>
                                        <View className="flex-row items-end gap-1">
                                            <Text className="text-white font-extrabold text-lg font-mono">{formatNumber(bars?.happy?.current ?? 0)}</Text>
                                            <Text className="text-white/50 text-[10px] pb-1 font-mono">
                                                {barTimers.happy > 0
                                                    ? formatTimeRemaining(barTimers.happy)
                                                    : `/${formatNumber(bars?.happy?.maximum ?? 0)}`}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="mt-2.5">
                                        <ProgressBar
                                            value={(bars?.happy?.current ?? 0) / (bars?.happy?.maximum || 1)}
                                            height={4}
                                            trackClassName="bg-tactical-950"
                                            fillClassName="bg-accent-yellow"
                                        />
                                    </View>
                                </View>
                            </View>
                            {/* ROW 2 */}
                            <View className="flex-row gap-2.5">
                                {/* Life */}
                                <View className="flex-1 bg-tactical-950 border border-tactical-800 pt-2.5 rounded-sm">
                                    <View className="px-2.5">
                                        <Text className="text-accent-blue uppercase font-extrabold text-[10px]">Life</Text>
                                        <View className="flex-row items-end gap-1">
                                            <Text className="text-white font-extrabold text-lg font-mono">{formatNumber(bars?.life?.current ?? 0)}</Text>
                                            <Text className="text-white/50 text-[10px] pb-1 font-mono">
                                                {barTimers.life > 0
                                                    ? formatTimeRemaining(barTimers.life)
                                                    : `/${formatNumber(bars?.life?.maximum ?? 0)}`}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="mt-2.5">
                                        <ProgressBar
                                            value={(bars?.life?.current ?? 0) / (bars?.life?.maximum || 1)}
                                            height={4}
                                            trackClassName="bg-tactical-950"
                                            fillClassName="bg-accent-blue"
                                        />
                                    </View>
                                </View>
                                {/* Chain */}
                                <View className="flex-1 bg-tactical-950 border border-tactical-800 pt-2.5 rounded-sm">
                                    <View className="px-2.5">
                                        <View className="flex-row items-center justify-between">
                                            <Text className="text-accent-purple uppercase font-extrabold text-[10px]">Chain</Text>
                                            <Text className="text-white/50 text-[10px] font-mono">
                                                {barTimers.chain > 0
                                                    ? formatTimeRemaining(barTimers.chain)
                                                    : ""}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-end gap-1">
                                            <Text className="text-white font-extrabold text-lg font-mono">{bars?.chain?.current ?? 0}</Text>
                                            <Text className="text-white/50 text-[10px] pb-1 font-mono">/{bars?.chain?.max ?? 0}</Text>
                                        </View>
                                    </View>
                                    <View className="mt-2.5">
                                        <ProgressBar
                                            value={barTimers.chain > 0 ? 1 : 0}
                                            height={4}
                                            trackClassName="bg-tactical-950"
                                            fillClassName={(bars?.chain?.current ?? 0) > 0 ? "bg-accent-purple" : "bg-tactical-800"}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>
                    </Card>

                    {/* Cooldown Status */}
                    <Card>
                        <View className="flex-row items-center justify-between p-4 border-b border-tactical-800">
                            <Text className="uppercase font-sans text-sm font-extrabold text-tactical-700">Cooldown Status</Text>
                            <Text className="uppercase p-[6px] bg-tactical-950 border border-tactical-800 rounded-[2px] font-mono text-[10px] text-tactical-700">mon-sun: <Text className="text-accent-blue">{weeklyXanax} xanax</Text></Text>
                        </View>
                        <View className="gap-2.5 p-4">
                            {/* ROW 1 */}
                            <View className="flex-row gap-2.5">
                                {/* Drugs */}
                                <View className="flex-1 bg-tactical-950 border border-tactical-800 pt-2.5 rounded-sm">
                                    <View className="px-2.5">
                                        <Text className="text-white/50 uppercase font-extrabold text-[10px]">drugs</Text>
                                        <Text className={`text-[10px] font-mono uppercase ${cooldownTimers.drug === 0 ? 'text-accent-green' : 'text-white'}`}>
                                            {formatTimeRemaining(cooldownTimers.drug)}
                                        </Text>
                                    </View>
                                    <View className="mt-2.5">
                                        <ProgressBar
                                            value={cooldownTimers.drug === 0 ? 1 : 0.3}
                                            height={4}
                                            trackClassName="bg-tactical-950"
                                            fillClassName={cooldownTimers.drug === 0 ? "bg-accent-green" : "bg-accent-red"}
                                        />
                                    </View>
                                </View>
                                {/* Booster */}
                                <View className="flex-1 bg-tactical-950 border border-tactical-800 pt-2.5 rounded-sm">
                                    <View className="px-2.5">
                                        <Text className="text-white/50 uppercase font-extrabold text-[10px]">booster</Text>
                                        <Text className={`text-[10px] font-mono uppercase ${cooldownTimers.booster === 0 ? 'text-accent-green' : 'text-white'}`}>
                                            {formatTimeRemaining(cooldownTimers.booster)}
                                        </Text>
                                    </View>
                                    <View className="mt-2.5">
                                        <ProgressBar
                                            value={cooldownTimers.booster === 0 ? 1 : 0.3}
                                            height={4}
                                            trackClassName="bg-tactical-950"
                                            fillClassName={cooldownTimers.booster === 0 ? "bg-accent-green" : "bg-accent-red"}
                                        />
                                    </View>
                                </View>
                                {/* Medical */}
                                <View className="flex-1 bg-tactical-950 border border-tactical-800 pt-2.5 rounded-sm">
                                    <View className="px-2.5">
                                        <Text className="text-white/50 uppercase font-extrabold text-[10px]">medical</Text>
                                        <Text className={`text-[10px] font-mono uppercase ${cooldownTimers.medical === 0 ? 'text-accent-green' : 'text-white'}`}>
                                            {formatTimeRemaining(cooldownTimers.medical)}
                                        </Text>
                                    </View>
                                    <View className="mt-2.5">
                                        <ProgressBar
                                            value={cooldownTimers.medical === 0 ? 1 : 0.3}
                                            height={4}
                                            trackClassName="bg-tactical-950"
                                            fillClassName={cooldownTimers.medical === 0 ? "bg-accent-green" : "bg-accent-red"}
                                        />
                                    </View>
                                </View>
                                {/* Jail */}
                                <View className="flex-1 bg-tactical-950 border border-tactical-800 pt-2.5 rounded-sm">
                                    <View className="px-2.5">
                                        <Text className="text-white/50 uppercase font-extrabold text-[10px]">jail</Text>
                                        <Text className={`text-[10px] font-mono uppercase ${cooldownTimers.medical === 0 ? 'text-accent-green' : 'text-white'}`}>
                                            {formatTimeRemaining(cooldownTimers.medical)}
                                        </Text>
                                    </View>
                                    <View className="mt-2.5">
                                        <ProgressBar
                                            value={cooldownTimers.medical === 0 ? 1 : 0.3}
                                            height={4}
                                            trackClassName="bg-tactical-950"
                                            fillClassName={cooldownTimers.medical === 0 ? "bg-accent-green" : "bg-accent-red"}
                                        />
                                    </View>
                                </View>
                            </View>
                            {/* Education ROW */}
                            {education && (
                                <View className="flex-row bg-tactical-950 gap-2 border items-center border-tactical-800 p-2.5 rounded-sm">
                                    <View className="bg-tactical-950 border border-tactical-800 p-2.5 rounded-sm w-[38px] h-[38px]"></View>
                                    <View className="flex-1 gap-1">
                                        <Text className="text-white/50 font-mono uppercase font-extrabold text-[10px]">education</Text>
                                        <Text className="text-white font-sans font-extrabold text-xs" numberOfLines={1}>
                                            Course #{education.id}
                                        </Text>
                                    </View>
                                    <View className="items-end gap-1">
                                        <Text className="text-white/50 font-extrabold text-[10px] font-sans uppercase">ETA</Text>
                                        <Text className="text-accent-yellow text-xs font-mono uppercase">{educationTimeString}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </Card>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
