import { Card } from "@/src/components/ui/card";
import { GridPattern } from "@/src/components/ui/grid-pattern";
import { TitleBar } from "@/src/components/ui/title-bar";
import { AVAILABLE_FACTION_SHORTCUTS, AVAILABLE_HOME_SHORTCUTS, ShortcutItem } from "@/src/constants/shortcuts";
import { moderateScale as ms, verticalScale as vs } from '@/src/utils/responsive';
import { router } from "expo-router";
import { Landmark, Settings, Store } from "lucide-react-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLUMNS = 4;

const APP_SHORTCUTS: ShortcutItem[] = [
    { id: 'market', label: 'Market', icon: Store, isSvg: false, route: '/(tabs)/market' },
    { id: 'offshore-bank', label: 'Offshore', icon: Landmark, isSvg: false, route: '/(quick-actions)/bank/offshore-bank' },
    { id: 'settings', label: 'Settings', icon: Settings, isSvg: false, route: '/(tabs)/settings' },
];

const SECTIONS: { title: string; items: ShortcutItem[] }[] = [
    { title: 'Personal', items: AVAILABLE_HOME_SHORTCUTS },
    { title: 'Faction', items: AVAILABLE_FACTION_SHORTCUTS },
    { title: 'App', items: APP_SHORTCUTS },
];

// Split items into rows so every tile keeps the same width, like the Home quick actions
const toRows = (items: ShortcutItem[]): (ShortcutItem | null)[][] => {
    const rows: (ShortcutItem | null)[][] = [];
    for (let i = 0; i < items.length; i += COLUMNS) {
        const row: (ShortcutItem | null)[] = items.slice(i, i + COLUMNS);
        while (row.length < COLUMNS) row.push(null);
        rows.push(row);
    }
    return rows;
};

export default function Others() {
    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <TitleBar title="Others" />
            <ScrollView className="flex-1" contentContainerStyle={{ padding: ms(16), gap: vs(16) }}>
                {SECTIONS.map(section => (
                    <View key={section.title} style={{ gap: vs(10) }}>
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>{section.title}</Text>
                        {toRows(section.items).map((row, rowIndex) => (
                            <View key={rowIndex} className="flex-row" style={{ gap: ms(10) }}>
                                {row.map((item, index) => {
                                    if (!item) return <View key={`empty-${index}`} className="flex-1" />;
                                    const Icon = item.icon;
                                    return (
                                        <TouchableOpacity key={item.id} className="flex-1" activeOpacity={0.7} onPress={() => router.push(item.route)}>
                                            <Card className="items-center justify-center" style={{ padding: ms(10), gap: vs(4) }}>
                                                {item.isSvg ? (
                                                    <Icon width={ms(24)} height={ms(24)} />
                                                ) : (
                                                    <Icon size={ms(24)} color="rgba(255, 255, 255, 0.8)" />
                                                )}
                                                <Text className="uppercase font-sans-bold text-white/80" style={{ fontSize: ms(8) }}>{item.label}</Text>
                                            </Card>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}
