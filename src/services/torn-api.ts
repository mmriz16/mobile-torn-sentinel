import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { TornItem } from "../types/item";

const TORN_API_V2_BASE = "https://api.torn.com/v2";

// API Request Tracking
let apiRequestsCount = 0;
let apiRequestsStartTimestamp = Date.now();

function trackApiRequest() {
    const now = Date.now();
    if (now - apiRequestsStartTimestamp > 60000) {
        // Reset every minute
        apiRequestsCount = 1;
        apiRequestsStartTimestamp = now;
    } else {
        apiRequestsCount++;
    }
}

export function getApiRequestCount(): number {
    // If more than a minute has passed since last request, count is stale, return 0
    if (Date.now() - apiRequestsStartTimestamp > 60000) {
        return 0;
    }
    return apiRequestsCount;
}

// Get API key from storage
export async function getApiKey(): Promise<string | null> {
    if (Platform.OS === "web") {
        return localStorage.getItem("tornApiKey");
    }
    return SecureStore.getItemAsync("tornApiKey");
}

// Types for API responses
export interface TornBars {
    energy: { current: number; maximum: number; increment: number; interval: number; tick_time: number; full_time: number };
    nerve: { current: number; maximum: number; increment: number; interval: number; tick_time: number; full_time: number };
    happy: { current: number; maximum: number; increment: number; interval: number; tick_time: number; full_time: number };
    life: { current: number; maximum: number; increment: number; interval: number; tick_time: number; full_time: number };
    chain: { id: number; current: number; max: number; timeout: number; modifier: number; cooldown: number; start: number; end: number };
}

export interface TornProfile {
    id: number;
    name: string;
    level: number;
    rank: string;
    title: string;
    age: number;
    property: { id: number; name: string } | null;
    life: { current: number; maximum: number };
    status: { description: string; details: string | null; state: string; color: string; until: number | null };
}

export interface TornMoney {
    points: number;
    wallet: number;
    company: number;
    vault: number;
    cayman_bank: number;
    city_bank: number | null;
    faction: number | null;
    daily_networth: number;
}

export interface TornProperty {
    property: { id: number; name: string };
    status: string; // 'rented', 'owned', etc.
    rental_period_remaining: number; // Days remaining
}

export interface TornCooldowns {
    drug: number;
    medical: number;
    booster: number;
    jail: number;
}

export interface TornEducation {
    complete: number[];
    current: { id: number; until: number } | null;
}

export interface TornTravel {
    destination: string;
    method: string;
    departed_at: number;
    arrival_at: number;
    time_left: number;
}

export interface TornUserData {
    profile: TornProfile;
    bars: TornBars;
    cooldowns: TornCooldowns;
    education: TornEducation;
    travel: TornTravel | null;
    money: TornMoney;
    property: TornProperty;
}

export interface TornNetworth {
    personalstats: {
        networth: {
            total: number;
            wallet: number;
            vaults: number;
            bank: number;
            overseas_bank: number;
            points: number;
            inventory: number;
            display_case: number;
            bazaar: number;
            item_market: number;
            property: number;
            stock_market: number;
            auction_house: number;
            bookie: number;
            company: number;
            enlisted_cars: number;
            piggy_bank: number;
            pending: number;
            loans: number;
            unpaid_fees: number;
            trade: number;  // Trade value
        };
    };
}

// Networth cache
let networthCache: TornNetworth | null = null;

export function getNetworthCache(): TornNetworth | null {
    return networthCache;
}

export interface TornDrugStats {
    personalstats: {
        drugs: {
            cannabis: number;
            ecstasy: number;
            ketamine: number;
            lsd: number;
            opium: number;
            pcp: number;
            shrooms: number;
            speed: number;
            vicodin: number;
            xanax: number;
            total: number;
            overdoses: number;

        };
    };
}

// Faction member status
export interface FactionMemberStatus {
    description: string;
    details: string;
    state: 'Okay' | 'Traveling' | 'Abroad' | 'Hospital' | 'Jail' | 'Federal';
    color: 'green' | 'blue' | 'red';
    until: number;
}

// Faction member
export interface FactionMember {
    id: number;
    name: string;
    level: number;
    days_in_faction: number;
    last_action: { status: string; timestamp: number; relative: string };
    status: FactionMemberStatus;
    position: string;
}

// Faction rank
export interface FactionRank {
    level: number;
    name: string;
    division: number;
    position: number;
    wins: number;
}

