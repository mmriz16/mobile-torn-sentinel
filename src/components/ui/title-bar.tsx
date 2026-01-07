import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Text, TouchableOpacity, View, ViewProps } from "react-native";
import { moderateScale as ms } from '../../utils/responsive';
// Actually, nativewind usually just takes className.
// Let's stick to simple props passing.

interface TitleBarProps extends ViewProps {
    className?: string;
    title: string;
}

export function TitleBar({ className, title, ...props }: TitleBarProps) {
    const router = useRouter();

    return (
        <View
            className={`bg-tactical-900 border-b border-tactical-800 px-4 py-3 flex-row items-center gap-4 ${className}`}
            {...props}
        >
            <TouchableOpacity
                onPress={() => router.back()}
                className="p-2.5 rounded-full bg-tactical-950 border border-tactical-800"
            >
                <ArrowLeft size={20} color="#fff" />
            </TouchableOpacity>
            <Text className="text-white font-sans" style={{ fontSize: ms(16) }}>{title}</Text>
        </View>
    );
}