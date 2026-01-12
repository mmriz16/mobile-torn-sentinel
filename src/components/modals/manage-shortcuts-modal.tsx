import { GripVertical, Plus, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AVAILABLE_SHORTCUTS, ShortcutItem } from '../../constants/shortcuts';
import { moderateScale as ms } from '../../utils/responsive';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_MARGIN = 40; // Margin dari atas dan bawah

interface ManageShortcutsModalProps {
    visible: boolean;
    onClose: () => void;
    currentShortcuts: string[];
    onSave: (newShortcuts: string[]) => void;
    availableShortcuts?: ShortcutItem[];
}

export const ManageShortcutsModal = ({ visible, onClose, currentShortcuts, onSave, availableShortcuts = AVAILABLE_SHORTCUTS }: ManageShortcutsModalProps) => {
    const [localShortcuts, setLocalShortcuts] = useState<string[]>([]);

    useEffect(() => {
        if (visible) {
            setLocalShortcuts([...currentShortcuts]);
        }
    }, [visible, currentShortcuts]);

    const handleSave = () => {
        onSave(localShortcuts);
    };

    const handleAdd = (id: string) => {
        if (localShortcuts.length < 4) {
            setLocalShortcuts([...localShortcuts, id]);
        }
    };

    const handleRemove = (id: string) => {
        setLocalShortcuts(localShortcuts.filter(item => item !== id));
    };

    const activeItems = localShortcuts
        .map(id => availableShortcuts.find(s => s.id === id))
        .filter(Boolean) as ShortcutItem[];

    const availableItems = availableShortcuts
        .filter(s => !localShortcuts.includes(s.id));

    const renderItem = ({ item, drag, isActive }: RenderItemParams<ShortcutItem>) => {
        return (
            <ScaleDecorator>
                <TouchableOpacity
                    onLongPress={drag}
                    activeOpacity={1}
                    disabled={isActive}
                    style={{
                        backgroundColor: isActive ? '#3A3A3C' : '#2C2C2E',
                        marginBottom: 8,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        borderColor: 'rgba(255,255,255,0.05)',
                        borderWidth: 1
                    }}
                >
                    {/* Grip Icon for Dragging */}
                    <TouchableOpacity onPressIn={drag} className="mr-3">
                        <GripVertical size={ms(20)} color="#666" />
                    </TouchableOpacity>

                    {/* Icon */}
                    <View className="mr-3">
                        {item.isSvg ? (
                            <item.icon width={ms(20)} height={ms(20)} />
                        ) : (
                            <item.icon size={ms(20)} color="rgba(255, 255, 255, 0.8)" />
                        )}
                    </View>

                    {/* Label */}
                    <Text className="text-white font-bold flex-1" style={{ fontSize: ms(14) }}>
                        {item.label}
                    </Text>

                    {/* Remove */}
                    <TouchableOpacity onPress={() => handleRemove(item.id)}>
                        <Trash2 size={ms(18)} color="#EF4444" />
                    </TouchableOpacity>
                </TouchableOpacity>
            </ScaleDecorator>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View className="flex-1 bg-black/80 justify-center items-center" style={{ padding: ms(20) }}>
                    <View
                        className="bg-[#1C1C1E] w-full rounded-2xl overflow-hidden border border-white/10"
                        style={{ maxHeight: SCREEN_HEIGHT - MODAL_MARGIN * 2 }}
                    >
                        {/* Header */}
                        <View className="flex-row justify-between items-center border-b border-white/10" style={{ padding: ms(16) }}>
                            <View>
                                <Text className="text-white font-black uppercase" style={{ fontSize: ms(14), fontFamily: 'Inter_900Black' }}>
                                    Manage Shortcuts
                                </Text>
                                <Text className="text-white/50 text-xs mt-1 font-mono">
                                    {localShortcuts.length} / 4 Selected
                                </Text>
                            </View>
                            <TouchableOpacity onPress={onClose}>
                                <X color="#666" size={ms(20)} />
                            </TouchableOpacity>
                        </View>

                        {/* Content - No ScrollView, fit to content */}
                        <View style={{ padding: ms(16) }}>
                            {/* Active Shortcuts */}
                            <Text className="text-white/40 text-[10px] font-bold uppercase mb-3">
                                Active Shortcuts (Long press to drag)
                            </Text>

                            {activeItems.length === 0 ? (
                                <Text className="text-white/30 italic text-center py-4">No active shortcuts</Text>
                            ) : (
                                <DraggableFlatList
                                    data={activeItems}
                                    onDragEnd={({ data }) => setLocalShortcuts(data.map(i => i.id))}
                                    keyExtractor={(item) => item.id}
                                    renderItem={renderItem}
                                    scrollEnabled={false}
                                />
                            )}

                            {/* Available Shortcuts */}
                            <View style={{ marginTop: 24 }}>
                                <Text className="text-white/40 text-[10px] font-bold uppercase mb-3">
                                    Available Shortcuts
                                </Text>
                                <View className="gap-2 pb-4">
                                    {availableItems.map(item => (
                                        <View key={item.id} className="flex-row items-center bg-[#2C2C2E] p-3 rounded-lg border border-white/5 opacity-80">
                                            <View className="mr-3 w-8 items-center">
                                                {item.isSvg ? (
                                                    <item.icon width={ms(20)} height={ms(20)} style={{ opacity: 0.5 }} />
                                                ) : (
                                                    <item.icon size={ms(20)} color="#999" />
                                                )}
                                            </View>

                                            <Text className="text-white/70 font-bold flex-1" style={{ fontSize: ms(14) }}>
                                                {item.label}
                                            </Text>

                                            <TouchableOpacity
                                                onPress={() => handleAdd(item.id)}
                                                disabled={localShortcuts.length >= 4}
                                                style={{ opacity: localShortcuts.length >= 4 ? 0.3 : 1 }}
                                            >
                                                <Plus size={ms(18)} color="#10B981" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Footer */}
                        <View className="p-4 border-t border-white/10 flex-row gap-3">
                            <TouchableOpacity
                                className="flex-1 bg-[#3A3A3C] py-3 rounded-lg items-center"
                                onPress={onClose}
                            >
                                <Text className="text-white font-bold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-[#F59E0B] py-3 rounded-lg items-center"
                                onPress={handleSave}
                            >
                                <Text className="text-black font-bold">Save Order</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
};
