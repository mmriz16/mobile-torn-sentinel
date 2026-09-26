import { GridPattern } from "@/src/components/ui/grid-pattern";
import { moderateScale as ms, verticalScale as vs } from '@/src/utils/responsive';
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotFound() {
    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <View className="p-4 justify-center items-center flex-1" style={{ gap: vs(16) }}>
                <Text className="text-accent-yellow" style={{ fontFamily: 'JetBrainsMono_800ExtraBold', fontSize: ms(48) }}>404</Text>
                <View style={{ alignItems: 'center', gap: vs(4) }}>
                    <Text className="text-white uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(16) }}>Sector Not Found</Text>
                    <Text className="text-white/50 uppercase text-center" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>This page does not exist or has been moved.</Text>
                </View>
                <TouchableOpacity activeOpacity={0.8} onPress={() => router.replace("/(tabs)/home")}>
                    <Text
                        className="text-tactical-950 bg-accent-yellow uppercase"
                        style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(12), paddingHorizontal: ms(16), paddingVertical: vs(10), borderRadius: ms(8), overflow: 'hidden' }}
                    >
                        Return to Home
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
