import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GridPattern } from "../../src/components/ui/grid-pattern";

export default function Assets() {
    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <View className="p-4 justify-center items-center flex-1">
                <Text className="text-white font-bold text-lg">Assets</Text>
            </View>
        </SafeAreaView>
    );
}