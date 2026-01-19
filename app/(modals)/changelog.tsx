import { Card } from "@/src/components/ui/card";
import { X } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { moderateScale as ms } from "../../src/utils/responsive";

interface ChangelogProps {
    onClose?: () => void;
}

export default function Changelog({ onClose }: ChangelogProps) {
    return (
        <SafeAreaView className="flex-1 border-t border-tactical-800 bg-[#0C0A09]/10 backdrop-blur-[20px] drop-shadow-[50px] shadow-black" style={{ borderTopLeftRadius: ms(24), borderTopRightRadius: ms(24) }}>
            <View className="flex-1" style={{ padding: ms(16), gap: ms(16) }}>
                <View className="flex-row justify-between items-center">
                    <View>
                        <Text className="text-white uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>What&apos;s New</Text>
                        <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>New updates and improvements to Torn Sentinel</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                        <Card className="border border-[#F43F5E]/20 bg-[#F43F5E]/20" style={{ borderRadius: ms(8), width: ms(24), height: ms(24), justifyContent: 'center', alignItems: 'center' }}>
                            <X size={ms(16)} color="#F43F5E" />
                        </Card>
                    </TouchableOpacity>
                </View>
                <Card className="border border-tactical-800" style={{ borderRadius: ms(8) }}>
                    <View className="flex-row justify-between items-center bg-tactical-950 border-b border-tactical-800" style={{ padding: ms(16) }}>
                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Version 1.0.1</Text>
                        <Text className="text-white/70 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>Jan, 19 2026</Text>
                    </View>

                    <View className="bg-tactical-950" style={{ gap: ms(6), padding: ms(16) }}>
                        {/* Improvements & Changes */}
                        <View className="flex-row items-center" style={{ gap: ms(4) }}>
                            <View className="bg-accent-green rounded-full" style={{ width: ms(4), height: ms(4) }} />
                            <Text className="text-white/80 uppercase" style={{ fontFamily: 'Inter_700Bold', fontSize: ms(12) }}>Improvements & Changes</Text>
                        </View>
                        <View style={{ paddingLeft: ms(3) }}>
                            <View className="border-l border-tactical-800" style={{ paddingVertical: ms(4), paddingLeft: ms(8) }}>
                                <View className="bg-tactical-900 border border-tactical-800" style={{ padding: ms(10), gap: ms(4) }}>
                                    <Text className="text-white/70" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>- App startup speed - UI loads faster</Text>
                                    <Text className="text-white/70" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>- Push token auto-sync on app launch</Text>
                                    <Text className="text-white/70" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>- New card design for Bank screens</Text>
                                    <Text className="text-white/70" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>- New &quot;What&apos;s New&quot; modal on updates</Text>
                                </View>
                            </View>
                        </View>

                        {/* Fixed */}
                        <View className="flex-row items-center" style={{ gap: ms(4) }}>
                            <View className="bg-accent-yellow rounded-full" style={{ width: ms(4), height: ms(4) }} />
                            <Text className="text-white/80 uppercase" style={{ fontFamily: 'Inter_700Bold', fontSize: ms(12) }}>Fixed</Text>
                        </View>
                        <View style={{ paddingLeft: ms(3) }}>
                            <View className="border-l border-tactical-800" style={{ paddingVertical: ms(4), paddingLeft: ms(8) }}>
                                <View className="bg-tactical-900 border border-tactical-800" style={{ padding: ms(10), gap: ms(4) }}>
                                    <Text className="text-white/70" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>- Push notifications not being delivered</Text>
                                    <Text className="text-white/70" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>- Local notifications (Energy, Travel)</Text>
                                    <Text className="text-white/70" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>- Missing bank rates import error</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </Card>
            </View>
        </SafeAreaView>
    );
}