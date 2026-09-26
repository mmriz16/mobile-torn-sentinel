import { Card } from "@/src/components/ui/card";
import { GridPattern } from "@/src/components/ui/grid-pattern";
import { PhysicalCard } from "@/src/components/ui/physical-card";
import { ProgressBar } from "@/src/components/ui/progress-bar";
import { TitleBar } from "@/src/components/ui/title-bar";
import { fetchPerks, fetchUserData, formatCurrency, formatNumber, TornPerks, TornUserData } from "@/src/services/torn-api";
import { moderateScale as ms, verticalScale as vs } from '@/src/utils/responsive';
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Human-readable property status labels
const STATUS_LABELS: Record<string, string> = {
    none: 'Owned',
    in_use: 'In Use',
    for_sale: 'For Sale',
    rented: 'Rented',
    for_rent: 'For Rent',
};

// Turn API enum values like "hot_tub" into "Hot Tub"
const humanize = (value: string): string =>
    value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function Property() {
    const [userData, setUserData] = useState<TornUserData | null>(null);
    const [perks, setPerks] = useState<TornPerks | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const isInitialLoad = useRef(true);

    const loadData = async () => {
        if (isInitialLoad.current) {
            setIsLoading(true);
        }
        const [userDataResult, perksResult] = await Promise.all([
            fetchUserData(),
            fetchPerks(),
        ]);
        setUserData(userDataResult);
        setPerks(perksResult);
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

    const property = userData?.property;
    const propertyName = property?.property?.name || userData?.profile?.property?.name || 'No Property';
    const isRented = property?.status === 'rented';
    const rentalPeriod = property?.rental_period || 0;
    const rentalRemaining = property?.rental_period_remaining || 0;
    const upkeepTotal = (property?.upkeep?.property || 0) + (property?.upkeep?.staff || 0);
    const modifications = property?.modifications || [];
    const staff = (property?.staff || []).filter(s => s.amount > 0);
    const propertyPerks = perks?.property_perks || [];

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <TitleBar title="Property" />
            <ScrollView className="flex-1" contentContainerStyle={{ padding: ms(16), gap: vs(16) }}>

                {/* Property Card */}
                <PhysicalCard>
                    <View className="flex-row justify-between">
                        <View style={{ gap: vs(2) }}>
                            <Text className="text-white/50" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Property</Text>
                            <Text className="text-white uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(20) }}>{propertyName}</Text>
                        </View>
                        <Text
                            className={isRented ? "text-tactical-950 bg-accent-yellow" : "text-white/50 bg-tactical-950 border border-tactical-800"}
                            style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10), paddingHorizontal: ms(8), paddingVertical: vs(4), borderRadius: ms(4), overflow: 'hidden', alignSelf: 'flex-start' }}
                        >
                            {STATUS_LABELS[property?.status || ''] || 'Owned'}
                        </Text>
                    </View>
                    <Text className="text-accent-yellow text-start" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(34) }}>
                        {property?.market_price ? formatCurrency(property.market_price) : '-'}
                    </Text>
                    <View className="flex-row justify-between">
                        <View style={{ gap: vs(2) }}>
                            <Text className="text-white/50" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Owner</Text>
                            <Text className="text-white uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(20) }}>{property?.owner?.name ?? userData?.profile?.name ?? '-'}</Text>
                        </View>
                        <View className="items-start" style={{ gap: vs(2) }}>
                            <Text className="text-white/50" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Max Happy</Text>
                            <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(20) }}>{property?.happy ? formatNumber(property.happy) : '-'}</Text>
                        </View>
                    </View>
                </PhysicalCard>

                {/* Rental Period (only when rented) */}
                {isRented && (
                    <Card style={{ padding: ms(16), gap: vs(16) }}>
                        <View className="flex-row justify-between items-center">
                            <View className="flex-col items-start">
                                <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Cost / Day</Text>
                                <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(24) }}>{property?.cost_per_day ? formatCurrency(property.cost_per_day) : '-'}</Text>
                            </View>
                            <View className="flex-col items-end">
                                <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(10) }}>Lease Ends In</Text>
                                <Text className={rentalRemaining < 7 ? "text-accent-red" : "text-accent-green"} style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(18) }}>{rentalRemaining} Days</Text>
                            </View>
                        </View>
                        <ProgressBar
                            value={rentalPeriod > 0 ? (rentalPeriod - rentalRemaining) / rentalPeriod : 0}
                            height={ms(6)}
                            className="rounded-full"
                            trackClassName="bg-tactical-950"
                            fillClassName={`${rentalRemaining < 7 ? 'bg-accent-red' : 'bg-accent-green'} rounded-full`}
                        />
                    </Card>
                )}

                {/* Upkeep */}
                <View className="flex-row" style={{ gap: vs(10) }}>
                    <Card className="flex-1" style={{ padding: ms(16), gap: vs(2) }}>
                        <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Upkeep</Text>
                        <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(18) }}>{property?.upkeep ? formatCurrency(property.upkeep.property) : '-'}</Text>
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>Property / Day</Text>
                    </Card>
                    <Card className="flex-1" style={{ padding: ms(16), gap: vs(2) }}>
                        <Text className="text-accent-yellow uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Staff</Text>
                        <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(18) }}>{property?.upkeep ? formatCurrency(property.upkeep.staff) : '-'}</Text>
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>
                            {upkeepTotal > 0 ? `Total ${formatCurrency(upkeepTotal)}` : 'Staff / Day'}
                        </Text>
                    </Card>
                </View>

                {/* Modifications & Staff */}
                <Card>
                    <View className="flex-row justify-between items-center border-b border-tactical-800" style={{ padding: ms(16) }}>
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Modifications</Text>
                        <Text className="font-mono bg-tactical-950 border border-tactical-800 text-accent-green" style={{ fontSize: ms(10), padding: ms(6) }}>{modifications.length}</Text>
                    </View>
                    <View className="bg-tactical-950" style={{ padding: ms(16), gap: vs(10) }}>
                        {modifications.length > 0 ? modifications.map(mod => (
                            <Text key={mod} className="text-white/70 font-sans" style={{ fontSize: ms(12) }}>{humanize(mod)}</Text>
                        )) : (
                            <Text className="text-white/50 text-center" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(12) }}>No modifications</Text>
                        )}
                    </View>
                </Card>

                {staff.length > 0 && (
                    <Card>
                        <View className="flex-row justify-between items-center border-b border-tactical-800" style={{ padding: ms(16) }}>
                            <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12) }}>Staff</Text>
                        </View>
                        <View className="bg-tactical-950" style={{ padding: ms(16), gap: vs(10) }}>
                            {staff.map(s => (
                                <View key={s.type} className="flex-row justify-between items-center">
                                    <Text className="text-white/70 font-sans" style={{ fontSize: ms(12) }}>{humanize(s.type)}</Text>
                                    <Text className="text-white font-mono" style={{ fontSize: ms(12) }}>×{s.amount}</Text>
                                </View>
                            ))}
                        </View>
                    </Card>
                )}

                {/* Property Perks */}
                <View style={{ gap: vs(10) }}>
                    <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Property Perks</Text>
                    <Card>
                        <View className="bg-tactical-950" style={{ padding: ms(16), gap: vs(10) }}>
                            {propertyPerks.length > 0 ? propertyPerks.map((perk, index) => (
                                <Text key={index} className="text-white/70 font-sans" style={{ fontSize: ms(12) }}>{perk}</Text>
                            )) : (
                                <Text className="text-white/50 text-center" style={{ fontFamily: 'Inter_500Medium', fontSize: ms(12) }}>No property perks</Text>
                            )}
                        </View>
                    </Card>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
