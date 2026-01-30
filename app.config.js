import 'dotenv/config';

// Determine if this is a development build
const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
    expo: {
        name: IS_DEV ? "Torn Sentinel Dev" : "Torn Sentinel",
        slug: "mobile-torn-sentinel",
        version: "1.1.0",
        orientation: "portrait",
        icon: "./assets/images/icon.png",
        scheme: "mobiletornsentinel",
        userInterfaceStyle: "automatic",
        newArchEnabled: true,

        ios: {
            jsEngine: "hermes",
            supportsTablet: true,
            bundleIdentifier: IS_DEV ? "com.kaozi.tornsentinel.dev" : "com.kaozi.tornsentinel"
        },

        android: {
            jsEngine: "hermes",
            // Package name berbeda untuk dev vs production
            package: IS_DEV ? "com.kaozi.tornsentinel.dev" : "com.kaozi.tornsentinel",
            adaptiveIcon: {
                backgroundColor: "#000000",
                foregroundImage: "./assets/images/icon.png"
            },
            googleServicesFile: "./google-services.json",
            edgeToEdgeEnabled: true,
            predictiveBackGestureEnabled: false
        },

        web: {
            output: "static",
            favicon: "./assets/images/favicon.png"
        },

        plugins: [
            "expo-router",
            [
                "expo-splash-screen",
                {
                    "image": "./assets/images/splash-icon.png",
                    "imageWidth": 200,
                    "imageHeight": 200,
                    "resizeMode": "contain",
                    "backgroundColor": "#000000",
                    "dark": {
                        "backgroundColor": "#000000"
                    }
                }
            ],
            "expo-secure-store",
            [
                "react-native-android-widget",
                {
                    widgets: [
                        {
                            name: "StatusOverview",
                            label: "Status Overview",
                            description: "Shows your Torn status overview",
                            minWidth: "320dp",
                            minHeight: "120dp",
                            targetCellWidth: 4,
                            targetCellHeight: 2,
                            resizeMode: "horizontal|vertical",
                        },
                        {
                            name: "CooldownStatus",
                            label: "Cooldown Status",
                            description: "Shows your cooldown timers",
                            minWidth: "320dp",
                            minHeight: "120dp",
                            targetCellWidth: 4,
                            targetCellHeight: 2,
                            resizeMode: "horizontal|vertical",
                        },
                    ],
                }
            ]
        ],

        experiments: {
            typedRoutes: true,
            reactCompiler: true
        },

        extra: {
            router: {},
            eas: {
                // ID Proyek untuk akun kao.zi
                "projectId": "b2459cf2-1337-4d3b-b32b-4ef86da1b8cf"
            },
            // Hardcode for production builds (process.env not available in EAS builds)
            supabaseUrl: process.env.SUPABASE_URL || "https://tbrdoygkaxqwennbrmxt.supabase.co",
            supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicmRveWdrYXhxd2VubmJybXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQyMDUsImV4cCI6MjA4MzM1MDIwNX0.xiBjMLYkNFiZ2yZsEbuO-6sbhK-cGxS4DZ7K7hizHj4",
        },
        updates: {
            url: "https://u.expo.dev/b2459cf2-1337-4d3b-b32b-4ef86da1b8cf"
        },
        runtimeVersion: "1.0.0",
    }
};