import { supabase } from './supabase';

export const syncNetworthAndGetProfit = async (tornId: number, currentNetworth: number) => {
    try {
        const { data, error } = await supabase.rpc('record_and_get_profit', {
            p_torn_id: Math.floor(tornId),           // Pastikan integer
            p_current_amount: Math.floor(currentNetworth) // Pastikan integer
        });

        if (error) throw error;
        return data;
    } catch (err) {
        console.error("Failed to sync profit:", err);
        return 0;
    }
};
