const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const ANDROID_ICON_PATH = 'android/app/src/main/res/drawable';

// Map asset filenames to resource names
const CUSTOM_ICONS = [
    { src: 'plane.png', name: 'ic_notif_plane' },
    { src: 'book.png', name: 'ic_notif_book' },
    { src: 'booster.png', name: 'ic_notif_booster' },
    { src: 'chain.png', name: 'ic_notif_chain' },
    { src: 'drug.png', name: 'ic_notif_drug' },
    { src: 'energy.png', name: 'ic_notif_energy' },
    { src: 'happy.png', name: 'ic_notif_happy' },
    { src: 'heart.png', name: 'ic_notif_heart' },
    { src: 'hospital.png', name: 'ic_notif_hospital' },
    { src: 'jail.png', name: 'ic_notif_jail' },
    { src: 'nerve.png', name: 'ic_notif_nerve' },
];

const withNotificationIcons = (config) => {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const destDir = path.join(projectRoot, ANDROID_ICON_PATH);

            console.log("🔔 Running Notification Icons Plugin");
            console.log("   Src Dir:", path.join(projectRoot, 'assets/images'));
            console.log("   Dest Dir:", destDir);

            // Ensure directory exists
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }

            // Copy each icon
            CUSTOM_ICONS.forEach((icon) => {
                const srcPath = path.join(projectRoot, 'assets/images', icon.src);
                const destPath = path.join(destDir, `${icon.name}.png`);

                if (fs.existsSync(srcPath)) {
                    fs.copyFileSync(srcPath, destPath);
                    console.log(`   ✅ Copied ${icon.src} -> ${icon.name}`);
                } else {
                    console.warn(`   ⚠️ MISSING: ${srcPath}`);
                }
            });

            return config;
        },
    ]);
};

module.exports = withNotificationIcons;
