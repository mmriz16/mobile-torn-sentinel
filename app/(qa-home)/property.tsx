import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GridPattern } from "../../src/components/ui/grid-pattern";
import { TitleBar } from "../../src/components/ui/title-bar";

export default function Property() {
    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <TitleBar title="Property" />
            <View className="p-4 justify-center items-center flex-1">
                <Text className="text-white font-bold text-lg">Property</Text>
            </View>
        </SafeAreaView>
    );
}