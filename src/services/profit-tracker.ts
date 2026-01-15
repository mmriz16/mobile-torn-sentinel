import { supabase } from './supabase';

export interface ProfitData {
    profit: number;
    percentChange: number;
}

export const syncNetworthAndGetProfit = async (tornId: number, currentNetworth: number): Promise<ProfitData> => {
    try {
        const { data, error } = await supabase.rpc('record_and_get_profit', {
            p_torn_id: Math.floor(tornId),           // Pastikan integer
            p_current_amount: Math.floor(currentNetworth) // Pastikan integer
        });

        if (error) throw error;

        // Calculate percentage change
        // profit = currentNetworth - previousNetworth
        // previousNetworth = currentNetworth - profit
        const profit = data || 0;
        const previousNetworth = currentNetworth - profit;
        const percentChange = previousNetworth > 0
            ? ((profit / previousNetworth) * 100)
            : 0;

        return { profit, percentChange };
    } catch (err) {
        console.error("Failed to sync profit:", err);
        return { profit: 0, percentChange: 0 };
    }
};
