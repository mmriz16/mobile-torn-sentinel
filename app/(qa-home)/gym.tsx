import { Cookie, Smile, Zap } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../src/components/ui/card";
import { GridPattern } from "../../src/components/ui/grid-pattern";
import { TitleBar } from "../../src/components/ui/title-bar";
import { GYM_DATA, GYM_ID_TO_NAME, GYM_NAMES } from "../../src/constants/gym";
import { getJumpPresetItemIds, JUMP_PRESETS } from "../../src/constants/items";
import { fetchItemDetailsFromSupabase } from "../../src/services/item-service";
import { fetchActiveGym, fetchBattleStats, fetchGymModifier, fetchItemMarketPrices, fetchUserData, formatNumber, TornBattleStats, TornItem, TornUserData } from "../../src/services/torn-api";
import { gainPerTrain, simulateSession } from "../../src/utils/gym-calculator";
import { horizontalScale as hs, moderateScale as ms, verticalScale as vs } from '../../src/utils/responsive';

// Helper to parse number from formatted string (e.g. "14,948" -> 14948)
function parseFormattedNumber(str: string): number {
    return parseFloat(str.replace(/,/g, '')) || 0;
}

export default function Gym() {
    const [selectedGym, setSelectedGym] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activePreset, setActivePreset] = useState<'standard' | 'choco' | 'happy'>('standard');
    const [selectedStat, setSelectedStat] = useState<'strength' | 'defense' | 'speed' | 'dexterity' | null>(null);

    // Data from API
    const [battleStats, setBattleStats] = useState<TornBattleStats | null>(null);
    const [userData, setUserData] = useState<TornUserData | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [gymModifier, setGymModifier] = useState<number>(1); // Gym gains modifier from perks

    // Item data for jump presets
    const [itemPrices, setItemPrices] = useState<Record<number, number>>({});
    const [itemDetails, setItemDetails] = useState<Record<number, TornItem>>({});
    const [isLoadingPrices, setIsLoadingPrices] = useState(false);

    // Input states (auto-filled from API, but editable)
    const [currentStats, setCurrentStats] = useState("");
    const [happiness, setHappiness] = useState("");
    const [energy, setEnergy] = useState("");

    // Calculate gym gains based on inputs
    const gymCalculations = useMemo(() => {
        const S = parseFormattedNumber(currentStats); // Current stat
        const H = parseFloat(happiness) || 0; // Happiness
        const totalE = parseFloat(energy) || 0; // Total energy to spend

        // Get gym data
        const gymData = selectedGym ? GYM_DATA[selectedGym] : null;
        if (!gymData || S <= 0 || H <= 0 || totalE <= 0) {
            return { gainPerTrainValue: 0, totalGain: 0, energyPerTrain: 0 };
        }

        const E = gymData.energy; // Energy per train from gym
        // Use the highest gym dot (assume training the stat with highest gain)
        const G = Math.max(gymData.str, gymData.def, gymData.spd, gymData.dex);
        const M = gymModifier; // Use fetched modifier from perks

        // Calculate gain per single train
        const singleGain = gainPerTrain(S, H, E, G, M);

        // Simulate full session
        const session = simulateSession({
            S0: S,
            H0: H,
            totalEnergy: totalE,
            energyPerTrain: E,
            gymDots: G,
            modifier: M,
            mode: "avg"
        });

        return {
            gainPerTrainValue: singleGain,
            totalGain: session.totalGain,
            energyPerTrain: E
        };
    }, [currentStats, happiness, energy, selectedGym, gymModifier]);

    // Calculate preset info (cost and description)
    const presetInfo = useMemo(() => {
        const preset = JUMP_PRESETS[activePreset];

        if (preset.isFree) {
            const currentEnergy = userData?.bars.energy.current || 100;
            return {
                price: 0,
                priceText: 'Free',
                description: `${currentEnergy} Energy - Based on Current Energy`,
            };
        }

        // Get current energy stats
        const currentEnergy = userData?.bars.energy.current || 0;
        const maxEnergy = userData?.bars.energy.maximum || 100;

        // Constants
        const XANAX_ENERGY = 250;
        const MAX_STACK_ENERGY = 1000;
        const XANAX_ID = 206;

        // Calculate Xanax usage
        const xanaxUsed = Math.max(0, Math.floor((currentEnergy - maxEnergy) / XANAX_ENERGY));
        const xanaxCanAdd = Math.max(0, Math.floor((MAX_STACK_ENERGY - currentEnergy) / XANAX_ENERGY));

        // Calculate total cost with adjusted quantities
        let totalCost = 0;
        const itemBreakdown: string[] = [];

        // Item effect values (per-item) for calculation display
        const itemEffectValues: Record<number, { value: number; unit: string }> = {
            206: { value: 250, unit: 'E' },    // Xanax: 250E per pill
            36: { value: 35, unit: 'H' },      // Big Box of Chocolate Bars: 35H per item
            366: { value: 2500, unit: 'H' },   // Erotic DVD: 2500H per item
        };

        for (const item of preset.items) {
            let actualQuantity = item.quantity;

            // Adjust Xanax quantity based on what's already used
            if (item.itemId === XANAX_ID) {
                // For jump preset (originally 4 Xanax)
                const targetXanax = item.quantity; // Usually 4
                actualQuantity = Math.min(xanaxCanAdd, targetXanax - xanaxUsed);
                actualQuantity = Math.max(0, actualQuantity); // Don't go negative
            }

            // Skip items with 0 quantity
            if (actualQuantity <= 0) continue;

            const price = itemPrices[item.itemId] || 0;
            const itemDetail = itemDetails[item.itemId];
            const itemName = itemDetail?.name || `Item #${item.itemId}`;
            const effectData = itemEffectValues[item.itemId];

            totalCost += price * actualQuantity;

            // Format: "2 Xanax (+500E)" or "Ecstasy (Double Happy)"
            let itemText: string;
            if (effectData) {
                const total = effectData.value * actualQuantity;
                itemText = `${actualQuantity} ${itemName} (+${formatNumber(total)}${effectData.unit})`;
            } else if (item.itemId === 197) {
                // Ecstasy - special case
                itemText = `${itemName} (Double Happy)`;
            } else {
                itemText = `${actualQuantity} ${itemName}`;
            }

            itemBreakdown.push(itemText);
        }

        // Calculate total bonuses from preset
        let energyBonus = 0;
        let happinessBonus = 0;
        let hasEcstasy = false;

        for (const item of preset.items) {
            let actualQuantity = item.quantity;

            // Adjust Xanax quantity (same logic as above)
            if (item.itemId === XANAX_ID) {
                actualQuantity = Math.min(xanaxCanAdd, item.quantity - xanaxUsed);
                actualQuantity = Math.max(0, actualQuantity);
            }

            if (actualQuantity <= 0) continue;

            const effectData = itemEffectValues[item.itemId];
            if (effectData) {
                if (effectData.unit === 'E') {
                    energyBonus += effectData.value * actualQuantity;
                } else if (effectData.unit === 'H') {
                    happinessBonus += effectData.value * actualQuantity;
                }
            }

            // Check for Ecstasy
            if (item.itemId === 197) {
                hasEcstasy = true;
            }
        }

        return {
            price: totalCost,
            priceText: `$${formatNumber(totalCost)}`,
            description: itemBreakdown.join(' + '),
            energyBonus,
            happinessBonus,
            hasEcstasy,
        };
    }, [activePreset, itemPrices, itemDetails, userData]);

    // Fetch all data on mount
    useEffect(() => {
        async function loadData() {
            setIsLoadingStats(true);

            // Fetch battle stats, user data, active gym, and gym modifier in parallel
            const [stats, user, activeGymId, modifier] = await Promise.all([
                fetchBattleStats(),
                fetchUserData(),
                fetchActiveGym(),
                fetchGymModifier()
            ]);

            setBattleStats(stats);
            setUserData(user);
            setGymModifier(modifier);

            // Auto-fill values from API
            if (stats) {
                // Use the highest stat as default for current stats
                const highestStat = Math.max(stats.strength, stats.defense, stats.speed, stats.dexterity);
                setCurrentStats(formatNumber(highestStat));

                // Auto-select the stat with highest value
                if (stats.strength >= stats.defense && stats.strength >= stats.speed && stats.strength >= stats.dexterity) {
                    setSelectedStat('strength');
                } else if (stats.defense >= stats.speed && stats.defense >= stats.dexterity) {
                    setSelectedStat('defense');
                } else if (stats.speed >= stats.dexterity) {
                    setSelectedStat('speed');
                } else {
                    setSelectedStat('dexterity');
                }
            }
            if (user) {
                setHappiness(String(user.bars.happy.current));
                setEnergy(String(user.bars.energy.current));
            }

            // Auto-fill active gym from API
            if (activeGymId) {
                const gymName = GYM_ID_TO_NAME[activeGymId];
                if (gymName) {
                    setSelectedGym(gymName);
                }
            }

            setIsLoadingStats(false);
        }
        loadData();
    }, []);

    // Fetch item prices when needed (when non-standard preset selected)
    const hasFetchedPrices = useRef(false);

    useEffect(() => {
        async function loadItemPrices() {
            if (activePreset === 'standard') return;
            // Removed the useRef check for debugging purposes to allow re-fetch on preset change if needed, 
            // or I should check if I need to reset it when preset changes? 
            // Actually, if I switch between choco and happy, I might need to fetch new items if they are different?
            // "getJumpPresetItemIds" gets ALL items for ALL presets, so fetching once is enough.

            if (hasFetchedPrices.current) return;

            hasFetchedPrices.current = true;
            setIsLoadingPrices(true);

            const itemIds = getJumpPresetItemIds();

            // Fetch item details and market prices in parallel
            try {
                const [details, prices] = await Promise.all([
                    fetchItemDetailsFromSupabase(itemIds),
                    fetchItemMarketPrices(itemIds)
                ]);

                setItemDetails(details);
                setItemPrices(prices);
            } catch (e) {
                console.error("Error loading item data:", e);
            } finally {
                setIsLoadingPrices(false);
            }
        }

        // Only fetch if we haven't loaded prices yet and preset is not standard
        if (activePreset !== 'standard' && !hasFetchedPrices.current) {
            loadItemPrices();
        }
    }, [activePreset]);

    // Update happiness and energy when preset changes
    useEffect(() => {
        if (!userData) return;

        const baseHappiness = userData.bars.happy.current;
        const baseEnergy = userData.bars.energy.current;

        if (activePreset === 'standard') {
            // Standard preset uses current values
            setHappiness(String(baseHappiness));
            setEnergy(String(baseEnergy));
        } else {
            // Choco/Happy jump adds bonuses
            const happinessBonus = presetInfo.happinessBonus || 0;
            const energyBonus = presetInfo.energyBonus || 0;
            const hasEcstasy = presetInfo.hasEcstasy || false;

            // Ecstasy doubles TOTAL happiness (current + bonus)
            let newHappiness = baseHappiness + happinessBonus;
            if (hasEcstasy) {
                newHappiness = newHappiness * 2;
            }

            const newEnergy = Math.min(1000, baseEnergy + energyBonus); // Cap at 1000E
            setHappiness(String(newHappiness));
            setEnergy(String(newEnergy));
        }
    }, [activePreset, presetInfo.energyBonus, presetInfo.happinessBonus, presetInfo.hasEcstasy, userData]);

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <View className="absolute inset-0 z-0">
                <GridPattern />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <TitleBar title="Gym" />

                <ScrollView
                    contentContainerStyle={{ padding: hs(16), gap: vs(10), paddingBottom: vs(20) }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Battle Stats */}
                    <Card>
                        <View className="flex-row justify-between items-center border-b border-tactical-800" style={{ padding: ms(16) }}>
                            <Text className="uppercase text-tactical-700" style={{ fontSize: ms(14), fontFamily: "Inter_800ExtraBold" }}>Battle Stats</Text>
                            <Text className="text-white/50" style={{ fontSize: ms(12), fontFamily: "JetBrainsMono_400Regular" }}>
                                Total: <Text className="text-white">{battleStats ? formatNumber(battleStats.total) : '...'}</Text>
                            </Text>
                        </View>

                        <View style={{ gap: vs(10), padding: ms(16) }}>
                            {isLoadingStats ? (
                                <View className="items-center justify-center" style={{ padding: ms(20) }}>
                                    <ActivityIndicator size="small" color="#fff" />
                                </View>
                            ) : (
                                <>
                                    <View className="flex-row" style={{ gap: hs(10) }}>
                                        <StatBox
                                            label="Strength"
                                            value={battleStats ? formatNumber(battleStats.strength) : '0'}
                                            labelClassName="text-accent-red"
                                            isSelected={selectedStat === 'strength'}
                                            onPress={() => {
                                                setSelectedStat('strength');
                                                if (battleStats) {
                                                    setCurrentStats(formatNumber(battleStats.strength));
                                                }
                                            }}
                                        />
                                        <StatBox
                                            label="Defense"
                                            value={battleStats ? formatNumber(battleStats.defense) : '0'}
                                            labelClassName="text-accent-green"
                                            isSelected={selectedStat === 'defense'}
                                            onPress={() => {
                                                setSelectedStat('defense');
                                                if (battleStats) {
                                                    setCurrentStats(formatNumber(battleStats.defense));
                                                }
                                            }}
                                        />
                                    </View>
                                    <View className="flex-row" style={{ gap: hs(10) }}>
                                        <StatBox
                                            label="Speed"
                                            value={battleStats ? formatNumber(battleStats.speed) : '0'}
                                            labelClassName="text-accent-blue"
                                            isSelected={selectedStat === 'speed'}
                                            onPress={() => {
                                                setSelectedStat('speed');
                                                if (battleStats) {
                                                    setCurrentStats(formatNumber(battleStats.speed));
                                                }
                                            }}
                                        />
                                        <StatBox
                                            label="Dexterity"
                                            value={battleStats ? formatNumber(battleStats.dexterity) : '0'}
                                            labelClassName="text-accent-yellow"
                                            isSelected={selectedStat === 'dexterity'}
                                            onPress={() => {
                                                setSelectedStat('dexterity');
                                                if (battleStats) {
                                                    setCurrentStats(formatNumber(battleStats.dexterity));
                                                }
                                            }}
                                        />
                                    </View>
                                </>
                            )}
                        </View>
                    </Card>

                    {/* Jump Presets */}
                    <View className="flex-row" style={{ gap: hs(10) }}>
                        <TouchableOpacity
                            onPress={() => setActivePreset('standard')}
                            className={`flex-1 items-center rounded-lg border ${activePreset === 'standard' ? 'border-accent-purple bg-accent-purple/10' : 'border-tactical-800 bg-tactical-900'}`}
                            style={{ gap: vs(10), padding: ms(16) }}
                        >
                            <Smile color={activePreset === 'standard' ? '#a855f7' : 'rgba(255,255,255,0.5)'} size={hs(24)} />
                            <Text className={`uppercase ${activePreset === 'standard' ? 'text-white' : 'text-white/50'}`} style={{ fontSize: ms(12), fontFamily: "Inter_800ExtraBold" }}>Standard</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActivePreset('choco')}
                            className={`flex-1 items-center rounded-lg border ${activePreset === 'choco' ? 'border-accent-green bg-accent-green/10' : 'border-tactical-800 bg-tactical-900'}`}
                            style={{ gap: vs(10), padding: ms(16) }}
                        >
                            <Cookie color={activePreset === 'choco' ? '#22c55e' : 'rgba(255,255,255,0.5)'} size={hs(24)} />
                            <Text className={`uppercase ${activePreset === 'choco' ? 'text-white' : 'text-white/50'}`} style={{ fontSize: ms(12), fontFamily: "Inter_800ExtraBold" }}>Choco Jump</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActivePreset('happy')}
                            className={`flex-1 items-center rounded-lg border ${activePreset === 'happy' ? 'border-accent-yellow bg-accent-yellow/10' : 'border-tactical-800 bg-tactical-900'}`}
                            style={{ gap: vs(10), padding: ms(16) }}
                        >
                            <Zap color={activePreset === 'happy' ? '#eab308' : 'rgba(255,255,255,0.5)'} size={hs(24)} />
                            <Text className={`uppercase ${activePreset === 'happy' ? 'text-white' : 'text-white/50'}`} style={{ fontSize: ms(12), fontFamily: "Inter_800ExtraBold" }}>Happy Jump</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Information */}
                    <Card className="items-center" style={{ padding: ms(16), gap: vs(4) }}>
                        {isLoadingPrices && activePreset !== 'standard' ? (
                            <ActivityIndicator size="small" color="#22c55e" />
                        ) : (
                            <>
                                <Text
                                    className={`uppercase ${presetInfo.price === 0 ? 'text-accent-green' : 'text-accent-yellow'}`}
                                    style={{ fontSize: ms(24), fontFamily: "JetBrainsMono_800ExtraBold" }}
                                >
                                    {presetInfo.priceText}
                                </Text>
                                <Text className="text-white text-center" style={{ fontFamily: "Inter_400Regular", fontSize: ms(11) }}>
                                    {presetInfo.description}
                                </Text>
                            </>
                        )}
                    </Card>

                    {/* Gym Calculations */}
                    <Card>
                        <Text className="uppercase text-tactical-700 border-b border-tactical-800" style={{ fontSize: ms(14), fontFamily: "Inter_800ExtraBold", padding: ms(16) }}>Gym Calculations</Text>

                        <View style={{ padding: ms(16), gap: vs(12) }}>
                            {/* 2. MENGHUBUNGKAN STATE KE INPUT */}
                            <InputGroup
                                label="Current Stats"
                                placeholder="Enter stats (STR, DEF...)"
                                value={currentStats}
                                onChangeText={setCurrentStats}
                            />

                            <View className="flex-row" style={{ gap: hs(10) }}>
                                <View className="flex-1">
                                    <InputGroup
                                        label="Happiness"
                                        placeholder="e.g. 2825"
                                        value={happiness}
                                        onChangeText={setHappiness}
                                        textClassName="text-accent-yellow"
                                    />
                                </View>
                                <View className="flex-1">
                                    <InputGroup
                                        label="Energy"
                                        placeholder="e.g. 1000"
                                        value={energy}
                                        onChangeText={setEnergy}
                                        textClassName="text-accent-green"
                                    />
                                </View>
                            </View>

                            {/* Dropdown Gym */}
                            <View>
                                <Text className="text-white/50 font-sans uppercase mb-1" style={{ fontSize: ms(10) }}>gym name</Text>
                                <TouchableOpacity
                                    onPress={() => setIsDropdownOpen(true)}
                                    className="flex-row justify-between items-center bg-tactical-950 border border-tactical-800 rounded-[2px]"
                                    style={{ padding: ms(14) }}
                                >
                                    <Text style={{
                                        fontSize: ms(12),
                                        fontFamily: "JetBrainsMono_400Regular",
                                        color: selectedGym ? "white" : "rgba(255, 255, 255, 0.5)"
                                    }}>
                                        {selectedGym || "Select a gym"}
                                    </Text>
                                    <Text style={{ fontSize: ms(10), color: "rgba(255, 255, 255, 0.5)" }}>▼</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Card>

                    {/* Estimated Results */}
                    <Card>
                        <Text className="uppercase text-tactical-700 border-b border-tactical-800" style={{ fontSize: ms(14), fontFamily: "Inter_800ExtraBold", padding: ms(16) }}>Estimated Results</Text>
                        <View className="flex-col justify-between items-center bg-tactical-950 border-b border-tactical-800" style={{ padding: ms(16) }}>
                            <Text className="text-white/50 font-sans uppercase mb-1" style={{ fontSize: ms(10), fontFamily: "Inter_800ExtraBold" }}>
                                Gain per train - {gymCalculations.energyPerTrain || 0}E
                            </Text>
                            <Text className="text-white font-sans" style={{ fontSize: ms(24), fontFamily: "JetBrainsMono_800ExtraBold" }}>
                                +{gymCalculations.gainPerTrainValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                        </View>
                        <View className="flex-col justify-between items-center bg-tactical-950" style={{ padding: ms(16) }}>
                            <Text className="text-accent-yellow font-sans uppercase mb-1" style={{ fontSize: ms(10), fontFamily: "Inter_800ExtraBold" }}>Total Projected Gain</Text>
                            <Text className="text-accent-green font-sans" style={{ fontSize: ms(24), fontFamily: "JetBrainsMono_800ExtraBold" }}>
                                +{gymCalculations.totalGain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                        </View>
                    </Card>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modal Dropdown (Sama seperti sebelumnya) */}
            <Modal
                visible={isDropdownOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsDropdownOpen(false)}
            >
                <Pressable
                    className="flex-1 justify-center items-center bg-black/80"
                    onPress={() => setIsDropdownOpen(false)}
                >
                    <View
                        className="bg-tactical-900 border border-tactical-700 rounded-lg w-[90%]"
                        style={{ maxHeight: vs(400) }}
                    >
                        <Text
                            className="text-tactical-700 uppercase border-b border-tactical-800"
                            style={{ fontSize: ms(12), fontFamily: "Inter_800ExtraBold", padding: ms(16) }}
                        >
                            Select Gym
                        </Text>
                        <ScrollView showsVerticalScrollIndicator={true}>
                            {GYM_NAMES.map((gym: string, index: number) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                        setSelectedGym(gym);
                                        setIsDropdownOpen(false);
                                    }}
                                    className={`border-b border-tactical-800 ${selectedGym === gym ? 'bg-tactical-800' : ''}`}
                                    style={{ padding: ms(14) }}
                                >
                                    <Text style={{
                                        fontSize: ms(12),
                                        fontFamily: "JetBrainsMono_400Regular",
                                        color: selectedGym === gym ? "white" : "rgba(255, 255, 255, 0.7)"
                                    }}>
                                        {gym}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const StatBox = ({
    label,
    value,
    labelClassName = "text-white/50",
    isSelected = false,
    onPress
}: {
    label: string;
    value: string;
    labelClassName?: string;
    isSelected?: boolean;
    onPress?: () => void;
}) => {
    // Map label colors to border colors
    const colorMap: Record<string, string> = {
        'text-accent-red': '#F43F5E',
        'text-accent-green': '#10B981',
        'text-accent-blue': '#0EA5E9',
        'text-accent-yellow': '#F59E0B',
    };

    const borderColor = isSelected ? colorMap[labelClassName] : '#292524'; // tactical-800

    return (
        <TouchableOpacity
            className="flex-1 bg-tactical-950 rounded-[2px]"
            style={{
                padding: ms(10),
                borderWidth: 1,
                borderColor: borderColor,
            }}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text className={`${labelClassName} uppercase`} style={{ fontSize: ms(10), fontFamily: "Inter_800ExtraBold" }}>{label}</Text>
            <Text style={{ color: "white", fontSize: ms(16), fontFamily: "JetBrainsMono_800ExtraBold", marginTop: vs(4) }}>{value}</Text>
        </TouchableOpacity>
    );
};

// 3. PERBAIKAN INPUTGROUP: MENERIMA PROPS VALUE & ONCHANGETEXT
// Kita gunakan ...props agar semua properti TextInput bisa masuk (value, onChangeText, keyboardType, dll)
const InputGroup = ({ label, textClassName = "text-white", ...props }: any) => (
    <View>
        <Text className="text-white/50 font-sans uppercase mb-1" style={{ fontSize: ms(10) }}>{label}</Text>
        <TextInput
            {...props} // Ini penting! Meneruskan onChangeText dan value ke komponen asli
            keyboardType="numeric" // Memaksa keyboard angka
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            className={`${textClassName} bg-tactical-950 border border-tactical-800 rounded-[2px]`}
            style={{ fontSize: ms(12), fontFamily: "JetBrainsMono_800ExtraBold", padding: ms(14) }}
        />
    </View>
);