// Faction basic data
export interface FactionBasicData {
    ID: number;
    name: string;
    tag: string;
    tag_image: string;
    leader: number;
    'co-leader': number;
    respect: number;
    age: number;
    capacity: number;
    best_chain: number;
    rank: FactionRank;
    members: Record<string, FactionMember>;
    peace: Record<string, number>;
    rank_wars?: Record<string, any>; // Add these as optional or record
    campus_wars?: Record<string, any>;
    territory_wars: Record<string, any>;
    raid_wars: Record<string, any>;
}

// Ranked war faction
export interface RankedWarFaction {
    id: number;
    name: string;
    score: number;
    chain: number;
}

// Ranked war
export interface RankedWar {
    id: number;
    start: number;
    end: number;
    target: number;
    winner: number;
    factions: RankedWarFaction[];
}

// Ranked wars response
export interface RankedWarsResponse {
    rankedwars: RankedWar[];
}

// Fetch drug stats
export async function fetchDrugStats(playerId: number): Promise<TornDrugStats | null> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        trackApiRequest();
        const response = await fetch(
            `${TORN_API_V2_BASE}/user/${playerId}/personalstats?cat=drugs&key=${apiKey}`,
            { signal: controller.signal, cache: 'no-store' }
        );
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.error) {
            console.error("Torn API error:", data.error);
            return null;
        }

        return data as TornDrugStats;
    } catch (error) {
        console.error("Failed to fetch drug stats:", error);
        return null;
    }
}

// Fetch user data (profile, bars, cooldowns, education, travel)
export async function fetchUserData(): Promise<TornUserData | null> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        trackApiRequest();
        trackApiRequest();
        const response = await fetch(
            `${TORN_API_V2_BASE}/user?selections=profile,bars,cooldowns,education,travel,money,property&key=${apiKey}`,
            { signal: controller.signal, cache: 'no-store' }
        );
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.error) {
            console.error("Torn API error:", data.error);
            return null;
        }

        return data as TornUserData;
    } catch (error) {
        console.error("Failed to fetch user data:", error);
        return null;
    }
}

// Fetch networth data using API v1 (may have different cache timing)
export async function fetchNetworth(): Promise<TornNetworth | null> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        trackApiRequest();
        // Using API v1 user/networth instead of v2 personalstats
        const response = await fetch(
            `https://api.torn.com/user/?selections=networth&key=${apiKey}`,
            { signal: controller.signal, cache: 'no-store' }
        );
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.error) {
            console.error("Torn API error:", data.error);
            return null;
        }

        // Transform v1 response to match our TornNetworth interface
        // v1 returns: { networth: { ... }, timestamp: ... }
        // We need: { personalstats: { networth: { ... } } }
        if (data.networth) {
            const transformed: TornNetworth = {
                personalstats: {
                    networth: {
                        total: data.networth.total || 0,
                        wallet: data.networth.wallet || 0,
                        vaults: data.networth.vault || 0,  // v1 uses 'vault', not 'vaults'
                        bank: data.networth.bank || 0,
                        overseas_bank: data.networth.cayman || 0,
                        points: data.networth.points || 0,
                        inventory: data.networth.items || 0,  // v1 uses 'items', not 'inventory'
                        display_case: data.networth.displaycase || 0,
                        bazaar: data.networth.bazaar || 0,
                        item_market: data.networth.itemmarket || 0,
                        property: data.networth.properties || 0,  // v1 uses 'properties', not 'property'
                        stock_market: data.networth.stockmarket || 0,
                        auction_house: data.networth.auctionhouse || 0,
                        bookie: data.networth.bookie || 0,
                        company: data.networth.company || 0,
                        enlisted_cars: data.networth.enlistedcars || 0,
                        piggy_bank: data.networth.piggybank || 0,
                        pending: data.networth.pending || 0,
                        loans: data.networth.loan || 0,
                        unpaid_fees: data.networth.unpaidfees || 0,
                        trade: data.networth.trade || 0,
                    }
                }
            };
            networthCache = transformed;
            return transformed;
        }

        return null;
    } catch (error) {
        console.error("Failed to fetch networth:", error);
        return null;
    }
}

