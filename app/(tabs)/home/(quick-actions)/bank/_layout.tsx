import { Stack } from "expo-router";

export default function BankLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="torn-bank" />
            <Stack.Screen name="offshore-bank" />
            <Stack.Screen name="company-stocks" />
        </Stack>
    );
}
