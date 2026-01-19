import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GridPattern } from "../../src/components/ui/grid-pattern";
import { moderateScale as ms, verticalScale as vs } from '../../src/utils/responsive';

export default function ChainList() {
    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <View className="p-4 justify-center items-center flex-1" style={{ gap: vs(16) }}>
                <Text className="text-white" style={{ fontSize: ms(32) }}>🚧</Text>
                <View style={{ alignItems: 'center', gap: vs(4) }}>
                    <Text className="text-white uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(16) }}>Module Under Construction</Text>
                    <Text className="text-white/50 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>Check back in the next deployment cycle.</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}