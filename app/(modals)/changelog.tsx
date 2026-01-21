import { Card } from "@/src/components/ui/card";
import { supabase } from "@/src/services/supabase";
import { moderateScale as ms } from "@/src/utils/responsive";
import { BlurView } from "expo-blur";
import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ChangelogProps {
    onClose?: () => void;
}

interface ChangeLogData {
    id: number;
    version: string;
    release_date: string;
    changes: {
        new?: string[];
        improvements?: string[];
        fixed?: string[];
    };
}

export default function Changelog({ onClose }: ChangelogProps) {
    const [changelogs, setChangelogs] = useState<ChangeLogData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChangelogs();
    }, []);

    const fetchChangelogs = async () => {
        try {
            const { data, error } = await supabase
                .from('app_changelogs')
                .select('*')
                .order('release_date', { ascending: false })
                .order('version', { ascending: false }); // Secondary sort for same day releases

            if (error) {
                console.error('Error fetching changelogs:', error);
                return;
            }

            if (data) {
                setChangelogs(data);
            }
        } catch (error) {
            console.error('Error fetching changelogs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <BlurView
            intensity={20}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            blurReductionFactor={1}
            style={{ flex: 1, borderTopLeftRadius: ms(24), borderTopRightRadius: ms(24), overflow: 'hidden' }}
        >
            <SafeAreaView className="flex-1 border-t border-tactical-800" style={{ backgroundColor: 'rgba(12, 10, 9, 0.8)' }}>
                <View className="flex-1" style={{ padding: ms(16) }}>
                    <View className="flex-row justify-between items-center" style={{ marginBottom: ms(16) }}>
                        <View>
                            <Text className="text-white uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>What&apos;s New</Text>
                            <Text className="text-white/50" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>New updates and improvements to Torn Sentinel</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                            <Card className="border border-[#F43F5E]/20 bg-[#F43F5E]/20" style={{ borderRadius: ms(8), width: ms(24), height: ms(24), justifyContent: 'center', alignItems: 'center' }}>
                                <X size={ms(16)} color="#F43F5E" />
                            </Card>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View className="flex-1 justify-center items-center">
                            <ActivityIndicator size="large" color="#F59E0B" />
                        </View>
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ gap: ms(16), paddingBottom: ms(20) }}
                        >
                            {changelogs.map((log, index) => (
                                <Card key={log.id} className="border border-tactical-800" style={{ borderRadius: ms(8), opacity: index > 0 ? 0.7 : 1 }}>
                                    <View className="flex-row justify-between items-center bg-tactical-950 border-b border-tactical-800" style={{ padding: ms(16) }}>
                                        <Text className="text-white/50 uppercase" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: ms(14) }}>Version {log.version}</Text>
                                        <Text className="text-white/70 uppercase" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>{formatDate(log.release_date)}</Text>
                                    </View>

                                    <View className="bg-tactical-950" style={{ gap: ms(6), padding: ms(16) }}>
                                        {/* New Features */}
                                        {log.changes.new && log.changes.new.length > 0 && (
                                            <>
                                                <View className="flex-row items-center" style={{ gap: ms(4) }}>
                                                    <View className="bg-accent-blue rounded-full" style={{ width: ms(4), height: ms(4) }} />
                                                    <Text className="text-white/80 uppercase" style={{ fontFamily: 'Inter_700Bold', fontSize: ms(12) }}>New Features</Text>
                                                </View>
                                                <View style={{ paddingLeft: ms(3) }}>
                                                    <View className="border-l border-tactical-800" style={{ paddingVertical: ms(4), paddingLeft: ms(8) }}>
                                                        <View className="bg-tactical-900 border border-tactical-800" style={{ padding: ms(10), gap: ms(4) }}>
                                                            {log.changes.new.map((item, i) => (
                                                                <Text key={i} className="text-white/70" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>- {item}</Text>
                                                            ))}
                                                        </View>
                                                    </View>
                                                </View>
                                            </>
                                        )}

                                        {/* Improvements */}
                                        {log.changes.improvements && log.changes.improvements.length > 0 && (
                                            <>
                                                <View className="flex-row items-center" style={{ gap: ms(4) }}>
                                                    <View className="bg-accent-green rounded-full" style={{ width: ms(4), height: ms(4) }} />
                                                    <Text className="text-white/80 uppercase" style={{ fontFamily: 'Inter_700Bold', fontSize: ms(12) }}>Improvements & Changes</Text>
                                                </View>
                                                <View style={{ paddingLeft: ms(3) }}>
                                                    <View className="border-l border-tactical-800" style={{ paddingVertical: ms(4), paddingLeft: ms(8) }}>
                                                        <View className="bg-tactical-900 border border-tactical-800" style={{ padding: ms(10), gap: ms(4) }}>
                                                            {log.changes.improvements.map((item, i) => (
                                                                <Text key={i} className="text-white/70" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>- {item}</Text>
                                                            ))}
                                                        </View>
                                                    </View>
                                                </View>
                                            </>
                                        )}

                                        {/* Fixed */}
                                        {log.changes.fixed && log.changes.fixed.length > 0 && (
                                            <>
                                                <View className="flex-row items-center" style={{ gap: ms(4) }}>
                                                    <View className="bg-accent-yellow rounded-full" style={{ width: ms(4), height: ms(4) }} />
                                                    <Text className="text-white/80 uppercase" style={{ fontFamily: 'Inter_700Bold', fontSize: ms(12) }}>Fixed</Text>
                                                </View>
                                                <View style={{ paddingLeft: ms(3) }}>
                                                    <View className="border-l border-tactical-800" style={{ paddingVertical: ms(4), paddingLeft: ms(8) }}>
                                                        <View className="bg-tactical-900 border border-tactical-800" style={{ padding: ms(10), gap: ms(4) }}>
                                                            {log.changes.fixed.map((item, i) => (
                                                                <Text key={i} className="text-white/70" style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: ms(10) }}>- {item}</Text>
                                                            ))}
                                                        </View>
                                                    </View>
                                                </View>
                                            </>
                                        )}
                                    </View>
                                </Card>
                            ))}
                        </ScrollView>
                    )}
                </View>
            </SafeAreaView>
        </BlurView>
    );
}