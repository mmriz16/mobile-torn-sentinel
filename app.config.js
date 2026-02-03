require('dotenv/config');

const withNotificationIcons = require('./plugins/withNotificationIcons');

// Determine if this is a development build
const IS_DEV = process.env.APP_VARIANT === 'development';

module.exports = ({ config }) => {
    const finalConfig = {
        ...config,
        name: IS_DEV ? "Torn Sentinel Dev" : "Torn Sentinel Prod",
        slug: "mobile-torn-sentinel",
        version: "1.1.14",
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

        notification: {
            // color: "#FCF3EC" // Set default color
            // icon: "./assets/images/notification-icon.png" // We use custom icons now
            color: "#FCF3EC"
        },

        plugins: [
            "expo-router",
            // "./plugins/withNotificationIcons", // Removed string usage to avoid resolution issues, applied manually below
            [
                "expo-build-properties",
                {
                    "android": {
                        "compileSdkVersion": 36,
                        "targetSdkVersion": 36,
                        "buildToolsVersion": "36.0.0"
                    }
                }
            ],
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
                    fonts: [
                        './assets/fonts/Inter_900Black.ttf',
                        './assets/fonts/Inter_800ExtraBold.ttf',
                        './assets/fonts/JetBrainsMono_800ExtraBold.ttf',
                        './assets/fonts/JetBrainsMono_400Regular.ttf',
                        './assets/fonts/Inter_400Regular.ttf',
                    ],
                    widgets: [
                        {
                            name: "Hello",
                            label: "Hello",
                            description: "Testing widget",
                            minWidth: "360dp",
                            minHeight: "120dp",
                            targetCellWidth: 4,
                            targetCellHeight: 2,
                            resizeMode: "horizontal|vertical",
                            previewImage: "./assets/images/splash-icon.png",
                        },
                        {
                            name: "StatusOverview",
                            label: "Status Overview",
                            description: "Shows your Torn status overview",
                            minWidth: "360dp",
                            minHeight: "120dp",
                            targetCellWidth: 4,
                            targetCellHeight: 2,
                            resizeMode: "horizontal|vertical",
                            previewImage: "./assets/images/widget-status-overview.png",
                        },
                        {
                            name: "CooldownStatus",
                            label: "Cooldown Status",
                            description: "Shows your cooldown timers",
                            minWidth: "360dp",
                            minHeight: "120dp",
                            targetCellWidth: 4,
                            targetCellHeight: 2,
                            resizeMode: "horizontal|vertical",
                            previewImage: "./assets/images/widget-cooldown-status.png",
                        },
                    ],
                }
            ],
            "expo-asset"
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
    };

    // Apply custom plugin programmatically
    return withNotificationIcons(finalConfig);
};