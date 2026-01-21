import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

const LAST_UPDATE_ID_KEY = 'lastSeenUpdateId';

// Helper to store/retrieve last seen update ID
async function getLastSeenUpdateId(): Promise<string | null> {
    if (Platform.OS === 'web') {
        return localStorage.getItem(LAST_UPDATE_ID_KEY);
    }
    return SecureStore.getItemAsync(LAST_UPDATE_ID_KEY);
}

async function setLastSeenUpdateId(updateId: string): Promise<void> {
    if (Platform.OS === 'web') {
        localStorage.setItem(LAST_UPDATE_ID_KEY, updateId);
        return;
    }
    await SecureStore.setItemAsync(LAST_UPDATE_ID_KEY, updateId);
}

interface ParsedChangelog {
    version: string;
    changes: string[];
}

function parseChangelog(message: string): ParsedChangelog {
    const lines = message.trim().split('\n').filter(line => line.trim());

    // First line is version (e.g., "v1.2.0" or "Version 1.2.0")
    const version = lines[0] || 'New Update';

    // Rest are changelog items (lines starting with -, *, or •)
    const changes = lines.slice(1).map(line => {
        // Remove leading -, *, • and whitespace
        return line.replace(/^[\s]*[-*•]\s*/, '').trim();
    }).filter(line => line.length > 0);

    return { version, changes };
}

export function UpdateModal() {
    const [visible, setVisible] = useState(false);
    const [changelog, setChangelog] = useState<ParsedChangelog | null>(null);

    useEffect(() => {
        checkForUpdate();
    }, []);

    async function checkForUpdate() {
        // Skip on development/web
        if (__DEV__ || Platform.OS === 'web') {
            return;
        }

        try {
            // Get current update info
            const currentUpdateId = Updates.updateId;
            const manifest = Updates.manifest;

            if (!currentUpdateId || !manifest) {
                return;
            }

            // Check if we've already shown this update
            const lastSeenId = await getLastSeenUpdateId();
            if (lastSeenId === currentUpdateId) {
                return; // Already shown this update
            }

            // Get the message from manifest extra (EAS Update message)
            // @ts-ignore - message exists on EAS Update manifests
            const message = manifest?.extra?.expoClient?.extra?.eas?.updateMessage
                // @ts-ignore
                || manifest?.metadata?.message
                // @ts-ignore  
                || manifest?.extra?.message
                || null;

            if (message) {
                const parsed = parseChangelog(message);
                setChangelog(parsed);
                setVisible(true);
            }
        } catch (error) {
            console.log('UpdateModal: Error checking update:', error);
        }
    }

    async function handleDismiss() {
        const currentUpdateId = Updates.updateId;
        if (currentUpdateId) {
            await setLastSeenUpdateId(currentUpdateId);
        }
        setVisible(false);
    }

    if (!changelog) {
        return null;
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleDismiss}
        >
            <View className="flex-1 bg-black/70 items-center justify-center px-6">
                <View className="bg-tactical-900 rounded-2xl w-full max-w-sm border border-tactical-700 overflow-hidden">
                    {/* Header */}
                    <View className="bg-tactical-800 px-5 py-4 border-b border-tactical-700">
                        <Text className="text-xl font-bold text-white text-center">
                            🎉 What&apos;s New
                        </Text>
                    </View>

                    {/* Content */}
                    <ScrollView className="px-5 py-4 max-h-80">
                        {/* Version */}
                        <Text className="text-lg font-semibold text-cyan-400 mb-3">
                            {changelog.version}
                        </Text>

                        {/* Changes */}
                        {changelog.changes.map((change, index) => (
                            <View key={index} className="flex-row mb-2">
                                <Text className="text-cyan-500 mr-2">•</Text>
                                <Text className="text-gray-200 flex-1 text-base">
                                    {change}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>

                    {/* Footer */}
                    <View className="px-5 py-4 border-t border-tactical-700">
                        <Pressable
                            onPress={handleDismiss}
                            className="bg-cyan-600 py-3 rounded-xl active:bg-cyan-700"
                        >
                            <Text className="text-white font-semibold text-center text-base">
                                Got it!
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
