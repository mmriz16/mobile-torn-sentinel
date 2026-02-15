import { GridPattern } from "@/src/components/ui/grid-pattern";
import { TitleBar } from "@/src/components/ui/title-bar";
import { supabase } from "@/src/services/supabase";
import { fetchUserBars, formatNumber } from "@/src/services/torn-api";
import { moderateScale as ms, verticalScale as vs } from "@/src/utils/responsive";
import { useLocalSearchParams } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

// Google blocks sign-in from embedded WebViews with default user agents.
// Using a real browser user agent bypasses this restriction.
const CHROME_USER_AGENT =
    Platform.OS === 'android'
        ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
        : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

interface OkayTarget {
    torn_id: number;
    name: string;
    level: number;
    total_stats: number;
    strength: number;
    defense: number;
    speed: number;
    dexterity: number;
}

export default function WebBrowserModal() {
    const { url, title, currentIndex, mode } = useLocalSearchParams<{
        url: string;
        title?: string;
        currentIndex?: string;
        mode?: string; // 'chain' for chain list mode
    }>();


    const webViewRef = useRef<WebView>(null);

    const [okayTargets, setOkayTargets] = useState<OkayTarget[]>([]);

    // Chain Status
    const [chainStatus, setChainStatus] = useState<{ current: number; max: number; timeout: number } | null>(null);
    const [chainTimeLeft, setChainTimeLeft] = useState<string>("");

    const [currentIdx, setCurrentIdx] = useState(parseInt(currentIndex || '0', 10));
    const [currentUrl, setCurrentUrl] = useState('');
    const [currentTitle, setCurrentTitle] = useState(title || 'Browser');

    const isChainMode = mode === 'chain';

    // Decode the URL
    useEffect(() => {
        if (url) {
            setCurrentUrl(decodeURIComponent(url));
        }
    }, [url]);

    // Fetch okay targets list for chain mode
    // Update Chain Status & Countdown
    // Chain Status & Auto-Correction
    // Chain Status & Auto-Correction
    const endTimeRef = useRef<number>(0);

    useEffect(() => {
        if (!isChainMode) return;

        let pollInterval: NodeJS.Timeout;
        let tickerInterval: NodeJS.Timeout;

        const formatChainTimer = (seconds: number) => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };

        const refreshChainData = async () => {
            // Fetch simplified user data (bars)
            const bars = await fetchUserBars();

            if (bars?.chain) {
                setChainStatus(bars.chain);

                // Smart Countdown Update
                // Calculate projected end time based on API
                const projectedEndTime = Date.now() + (bars.chain.timeout * 1000);

                // If endTime is not set, or the diff is significant (> 3s), update it.
                // This prevents small jitters (e.g. 1-2s) from resetting the smooth local timer,
                // but still allows "Chain Hits" (which add time) or "Decay" corrections to apply.
                if (Math.abs(projectedEndTime - endTimeRef.current) > 3000) {
                    endTimeRef.current = projectedEndTime;
                }
            }

            fetchOkayTargets();
        };

        // UI Ticker - runs independently every 200ms for responsiveness
        const updateTicker = () => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));

            if (endTimeRef.current === 0) {
                setChainTimeLeft("");
            } else if (remaining <= 0) {
                setChainTimeLeft("TIMEOUT");
            } else {
                setChainTimeLeft(formatChainTimer(remaining));
            }
        };

        // Initial Load
        refreshChainData();

        // Separate polling and ticking
        pollInterval = setInterval(refreshChainData, 20000); // 20s API Poll
        tickerInterval = setInterval(updateTicker, 1000); // 1s UI Update

        return () => {
            if (pollInterval) clearInterval(pollInterval);
            if (tickerInterval) clearInterval(tickerInterval);
        };
    }, [isChainMode]);

    const fetchOkayTargets = async () => {
        const { data } = await supabase
            .from('chain_target')
            .select('torn_id, name, level, total_stats, strength, defense, speed, dexterity')
            .eq('status', 'Okay')
            .order('last_checked_at', { ascending: false });

        if (data) {
            setOkayTargets(data as OkayTarget[]);
        }
    };

    const handleNext = () => {
        if (okayTargets.length === 0) return;

        const nextIdx = (currentIdx + 1) % okayTargets.length;
        const nextTarget = okayTargets[nextIdx];

        if (nextTarget) {
            const attackUrl = `https://www.torn.com/loader2.php?sid=getInAttack&user2ID=${nextTarget.torn_id}`;
            setCurrentUrl(attackUrl);
            setCurrentTitle(`Attack ${nextTarget.name}`);
            setCurrentIdx(nextIdx);

        }
    };

    return (
        <SafeAreaView className="flex-1 bg-tactical-950">
            <GridPattern />
            <TitleBar title={currentTitle} />

            {/* Target Stats Bar */}
            {okayTargets.length > 0 && okayTargets[currentIdx] && (
                <View className="bg-tactical-900 border-b border-tactical-800 flex-row flex-wrap items-center justify-between" style={{ paddingHorizontal: ms(16), paddingVertical: vs(8) }}>
                    <View className="flex-row items-center" style={{ gap: ms(12) }}>
                        <View className="bg-tactical-800 rounded px-2 py-1">
                            <Text className="text-white font-bold" style={{ fontSize: ms(12) }}>
                                Lvl {okayTargets[currentIdx].level}
                            </Text>
                        </View>
                        <Text className="text-white/70" style={{ fontSize: ms(11), fontFamily: 'JetBrainsMono_400Regular' }}>
                            Total: {formatNumber(okayTargets[currentIdx].total_stats)}
                        </Text>
                    </View>

                    <View className="flex-row items-center" style={{ gap: ms(8) }}>
                        <View className="items-center">
                            <Text className="text-red-400" style={{ fontSize: ms(10), fontFamily: 'JetBrainsMono_700Bold' }}>STR</Text>
                            <Text className="text-white" style={{ fontSize: ms(10) }}>{formatNumber(okayTargets[currentIdx].strength)}</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-blue-400" style={{ fontSize: ms(10), fontFamily: 'JetBrainsMono_700Bold' }}>DEF</Text>
                            <Text className="text-white" style={{ fontSize: ms(10) }}>{formatNumber(okayTargets[currentIdx].defense)}</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-green-400" style={{ fontSize: ms(10), fontFamily: 'JetBrainsMono_700Bold' }}>SPD</Text>
                            <Text className="text-white" style={{ fontSize: ms(10) }}>{formatNumber(okayTargets[currentIdx].speed)}</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-yellow-400" style={{ fontSize: ms(10), fontFamily: 'JetBrainsMono_700Bold' }}>DEX</Text>
                            <Text className="text-white" style={{ fontSize: ms(10) }}>{formatNumber(okayTargets[currentIdx].dexterity)}</Text>
                        </View>
                    </View>
                </View>
            )}

            <View className="flex-1">
                {currentUrl ? (
                    <WebView
                        ref={webViewRef}
                        source={{ uri: currentUrl }}
                        style={{ flex: 1, backgroundColor: '#0C0A09' }}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        scalesPageToFit={true}
                        allowsInlineMediaPlayback={true}
                        mediaPlaybackRequiresUserAction={false}
                        // Google OAuth fix: use real browser user agent
                        userAgent={CHROME_USER_AGENT}
                        // Enable cookies for authentication
                        thirdPartyCookiesEnabled={true}
                        sharedCookiesEnabled={true}
                        // Allow all URL schemes (needed for OAuth redirects)
                        originWhitelist={['*']}
                        mixedContentMode="compatibility"
                        cacheEnabled={true}
                        setSupportMultipleWindows={false}
                        // Intercept window.close() — Google OAuth popup calls this after login,
                        // which blanks the WebView. We override it to send a message instead.
                        injectedJavaScript={`
                            window.close = function() {
                                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'windowClose' }));
                            };
                            true;
                        `}
                        // When Google OAuth popup calls window.close(), reload the original page
                        onMessage={(event) => {
                            try {
                                const data = JSON.parse(event.nativeEvent.data);
                                if (data.type === 'windowClose') {
                                    webViewRef.current?.injectJavaScript(
                                        `window.location.href = '${currentUrl.replace(/'/g, "\\'")}'; true;`
                                    );
                                }
                            } catch { }
                        }}
                        // Fallback: if page navigates to about:blank, reload original URL
                        onNavigationStateChange={(navState) => {
                            if (navState.url === 'about:blank' && currentUrl) {
                                setTimeout(() => {
                                    webViewRef.current?.injectJavaScript(
                                        `window.location.href = '${currentUrl.replace(/'/g, "\\'")}'; true;`
                                    );
                                }, 300);
                            }
                        }}
                        onShouldStartLoadWithRequest={(request) => {
                            const { url: reqUrl } = request;
                            if (reqUrl.startsWith('http://') || reqUrl.startsWith('https://')) {
                                return true;
                            }
                            if (reqUrl === 'about:blank') return true;
                            return false;
                        }}
                    />
                ) : null}
            </View>

            {/* Floating Status Bar - Only in Chain Mode */}
            {isChainMode && okayTargets.length > 0 && (
                <View
                    className="bg-tactical-900 border-t border-tactical-800 flex-row items-center justify-between"
                    style={{ padding: ms(12) }}
                >
                    <View className="flex-row items-center" style={{ gap: ms(12) }}>
                        {/* Chain Status */}
                        {chainStatus && (
                            <View className="flex-row items-center mr-2" style={{ gap: ms(4) }}>
                                <Text className="text-accent-red font-bold uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(14) }}>
                                    {chainStatus.current}/{chainStatus.max}
                                </Text>
                                <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>
                                    {chainTimeLeft}
                                </Text>
                            </View>
                        )}

                        {/* Target Info */}
                        <View>
                            <View className="flex-row items-center" style={{ gap: ms(6) }}>
                                {okayTargets.length > 0 && (
                                    <Text className="text-white" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(12) }}>
                                        #{currentIdx + 1} / {okayTargets.length}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleNext}
                        className="bg-accent-yellow flex-row items-center rounded-lg"
                        style={{ paddingVertical: vs(8), paddingHorizontal: ms(16), gap: ms(4) }}
                        activeOpacity={0.8}
                    >
                        <Text className="text-tactical-950" style={{ fontFamily: 'Inter_700Bold', fontSize: ms(14) }}>
                            Next
                        </Text>
                        <ChevronRight size={ms(18)} color="#0C0A09" />
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}
