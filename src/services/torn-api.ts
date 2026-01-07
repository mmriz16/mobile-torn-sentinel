import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

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
