import { View, ViewProps } from "react-native";

interface ButtonProps extends ViewProps {
    className?: string;
}

export function Button({ className, ...props }: ButtonProps) {
    return (
        <View
            className={`bg-accent-yellow border justify-center items-center p-4 uppercase font-mono font-bold text-sm text-white rounded-lg overflow-hidden ${className}`}
            {...props}
        />
    );
}