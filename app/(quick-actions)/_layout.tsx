import { Stack } from "expo-router";

export default function QuickActionsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="bank" />
            <Stack.Screen name="faction" />
            <Stack.Screen name="gym" />
            <Stack.Screen name="networth" />
            <Stack.Screen name="property" />
            <Stack.Screen name="stats" />
            <Stack.Screen name="travel" />
            <Stack.Screen name="others" />
        </Stack>
    );
}
