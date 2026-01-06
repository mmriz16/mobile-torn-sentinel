import { View, ViewProps } from "react-native";
// Actually, nativewind usually just takes className.
// Let's stick to simple props passing.

interface CardProps extends ViewProps {
    className?: string;
}

export function Card({ className, ...props }: CardProps) {
    return (
        <View
            className={`bg-tactical-900 border border-tactical-800 rounded-lg overflow-hidden ${className}`}
            {...props}
        />
    );
}