// Fetch faction basic data
export async function fetchFactionBasic(factionId?: number): Promise<FactionBasicData | null> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        trackApiRequest();
        // If factionId is provided, use it, otherwise uses the user's faction via key? 
        // Actually /faction/ endpoint defaults to user's faction if no ID provided.
        // But the user example URL was `https://api.torn.com/faction/?selections=basic` which implies no ID specific but maybe the user's own.
        // Let's stick to the URL provided in the prompt.

        let url = `https://api.torn.com/faction/`;
        if (factionId) {
            url += `${factionId}`;
        }
        url += `?selections=basic&key=${apiKey}`;

        const response = await fetch(
            url,
            { signal: controller.signal, cache: 'no-store' }
        );
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.error) {
            console.error("Torn API error:", data.error);
            return null;
        }

        return data as FactionBasicData;
    } catch (error) {
        console.error("Failed to fetch faction data:", error);
        return null;
    }
}

// Fetch ranked wars
export async function fetchRankedWars(factionId?: number): Promise<RankedWarsResponse | null> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        trackApiRequest();
        // User provided: https://api.torn.com/v2/faction/rankedwars?offset=0&limit=20&sort=DESC

        // V2 endpoint usually requires /{id}/ if looking for specific, or maybe it infers from key.
        // Documentation says /v2/faction/rankedwars lists all ranked wars if no ID? 
        // Wait, the user request says "mappingkan data... dari api ini ... https://api.torn.com/faction/?selections=basic ... https://api.torn.com/v2/faction/rankedwars?offset=0&limit=20&sort=DESC"
        // The second URL looks like a generic RW list or maybe filtered by user's faction if authenticated? 
        // Actually /v2/faction/rankedwars returns *global* ranked wars usually or maybe the user meant /v2/faction/{id}/rankedwars?
        // Let's assume the user wants the specific URL they gave.
        // But typically we want OUR faction's wars. 
        // The example data provided shows "We Are Rising II" (ID 51896) in every entry. So it must be filtered or user's faction wars.
        // I will use /v2/faction/rankedwars and assume it contextually returns relevant ones or use the ID if I can.
        // BUT V2 often requires ID in path like /v2/faction/{id}/rankedwars. 
        // Let's check the user provided URL again: `https://api.torn.com/v2/faction/rankedwars...` 
        // It does NOT have an ID.
        // I will stick to what the user provided.

        const response = await fetch(
            `${TORN_API_V2_BASE}/faction/rankedwars?offset=0&limit=20&sort=DESC&key=${apiKey}`,
            { signal: controller.signal, cache: 'no-store' }
        );
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.error) {
            console.error("Torn API error:", data.error);
            return null;
        }

        return data as RankedWarsResponse;
    } catch (error) {
        console.error("Failed to fetch ranked wars:", error);
        return null;
    }
}

// Format time remaining (seconds to HH:MM:SS)
export function formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return "Ready";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Format faction member status (e.g. "Traveling to UAE" -> "TO UAE")
export function formatFactionStatus(status: FactionMemberStatus): string {
    if (status.state === 'Okay') return 'OKAY';

    // Check for travel states
    if (['Traveling', 'Abroad'].includes(status.state)) {
        let desc = status.description;

        // Handle specific return case
        if (desc.includes('Returning to Torn')) return 'TO TORN';

        // Standard replacements
        desc = desc.replace(/^Traveling to /i, 'TO ');
        desc = desc.replace(/^In /i, 'IN ');

        // Country shortcuts
        desc = desc.replace(/United Arab Emirates/i, 'UAE');
        desc = desc.replace(/United Kingdom/i, 'UK');
        desc = desc.replace(/South Africa/i, 'SA');
        desc = desc.replace(/Cayman Islands/i, 'CAYMAN');

        return desc.toUpperCase();
    }

    return status.description;
}

// Format large numbers with commas
export function formatNumber(num: number): string {
    return num.toLocaleString("en-US");
}

// Format currency
export function formatCurrency(num: number): string {
    return "$" + formatNumber(num);
}

// Get Monday of current week (00:00:00 device time) as Unix timestamp (seconds)
export function getCurrentWeekMondayTimestamp(): number {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust so Monday = 0
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return Math.floor(monday.getTime() / 1000); // Convert to Unix timestamp (seconds)
}

// Fetch xanax taken at a specific timestamp (uses Torn API v1)
async function fetchXanaxAtTimestamp(timestamp?: number): Promise<number | null> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        let url = `https://api.torn.com/user/?selections=personalstats&stat=xantaken&key=${apiKey}`;
        if (timestamp) {
            url += `&timestamp=${timestamp}`;
        }

        trackApiRequest();
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.error) {
            console.error("Torn API error:", data.error);
            return null;
        }

        return data.personalstats?.xantaken ?? 0;
    } catch (error) {
        console.error("Failed to fetch xanax stats:", error);
        return null;
    }
}

