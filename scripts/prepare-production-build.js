const fs = require('fs');
const path = require('path');

const INDEX_PATH = path.join(__dirname, '../app/(tabs)/home/index.tsx');
const CONFIG_PATH = path.join(__dirname, '../app.config.js');
const CHANGELOG_PATH = path.join(__dirname, '../app/(modals)/changelog.tsx');

function bumpVersion(version) {
    const parts = version.split('.');
    parts[2] = parseInt(parts[2], 10) + 1;
    return parts.join('.');
}

function formatDate() {
    const date = new Date();
    const month = date.toLocaleString('en-US', { month: 'short' }); // Jan, Feb...
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}, ${day} ${year}`;
}

function updateIndexFile() {
    let content = fs.readFileSync(INDEX_PATH, 'utf8');
    const versionMatch = content.match(/const APP_VERSION = "(\d+\.\d+\.\d+)";/);

    if (!versionMatch) {
        console.error('Could not find APP_VERSION in index.tsx');
        process.exit(1);
    }

    const currentVersion = versionMatch[1];
    const newVersion = bumpVersion(currentVersion);

    content = content.replace(`const APP_VERSION = "${currentVersion}";`, `const APP_VERSION = "${newVersion}";`);
    fs.writeFileSync(INDEX_PATH, content);

    console.log(`Bumps version: ${currentVersion} -> ${newVersion}`);
    return newVersion;
}

function updateConfigFile(newVersion) {
    let content = fs.readFileSync(CONFIG_PATH, 'utf8');
    // Regex matches "version": "1.2.3" to replace it safely
    // Be careful not to replace other "version" keys if they exist (dependencies etc), 
    // but in app.config.js formatted as JS object, it's likely safe if we target `version: "..."`

    // Using a more specific regex for the expo config object key
    content = content.replace(/version: "(\d+\.\d+\.\d+)"/, `version: "${newVersion}"`);
    fs.writeFileSync(CONFIG_PATH, content);
    console.log(`Updated app.config.js to version ${newVersion}`);
}

function updateChangelogFile(newVersion, changelogItems) {
    let content = fs.readFileSync(CHANGELOG_PATH, 'utf8');

    // Format changelog items
    const items = changelogItems.length > 0 ? changelogItems : ['General improvements and bug fixes'];

    // Construct the JSX Card
    const cardJsx = `
                            {/* VERSION ${newVersion} - Newest */}
                            <Card className="border border-tactical-800" style={{ borderRadius: ms(8) }}>
                                <View className="flex-row justify-between items-center bg-tactical-950 border-b border-tactical-800" style={{ padding: ms(16) }}>
                                    <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Version ${newVersion}</Text>
                                    <Text className="text-white/70 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>${formatDate()}</Text>
                                </View>
                                <View className="bg-tactical-950" style={{ gap: ms(6), padding: ms(16) }}>
                                    <View className="flex-row items-center" style={{ gap: ms(4) }}>
                                        <View className="bg-accent-green rounded-full" style={{ width: ms(4), height: ms(4) }} />
                                        <Text className="text-white/80 uppercase" style={{ fontFamily: 'Inter_700Bold', fontSize: ms(12) }}>Improvements & Changes</Text>
                                    </View>
                                    <View style={{ paddingLeft: ms(3) }}>
                                        <View className="border-l border-tactical-800" style={{ paddingVertical: ms(4), paddingLeft: ms(8) }}>
                                            <View className="bg-tactical-900 border border-tactical-800" style={{ padding: ms(10), gap: ms(4) }}>
                                                ${items.map(item => `<Text className="text-white/70" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>- ${item}</Text>`).join('\n                                                ')}
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </Card>
`;

    // Insert before {changelogs.map...
    // We look for the ScrollView content opening or the map expression.
    // To be safe, let's find the contentContainerStyle line and insert after the closing `>` of ScrollView opening tag? 
    // Or just search for `{changelogs.map` and insert before it.

    if (content.includes('{changelogs.map')) {
        content = content.replace('{changelogs.map', `${cardJsx}\n                            {changelogs.map`);
        fs.writeFileSync(CHANGELOG_PATH, content);
        console.log(`Updated changelog.tsx with new version card`);
    } else {
        console.warn('Could not find {changelogs.map in changelog.tsx - skipping static card insertion');
    }
}

function main() {
    const args = process.argv.slice(2);
    const changelogItems = args.length > 0 ? args : [];

    console.log('Preparing production build...');

    const newVersion = updateIndexFile();
    updateConfigFile(newVersion);
    updateChangelogFile(newVersion, changelogItems);

    // Output valid JSON for the Agent to parse if needed, later.
    // For now the logs are sufficient.
    console.log(`READY_FOR_BUILD: ${newVersion}`);
}

main();
