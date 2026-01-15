import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GridPattern } from "../../src/components/ui/grid-pattern";
import { TitleBar } from "../../src/components/ui/title-bar";

export default function OffshoreBank() {
    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <TitleBar title="Offshore Bank" />
            <View className="p-4 justify-center items-center flex-1">
                <Text className="text-white font-bold text-lg">Offshore Bank</Text>
            </View>
        </SafeAreaView>
    );
}