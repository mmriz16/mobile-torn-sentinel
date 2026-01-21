import { Stack } from "expo-router";

export default function FactionLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="members" />
            <Stack.Screen name="ranked-war" />
            <Stack.Screen name="payday" />
            <Stack.Screen name="chain-list" />
        </Stack>
    );
}
