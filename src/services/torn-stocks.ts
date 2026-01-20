import { supabase } from './supabase';

// Stock Types
export interface TornStock {
    stock_id: number;
    name: string;
    acronym: string | null;
    current_price: number;
    market_cap: number | null;
    total_shares: number | null;
    investors: number | null;
    benefit_type: string | null;
    benefit_frequency: number | null;
    benefit_requirement: number | null;
    benefit_description: string | null;
    updated_at: string | null;
}

export interface StockHistoryPoint {
    price: number;
    created_at: string;
    investors?: number;
    market_cap?: number;
}

export type TimePeriod = 'D' | 'W' | 'M' | 'All';

// Fetch current stock details from stocks_ref
export async function fetchStockDetails(stockId: number): Promise<TornStock | null> {
    const { data, error } = await supabase
        .from('stocks_ref')
        .select('*')
        .eq('stock_id', stockId)
        .single();

    if (error) {
        console.error('Error fetching stock details:', error);
        return null;
    }

    return data as TornStock;
}

// Fetch stock history for charting
export async function fetchStockHistory(stockId: number, period: TimePeriod): Promise<StockHistoryPoint[]> {
    // Calculate date range based on period
    const now = new Date();
    let fromDate: Date;

    switch (period) {
        case 'D':
            fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day
            break;
        case 'W':
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days
            break;
        case 'M':
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
            break;
        case 'All':
        default:
            fromDate = new Date(0); // All time
            break;
    }

    const { data, error } = await supabase
        .from('stock_history')
        .select('price, created_at, investors, market_cap')
        .eq('stock_id', stockId)
        .gte('created_at', fromDate.toISOString())
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching stock history:', error);
        return [];
    }

    return (data || []).map(item => ({
        price: Number(item.price),
        created_at: item.created_at,
        investors: item.investors ?? undefined,
        market_cap: item.market_cap ?? undefined,
    }));
}

// Calculate stock analytics from history
export function calculateStockAnalytics(history: StockHistoryPoint[]) {
    if (history.length === 0) {
        return {
            open: 0,
            close: 0,
            high: 0,
            low: 0,
            average: 0,
            change: 0,
            changePercent: 0,
        };
    }

    const prices = history.map(h => h.price);
    const open = prices[0];
    const close = prices[prices.length - 1];
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const change = close - open;
    const changePercent = open > 0 ? ((close - open) / open) * 100 : 0;

    return {
        open,
        close,
        high,
        low,
        average,
        change,
        changePercent,
    };
}

// Format currency for display
export function formatStockPrice(price: number): string {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
