import { Tabs } from "expo-router";

export default function TabsLayout() {
    return (
        <Tabs screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="index" options={{ title: "Home" }} />
            <Tabs.Screen name="market" options={{ title: "Market" }} />
            <Tabs.Screen name="profit" options={{ title: "Profit" }} />
            <Tabs.Screen name="assets" options={{ title: "Assets" }} />
            <Tabs.Screen name="alerts" options={{ title: "Alerts" }} />
        </Tabs>
    );
}
