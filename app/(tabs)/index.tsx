import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../src/components/ui/card";
import { ProgressBar } from "../../src/components/ui/progress-bar";

export default function Home() {
    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <View className="flex-1 p-4 gap-4">
                {/* Header */}
                <View>
                    <Text className="text-white font-sans font-bold text-lg">Welcome back, <span className="text-accent-yellow">Username</span></Text>
                    <Text className="text-white/50 text-[10px] font-mono uppercase">id : 281000 - Level 99</Text>
                </View>

                {/* Top Sections */}
                <div className="flex flex-col gap-2.5 w-full">
                    <Card className="pt-4 flex-1">
                        {/* header row */}
                        <View className="flex-row px-4 items-start justify-between">
                            <View className="flex-1">
                                <Text className="font-mono text-white/80 text-[10px]">
                                    08:00 GMT+7
                                </Text>
                                <Text className="text-white font-bold text-lg">
                                    Torn City
                                </Text>
                            </View>

                            {/* kolom kanan */}
                            <View className="flex-1 items-end">
                                <Text className="font-mono text-white/80 text-[10px]">
                                    11:00 GMT+7
                                </Text>
                                <Text className="text-white font-bold text-lg">
                                    UAE
                                </Text>
                            </View>
                        </View>

                        {/* progress bar */}
                        <View className="mt-3">
                            <ProgressBar
                                value={0.2}
                                height={4}
                                trackClassName="bg-tactical-950"
                                fillClassName="bg-accent-blue"
                            />
                        </View>
                    </Card>

                    {/* KPI Section */}
                    <div className="flex gap-2.5 w-full">
                        {/* Daily Profit Card */}
                        <Card className="p-4 flex-1">
                            <div className="flex flex-col">
                                <Text className="uppercase font-sans text-xs font-extrabold text-accent-yellow">daily profit</Text>
                                <Text className="text-lg font-extrabold font-mono text-white">$4,200,000</Text>
                            </div>
                            <div className="flex gap-1">
                                <Text className="uppercase font-sans text-[10px] font-bold text-accent-green">+12%</Text>
                                <Text className="text-[10px] uppercase font-mono text-white/50">vs yesterday</Text>
                            </div>
                        </Card>

                        {/* Networth Card */}
                        <Card className="p-4 flex-1">
                            <div className="flex flex-col">
                                <Text className="uppercase font-sans text-xs font-extrabold text-accent-yellow">networth</Text>
                                <Text className="text-lg font-extrabold font-mono text-white">$35,309,207</Text>
                            </div>
                            <Text className="text-[10px] uppercase font-mono text-white/50">vs yesterday</Text>
                        </Card>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="flex flex-col gap-2.5 w-full">
                    {/* Quick Actions */}
                    <div className="flex justify-between items-center">
                        <Text className="uppercase font-sans text-sm font-extrabold text-white/50">quick actions</Text>
                        <Text className="text-[10px] uppercase font-mono text-white/50">edit</Text>
                    </div>
                    <div className="flex gap-2.5 w-full">
                        <Card className="flex flex-col items-center justify-center p-2.5 flex-1">
                            <Text className="text-[8px] font-bold uppercase font-sans text-white/80">property</Text>
                        </Card>
                        <Card className="flex flex-col items-center justify-center p-2.5 flex-1">
                            <Text className="text-[8px] font-bold uppercase font-sans text-white/80">market</Text>
                        </Card>
                        <Card className="flex flex-col items-center justify-center p-2.5 flex-1">
                            <Text className="text-[8px] font-bold uppercase font-sans text-white/80">stats</Text>
                        </Card>
                        <Card className="flex flex-col items-center justify-center p-2.5 flex-1">
                            <Text className="text-[8px] font-bold uppercase font-sans text-white/80">networth</Text>
                        </Card>
                        <Card className="flex flex-col items-center justify-center p-2.5 flex-1">
                            <Text className="text-[8px] font-bold uppercase font-sans text-white/80">others</Text>
                        </Card>
                    </div>

                    { }

                </div>
            </View>
        </SafeAreaView>
    );
}
