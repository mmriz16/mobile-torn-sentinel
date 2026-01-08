export interface ItemStats {
    damage?: number;
    accuracy?: number;
    armor_rating?: number;
    effect?: string;
    requirement?: string;
    coverage?: Record<string, number>; // Untuk armor (Head: 50, Chest: 100, dst)
}

export interface TornItem {
    id: number;
    name: string;
    description: string;
    type: string;
    weapon_type?: string;
    buy_price: number;
    market_value: number;
    image_url: string;
    stats: ItemStats; // Ini hasil mapping dari JSONB
}