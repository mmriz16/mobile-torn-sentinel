import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
    Easing,
    Extrapolation,
    interpolate,
    interpolateColor,
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import PlaneIcon from '../../../assets/icons/plane.svg'; // Sesuaikan path
import { moderateScale as ms } from '../../../src/utils/responsive'; // Sesuaikan path

// --- CONSTANTS (Hitung di sini biar aman dari Error Reanimated) ---
const DOT_SIZE = ms(6);
const DOT_RADIUS = ms(3);
const PLANE_SIZE = ms(24);
const GAP_SIZE = ms(12);

// --- KOMPONEN ANAK: DOT ---
const SyncedDot = ({ progress, index, totalItems }: { progress: SharedValue<number>, index: number, totalItems: number }) => {

    const animatedStyle = useAnimatedStyle(() => {
        const step = 1 / (totalItems - 1);
        const myTime = index * step;
        const inputRange = [myTime - step, myTime, myTime + step];

        const backgroundColor = interpolateColor(
            progress.value,
            inputRange,
            ['#333333', '#FFFFFF', '#333333']
        );

        const scale = interpolate(
            progress.value,
            inputRange,
            [0.8, 1.2, 0.8],
            Extrapolation.CLAMP
        );

        return {
            backgroundColor,
            transform: [{ scale }],
            // GUNAKAN CONSTANT, JANGAN PANGGIL ms() DI SINI
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: DOT_RADIUS,
        };
    });

    return <Animated.View style={animatedStyle} />;
};

// --- KOMPONEN ANAK: PESAWAT ---
const SyncedPlane = ({ progress, index, totalItems }: { progress: SharedValue<number>, index: number, totalItems: number }) => {

    const animatedStyle = useAnimatedStyle(() => {
        const step = 1 / (totalItems - 1);
        const myTime = index * step;
        const inputRange = [myTime - step, myTime, myTime + step];

        const opacity = interpolate(
            progress.value,
            inputRange,
            [0.3, 1, 0.3],
            Extrapolation.CLAMP
        );

        const scale = interpolate(
            progress.value,
            inputRange,
            [0.8, 1.1, 0.8],
            Extrapolation.CLAMP
        );

        return {
            opacity,
            transform: [{ scale }]
        };
    });

    return (
        <Animated.View style={animatedStyle}>
            {/* GUNAKAN CONSTANT */}
            <PlaneIcon width={PLANE_SIZE} height={PLANE_SIZE} />
        </Animated.View>
    );
};

// --- CONTAINER UTAMA ---
export default function TravelLoader() {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(
            withTiming(1, {
                duration: 1500,
                easing: Easing.linear
            }),
            -1,
            false
        );
    }, [progress]);

    const totalItems = 5;

    return (
        // GUNAKAN CONSTANT GAP
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: GAP_SIZE, justifyContent: 'center' }}>
            <SyncedDot index={0} totalItems={totalItems} progress={progress} />
            <SyncedDot index={1} totalItems={totalItems} progress={progress} />
            <SyncedPlane index={2} totalItems={totalItems} progress={progress} />
            <SyncedDot index={3} totalItems={totalItems} progress={progress} />
            <SyncedDot index={4} totalItems={totalItems} progress={progress} />
        </View>
    );
}