// Fetch weekly xanax usage (Monday to now)
export async function fetchWeeklyXanaxUsage(): Promise<number> {
    const mondayTimestamp = getCurrentWeekMondayTimestamp();

    // Fetch xanax count at start of week (Monday 00:00)
    const mondayXanax = await fetchXanaxAtTimestamp(mondayTimestamp);

    // Fetch current xanax count
    const currentXanax = await fetchXanaxAtTimestamp();

    if (mondayXanax === null || currentXanax === null) {
        return 0;
    }

    return Math.max(0, currentXanax - mondayXanax);
}
// Education courses cache
let educationCoursesCache: Record<string, string> | null = null;

export async function fetchEducationCourses(): Promise<Record<string, string> | null> {
    if (educationCoursesCache) return educationCoursesCache;

    try {
        const apiKey = await getApiKey();
        if (!apiKey) return null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        trackApiRequest();
        const response = await fetch(
            `${TORN_API_V2_BASE}/torn?selections=education&key=${apiKey}`,
            { signal: controller.signal, cache: 'no-store' }
        );
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.error) {
            console.error("Torn API error:", data.error);
            return null;
        }

        // Transform to ID -> "Category: Course Name" map
        const courses: Record<string, string> = {};

        if (data.education && Array.isArray(data.education)) {
            // New structure: education[] is an array of categories
            // Each category has: id, name (category name), courses[]
            // Each course has: id, name (course name)
            for (const category of data.education) {
                const categoryName = category.name || 'Unknown';
                if (category.courses && Array.isArray(category.courses)) {
                    for (const course of category.courses) {
                        if (course.id && course.name) {
                            courses[String(course.id)] = `${categoryName}: ${course.name}`;
                        }
                    }
                }
            }
        }

        educationCoursesCache = courses;
        return courses;

    } catch (error) {
        console.error("Failed to fetch education courses:", error);
        return null;
    }
}

// Battle Stats types and fetch function
export interface TornBattleStats {
    strength: number;
    defense: number;
    speed: number;
    dexterity: number;
    total: number;
}

export async function fetchBattleStats(): Promise<TornBattleStats | null> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) {
            console.error("No API key found");
            return null;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        trackApiRequest();
        const response = await fetch(
            `${TORN_API_V2_BASE}/user/battlestats?key=${apiKey}`,
            { signal: controller.signal, cache: 'no-store' }
        );
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.error) {
            console.error("Torn API error:", data.error);
            return null;
        }

        // Handle nested structure from API v2
        // API returns: { battlestats: { strength: { value, modifier, modifiers }, ... , total } }
        const stats = data.battlestats || data;

        return {
            strength: stats.strength?.value || stats.strength || 0,
            defense: stats.defense?.value || stats.defense || 0,
            speed: stats.speed?.value || stats.speed || 0,
            dexterity: stats.dexterity?.value || stats.dexterity || 0,
            total: stats.total || 0
        } as TornBattleStats;
    } catch (error) {
        console.error("Failed to fetch battle stats:", error);
        return null;
    }
}

// Fetch active gym ID
export async function fetchActiveGym(): Promise<number | null> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        trackApiRequest();
        // Using API v1 with gym selection
        const response = await fetch(
            `https://api.torn.com/user/?selections=gym&key=${apiKey}`,
            { signal: controller.signal, cache: 'no-store' }
        );
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.error) {
            console.error("Torn API error:", data.error);
            return null;
        }

        return data.active_gym || null;
    } catch (error) {
        console.error("Failed to fetch active gym:", error);
        return null;
    }
}

// Perks interface
export interface TornPerks {
    faction_perks: string[];
    job_perks: string[];
    property_perks: string[];
    education_perks: string[];
    enhancer_perks: string[];
    book_perks: string[];
    stock_perks: string[];
    merit_perks: string[];
}

/**
 * Parse gym gains percentage from perk string.
 * Examples: "+ 2% gym gains", "+ 3% gym gains"
 * Returns the percentage as decimal (e.g., 0.02 for 2%)
 */
function parseGymGainsPerk(perk: string): number {
    const match = perk.match(/\+\s*(\d+(?:\.\d+)?)\s*%\s*gym\s*gains/i);
    if (match) {
        return parseFloat(match[1]) / 100;
    }
    return 0;
}

