export interface TornItem {
    id: number;
    name: string;
    description: string;
    type: string;
    weapon_type?: string;
    buy_price: number;
    market_value: number;
    image_url: string;

    // --- BAGIAN INI DULU ADA DI DALAM 'stats', SEKARANG SEJAJAR ---
    damage: number | null;        // Pakai null karena di DB bisa NULL
    accuracy: number | null;
    armor_rating: number | null;
    fire_rate: number | null;     // Saya tambahkan karena ada di JSON sebelumnya
    effect: string | null;
    requirement: string | null;

    // Coverage biasanya tetap JSONB di database, jadi di TS tetap Object
    coverage: Record<string, number> | null;
}