// src/constants/items.ts
// Item IDs and definitions for gym jump presets
// Note: Item effects should be validated against API data

// Jump preset item IDs (verified from Torn Wiki)
export const JUMP_ITEMS = {
    XANAX: 206,
    BIG_BOX_CHOCOLATE: 36,  // Big Box of Chocolate Bars
    EROTIC_DVD: 366,        // Erotic DVD (ID 366, NOT 283/Donator Pack)
    ECSTASY: 197,           // Ecstasy
} as const;

// Jump preset configurations
export interface JumpPresetItem {
    itemId: number;
    quantity: number;
}

export interface JumpPreset {
    name: string;
    description: string;
    items: JumpPresetItem[];
    isFree: boolean;
}

export const JUMP_PRESETS: Record<'standard' | 'choco' | 'happy', JumpPreset> = {
    standard: {
        name: 'Standard',
        description: 'Uses current energy only',
        items: [],
        isFree: true,
    },
    choco: {
        name: 'Choco Jump',
        description: '4× Xanax + 49× Big Box + 1× Ecstasy',
        items: [
            { itemId: JUMP_ITEMS.XANAX, quantity: 4 },
            { itemId: JUMP_ITEMS.BIG_BOX_CHOCOLATE, quantity: 49 },
            { itemId: JUMP_ITEMS.ECSTASY, quantity: 1 },
        ],
        isFree: false,
    },
    happy: {
        name: 'Happy Jump',
        description: '4× Xanax + 5× Erotic DVD + 1× Ecstasy',
        items: [
            { itemId: JUMP_ITEMS.XANAX, quantity: 4 },
            { itemId: JUMP_ITEMS.EROTIC_DVD, quantity: 5 },
            { itemId: JUMP_ITEMS.ECSTASY, quantity: 1 },
        ],
        isFree: false,
    },
};

// Get all unique item IDs needed for jump presets
export function getJumpPresetItemIds(): number[] {
    const itemIds = new Set<number>();
    Object.values(JUMP_PRESETS).forEach(preset => {
        preset.items.forEach(item => itemIds.add(item.itemId));
    });
    return Array.from(itemIds);
}
