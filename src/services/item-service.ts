
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
                    stats: item.stats || {}
                };
            }
        }
        return items;
    } catch (error) {
        console.error('Error in fetchItemDetailsFromSupabase:', error);
        return {};
    }
}