/**
 * Fetch all perks and calculate total gym gains modifier.
 * Returns the modifier M (e.g., 1.02 for 2% bonus)
 */
export async function fetchGymModifier(): Promise<number> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return 1;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        trackApiRequest();
        const response = await fetch(
            `https://api.torn.com/user/?selections=&key=${apiKey}`,
            { signal: controller.signal, cache: 'no-store' }
        );
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.error) {
            console.error("Torn API error:", data.error);
            return 1;
        }

        // Collect all perks arrays
        const allPerks: string[] = [
            ...(data.faction_perks || []),
            ...(data.job_perks || []),
            ...(data.property_perks || []),
            ...(data.education_perks || []),
            ...(data.enhancer_perks || []),
            ...(data.book_perks || []),
            ...(data.stock_perks || []),
            ...(data.merit_perks || []),
        ];

        // Parse gym gains percentages and calculate modifier
        // Using multiplication: M = (1 + p1) * (1 + p2) * ...
        let modifier = 1;
        for (const perk of allPerks) {
            const gymGains = parseGymGainsPerk(perk);
            if (gymGains > 0) {
                modifier *= (1 + gymGains);
            }
        }

        return modifier;
    } catch (error) {
        console.error("Failed to fetch perks:", error);
        return 1;
    }
}

// Item details interface
export interface TornItemEffect {
    effect: string;
    value: number;
}

export type { TornItem };

// Item market listing
export interface ItemMarketListing {
    cost: number;
    quantity: number;
}

/**
 * Fetch item details from Torn API (for effects)
 * Returns a map of itemId -> item details
 */
export async function fetchItemDetails(itemIds: number[]): Promise<Record<number, TornItem>> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return {};

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        trackApiRequest();
        const response = await fetch(
            `https://api.torn.com/torn/?selections=items&key=${apiKey}`,
            { signal: controller.signal, cache: 'no-store' }
        );
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.error) {
            console.error("Torn API error:", data.error);
            return {};
        }

        // Filter to only requested item IDs
        const items: Record<number, TornItem> = {};
        if (data.items) {
            for (const itemId of itemIds) {
                const item = data.items[String(itemId)];
                if (item) {
                    items[itemId] = {
                        id: itemId,
                        name: item.name,
                        description: item.description,
                        type: item.type,
                        market_value: item.market_value,
                        buy_price: item.buy_price || 0,
                        image_url: item.image || '',
                        effect: item.effect,
                        damage: item.damage,
                        accuracy: item.accuracy,
                        armor_rating: item.armor,
                        requirement: item.requirement,
                        coverage: item.coverage,
                        fire_rate: item.fire_rate || item.firerate || null
                    };
                }
            }
        }

        return items;
    } catch (error) {
        console.error("Failed to fetch item details:", error);
        return {};
    }
}

/**
 * Fetch lowest market price for a single item
 */
async function fetchSingleItemMarketPrice(itemId: number): Promise<number | null> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        trackApiRequest();
        const url = `${TORN_API_V2_BASE}/market/${itemId}/itemmarket?key=${apiKey}`;

        const response = await fetch(
            url,
            { signal: controller.signal, cache: 'no-store' }
        );
        clearTimeout(timeoutId);

        const data = await response.json();
        const listings = data?.itemmarket?.listings || [];

        if (data.error) {
            console.error("Torn API error:", data.error);
            return null;
        }

        // Get lowest price from listings
        if (listings.length > 0) {
            // Sort by price and return lowest
            // Note: API v2 uses 'price' instead of 'cost' in listings
            const sorted = listings.sort((a: any, b: any) => a.price - b.price);
            const lowestPrice = sorted[0].price;
            console.log(`Lowest price for ${itemId}:`, lowestPrice);
            return lowestPrice;
        }

        return null;
    } catch (error) {
        console.error(`Failed to fetch market price for item ${itemId}:`, error);
        return null;
    }
}

/**
 * Fetch lowest market prices for multiple items
 * Returns a map of itemId -> lowest price
 */
export async function fetchItemMarketPrices(itemIds: number[]): Promise<Record<number, number>> {
    const prices: Record<number, number> = {};

    // Fetch prices in parallel
    const pricePromises = itemIds.map(async (itemId) => {
        const price = await fetchSingleItemMarketPrice(itemId);
        if (price !== null) {
            prices[itemId] = price;
        }
    });

    await Promise.all(pricePromises);
    return prices;
}
