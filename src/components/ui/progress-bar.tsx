import React from "react";
import { View } from "react-native";

type Props = {
    value: number; // 0..1
    height?: number;
    trackClassName?: string;
    fillClassName?: string;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

export function ProgressBar({
    value,
    height = 5,
    trackClassName = "tactical-950",
    fillClassName = "accent-blue",
}: Props) {
    const v = clamp01(value);

    return (
        <View
            className={trackClassName}
            style={{ height, overflow: "hidden" }}
        >
            <View
                className={fillClassName}
                style={{ width: `${v * 100}%`, height: "100%" }}
            />
        </View>
    );
}
