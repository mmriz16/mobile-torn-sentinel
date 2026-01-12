import 'dotenv/config';

// Determine if this is a development build
const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
    expo: {
        name: IS_DEV ? "Torn Sentinel Dev" : "Torn Sentinel",
        slug: "mobile-torn-sentinel",
        version: "1.0.0",
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
                    "imageWidth": 300,
                    "imageHeight": 300,
                    "resizeMode": "contain",
                    "backgroundColor": "#000000",
                    "dark": {
                        "backgroundColor": "#000000"
                    }
                }
            ],
            "expo-secure-store"
        ],

        experiments: {
            typedRoutes: true,
            reactCompiler: true
        },

        extra: {
            router: {},
            eas: {
                // ID Proyek yang terdaftar di JSON Anda
                "projectId": "0d7c4841-e629-473e-b02d-ff02debf1347"
            },
            // --- BAGIAN INI YANG KITA TAMBAHKAN AGAR TIDAK ERROR JARINGAN ---
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
        },
        updates: {
            url: "https://u.expo.dev/0d7c4841-e629-473e-b02d-ff02debf1347"
        },
        runtimeVersion: "1.0.0",
    }
};