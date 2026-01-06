import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AlertsIcon from "../../assets/icons/alerts.svg";
import AssetsIcon from "../../assets/icons/assets.svg";
import HomeIcon from "../../assets/icons/home.svg";
import MarketIcon from "../../assets/icons/market.svg";
import ProfitIcon from "../../assets/icons/profit.svg";

export default function TabsLayout() {
    const insets = useSafeAreaInsets();
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: "#1C1917", // tactical-900
                    borderTopColor: "#292524", // tactical-800
                    height: 60 + insets.bottom,
                    paddingTop: 8,
                    paddingBottom: 8 + insets.bottom,
                },
                tabBarItemStyle: {
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                },
                tabBarIconStyle: {
                    margin: 0,
                },
                tabBarLabelStyle: {
                    marginTop: 2,
                    fontSize: 8,
                    fontWeight: "semibold",
                    textTransform: "uppercase",
                    fontFamily: "JetBrainsMono_400Regular",
                },
                tabBarActiveTintColor: "#F59E0B",
                tabBarInactiveTintColor: "rgba(255, 255, 255, .8)",
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color }) => <HomeIcon color={color} width={24} height={24} />,
                }}
            />
            <Tabs.Screen
                name="market"
                options={{
                    title: "Market",
                    tabBarIcon: ({ color }) => <MarketIcon color={color} width={24} height={24} />,
                }}
            />
            <Tabs.Screen
                name="profit"
                options={{
                    title: "Profit",
                    tabBarIcon: ({ color }) => <ProfitIcon color={color} width={24} height={24} />,
                }}
            />
            <Tabs.Screen
                name="assets"
                options={{
                    title: "Assets",
                    tabBarIcon: ({ color }) => <AssetsIcon color={color} width={24} height={24} />,
                }}
            />
            <Tabs.Screen
                name="alerts"
                options={{
                    title: "Alerts",
                    tabBarIcon: ({ color }) => <AlertsIcon color={color} width={24} height={24} />,
                }}
            />
        </Tabs>
    );
}
