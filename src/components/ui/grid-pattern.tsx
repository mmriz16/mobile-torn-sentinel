import { View } from "react-native";

export function GridPattern() {
    return (
        <View
            className="absolute inset-0 pointer-events-none z-0"
            style={{
                backgroundImage: `
                    repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 16px),
                    repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 16px)
                `,
            }}
        />
    );
}
