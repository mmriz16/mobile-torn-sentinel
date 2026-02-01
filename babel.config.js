module.exports = function (api) {
    api.cache(true);

    // Helper to identify widget files (cross-platform, case-insensitive)
    const isWidgetFile = (filename) => {
        // If filename is missing, assume it's NOT a widget (let normal rules apply)
        if (!filename) return false;

        // Normalize path separators and case for consistent matching on Windows/Unix
        const normalized = filename.replace(/\\/g, "/").toLowerCase();

        // Check if file is inside the widgets directory
        return normalized.includes("app/(quick-actions)/widgets");
    };

    return {
        // Root presets MUST be empty to ensure overrides are mutually exclusive.
        // Otherwise, root presets merge with override presets.
        presets: [],

        // Plugins shared by all environments
        plugins: [
            "react-native-reanimated/plugin",
        ],

        overrides: [
            // 1. Configuration for WIDGET files (Pure React Native, NO NativeWind)
            {
                test: (filename) => isWidgetFile(filename),
                presets: [
                    ["babel-preset-expo", { jsxImportSource: "react" }]
                ],
            },

            // 2. Configuration for ALL OTHER files (Standard App with NativeWind)
            {
                test: (filename) => !isWidgetFile(filename),
                presets: [
                    ["babel-preset-expo", { jsxImportSource: "nativewind" }],
                    "nativewind/babel",
                ],
            },
        ],
    };
};
