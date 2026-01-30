
// src/services/item-service.ts
import { supabase } from './supabase';
import { TornItem } from './torn-api';

/**
 * Fetch details for specific items from Supabase
 * @param itemIds Array of item IDs to fetch
 * @returns Map of itemId -> TornItem
 */
export async function fetchItemDetailsFromSupabase(itemIds: number[]): Promise<Record<number, TornItem>> {
    try {
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .in('id', itemIds);

        if (error) {
            console.error('Error fetching items from Supabase:', error);
            return {};
        }

        const items: Record<number, TornItem> = {};
        if (data) {
            for (const item of data) {
                items[item.id] = {
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    type: item.type,
                    market_value: item.market_value,
                    buy_price: item.buy_price || 0,
                    image_url: item.image_url || '',

                    // Flattened fields from database (no longer nested in stats)
                    damage: item.damage ?? null,
                    accuracy: item.accuracy ?? null,
                    armor_rating: item.armor_rating ?? null,
                    fire_rate: item.fire_rate ?? null,
                    effect: item.effect ?? null,
                    requirement: item.requirement ?? null,
                    coverage: item.coverage ?? null,
                };
            }
        }
        return items;
    } catch (error) {
        console.error('Error in fetchItemDetailsFromSupabase:', error);
        return {};
    }
}

// Static list of Torn Item Categories to avoid expensive DB counts
// These rarely change.
export const TORN_ITEM_CATEGORIES = [
    "Alcohol",
    "Artifact",
    "Book",
    "Booster",
    "Candy",
    "Car",
    "Clothing",
    "Collectible",
    "Defensive",
    "Drug",
    "Electronics",
    "Energy Drink",
    "Enhancer",
    "Flower",
    "Jewelry",
    "Medical",
    "Melee",
    "Other",
    "Pet",
    "Plushie",
    "Primary",
    "Secondary",
    "Special",
    "Stat Enhancer",
    "Supply Pack",
    "Temporary",
    "Virus",
    "Weapon"
];

export interface CategoryCount {
    type: string;
    count: number | string; // Allow string for "All" or "100+"
}

/**
 * Get item categories (Optimized: Static list instead of DB crawl)
 * Note: We skip the exact count per category for performance, 
 * or we could fetch it efficiently if Supabase supports a group-by count RPC.
 * For now, we return the static list.
 */
export async function fetchItemCategories(): Promise<CategoryCount[]> {
    // Return static list sorted alphabetically
    return TORN_ITEM_CATEGORIES.sort().map(type => ({
        type,
        count: '' // We don't need exact counts to filter, just the types
    }));
}
