const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets/images');
const PLUGIN_PATH = path.join(PROJECT_ROOT, 'plugins/withNotificationIcons.js');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'app.config.js');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');
const NOTIFICATIONS_TS_PATH = path.join(PROJECT_ROOT, 'src/utils/notifications.ts');

const ICONS_TO_CHECK = [
    'plane.png',
    'book.png',
    'booster.png',
    'chain.png',
    'drug.png',
    'energy.png',
    'happy.png',
    'heart.png',
    'hospital.png',
    'jail.png',
    'nerve.png'
];

function checkFileExists(filePath, description) {
    if (fs.existsSync(filePath)) {
        console.log(`✅ [OK] ${description} found: ${path.basename(filePath)}`);
        return true;
    } else {
        console.error(`❌ [FAIL] ${description} MISSING: ${filePath}`);
        return false;
    }
}

function checkContent(filePath, contentToFind, description) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(contentToFind)) {
        console.log(`✅ [OK] ${description}: Found expected content "${contentToFind}"`);
        return true;
    } else {
        console.error(`❌ [FAIL] ${description}: Missing "${contentToFind}"`);
        return false;
    }
}

function main() {
    console.log("🔍 STARTING SYSTEM INTEGRITY CHECK...\n");
    let errors = 0;

    // 1. Check Assets
    console.log("--- 1. Checking Assets (Source Images) ---");
    ICONS_TO_CHECK.forEach(icon => {
        if (!checkFileExists(path.join(ASSETS_DIR, icon), `Asset ${icon}`)) errors++;
    });

    // 2. Check Plugin
    console.log("\n--- 2. Checking Plugin Configuration ---");
    if (checkFileExists(PLUGIN_PATH, "Plugin File")) {
        // Verify plugin maps all icons
        const pluginContent = fs.readFileSync(PLUGIN_PATH, 'utf8');
        ICONS_TO_CHECK.forEach(icon => {
            if (!pluginContent.includes(icon)) {
                console.error(`❌ [FAIL] Plugin does not explicitly map: ${icon}`);
                errors++;
            }
        });
        console.log("✅ [OK] Plugin maps all required icons.");
    } else {
        errors++;
    }

    // 3. Check App Config
    console.log("\n--- 3. Checking app.config.js ---");
    if (checkFileExists(CONFIG_PATH, "Config File")) {
        // It's dynamic, so simple string check might miss if it's required differently, 
        // but we look for the require or the usage logic.
        if (!checkContent(CONFIG_PATH, "withNotificationIcons", "Plugin usage in config")) errors++;
    } else {
        errors++;
    }

    // 4. Check Package.json
    console.log("\n--- 4. Checking Dependencies ---");
    if (checkFileExists(PACKAGE_JSON_PATH, "package.json")) {
        if (!checkContent(PACKAGE_JSON_PATH, "@notifee/react-native", "Notifee dependency")) errors++;
    } else {
        errors++;
    }

    // 5. Check Logic File
    console.log("\n--- 5. Checking Notification Logic ---");
    if (checkFileExists(NOTIFICATIONS_TS_PATH, "Notification Logic File")) {
        if (!checkContent(NOTIFICATIONS_TS_PATH, "@notifee/react-native", "Import Notifee")) errors++;
        if (!checkContent(NOTIFICATIONS_TS_PATH, "ic_notif_plane", "Usage of custom icon 'ic_notif_plane'")) errors++;
        if (!checkContent(NOTIFICATIONS_TS_PATH, "#FCF3EC", "Correct color #FCF3EC")) errors++;
    } else {
        errors++;
    }

    console.log("\n---------------------------------------------------");
    if (errors === 0) {
        console.log("✅ SYSTEM CHECK PASSED: All components are present and correctly linked.");
    } else {
        console.log(`❌ SYSTEM CHECK FAILED: Found ${errors} errors. See logs above.`);
        process.exit(1);
    }
}

main();
