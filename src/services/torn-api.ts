import AsyncStorage from '@react-native-async-storage/async-storage';
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
    // Debug spam
    console.log(`[API] Request #${apiRequestsCount} at ${new Date().toISOString()}`);
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
        try {
            return localStorage.getItem("tornApiKey");
        } catch (error) {
            console.warn("localStorage not available:", error);
            return null;
        }
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
    city_bank: { amount: number; time_left: number } | number | null;
    city_bank_time_left: number | null;
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
// Networth cache is now part of apiCache
// Legacy getter removed as it's not used externally or should use apiCache
// If external usage exists, we can map it to apiCache.networth?.data
export function getNetworthCache(): TornNetworth | null {
    // This assumes memory cache is populated. 
    // If called before any fetch, it might return null until hydration/fetch happens.
    return apiCache.networth?.data || null;
}

// Bank rates interface
export interface TornBankRates {
    "1w": number;
    "2w": number;
    "1m": number;
    "2m": number;
    "3m": number;
}

// Cache for bank rates (refresh every 1 hour)
// Cache for bank rates (1 hour TTL)
const BANK_RATES_CACHE_DURATION = 60 * 60 * 1000;

// Fetch bank interest rates
export async function fetchBankRates(): Promise<TornBankRates | null> {
    try {
        const cached = await getCache<TornBankRates>('bankRates');
        if (cached) return cached;

        const apiKey = await getApiKey();
        if (!apiKey) return null;

        trackApiRequest();
        const response = await fetch(`https://api.torn.com/torn/?selections=bank&key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            console.error("Torn API error (bank rates):", data.error);
            return null;
        }

        setCache('bankRates', data.bank, BANK_RATES_CACHE_DURATION);
        return data.bank;
    } catch (error) {
        console.error("Failed to fetch bank rates:", error);
        return null;
    }
}

// City Bank investment details (from V1 API)
export interface TornCityBankDetails {
    amount: number;
    time_left: number;
}

// Fetch city bank investment details (V1 API for time_left)
export async function fetchCityBankDetails(): Promise<TornCityBankDetails | null> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return null;

        // Try cache first
        const cached = await getCache<{ amount: number; time_left: number }>('cityBank');
        if (cached) return cached;

        trackApiRequest();
        const response = await fetch(`https://api.torn.com/user/?selections=money&key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            console.error("Torn API error (city bank):", data.error);
            return null;
        }

        // V1 returns city_bank as object {amount, time_left}
        if (data.city_bank && typeof data.city_bank === 'object') {
            const result = {
                amount: data.city_bank.amount || 0,
                time_left: data.city_bank.time_left || 0
            };
            setCache('cityBank', result, 60 * 1000);
            return result;
        }

        return null;
    } catch (error) {
        console.error("Failed to fetch city bank details:", error);
        return null;
    }
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
        // Cache key based on player ID? Assumes only current user for now or single user app
        const cached = await getCache<TornDrugStats>('drugStats');
        if (cached) return cached;

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

        setCache('drugStats', data as TornDrugStats, 5 * 60 * 1000); // 5 min cache
        return data as TornDrugStats;
    } catch (error) {
        console.error("Failed to fetch drug stats:", error);
        return null;
    }
}

// Combined fetch for user data + networth (OPTIMIZED: 2 parallel API calls instead of 2 sequential)
export interface CombinedUserData {
    userData: TornUserData | null;
    networth: TornNetworth | null;
}

export async function fetchUserDataWithNetworth(): Promise<CombinedUserData> {
    try {
        console.log("[TornAPI] fetchUserDataWithNetworth started");

        // 1. Check Cache (Parallel & Before API Key)
        const [cachedUser, cachedNetworth] = await Promise.all([
            getCache<TornUserData>('userData'),
            getCache<TornNetworth>('networth')
        ]);

        const result: CombinedUserData = {
            userData: cachedUser,
            networth: cachedNetworth
        };

        // If both cached, return early
        if (cachedUser && cachedNetworth) {
            console.log("[TornAPI] Cache hit for user and networth");
            return result;
        }

        const apiKey = await getApiKey();
        if (!apiKey) {
            console.log("[TornAPI] No API key found");
            return result;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const apiCalls: Promise<Response>[] = [];
        const callTypes: string[] = [];

        // Fetch User Data if missing
        if (!cachedUser) {
            trackApiRequest();
            apiCalls.push(fetch(
                `${TORN_API_V2_BASE}/user?selections=profile,bars,cooldowns,education,travel,money,property&key=${apiKey}`,
                { signal: controller.signal, cache: 'no-store' }
            ));
            callTypes.push('user');
        }

        // Fetch Networth if missing
        if (!cachedNetworth) {
            trackApiRequest();
            apiCalls.push(fetch(
                `https://api.torn.com/user/?selections=networth,money&key=${apiKey}`,
                { signal: controller.signal, cache: 'no-store' }
            ));
            callTypes.push('networth');
        }

        const responses = await Promise.all(apiCalls);
        clearTimeout(timeoutId);

        const jsonPromises = responses.map(r => r.json());
        const dataArray = await Promise.all(jsonPromises);

        for (let i = 0; i < callTypes.length; i++) {
            const data = dataArray[i];
            const type = callTypes[i];

            if (data.error) {
                console.error(`Torn API error (${type}):`, data.error);
                continue;
            }

            if (type === 'user') {
                const userData = data as TornUserData;
                result.userData = userData;
                setCache('userData', userData, 10 * 1000); // 10s TTL
            } else if (type === 'networth') {
                // Process networth data (V1 format - needs transformation)
                const networthData = data;
                if (networthData.networth) {
                    const transformed: TornNetworth = {
                        personalstats: {
                            networth: {
                                total: networthData.networth.total || 0,
                                wallet: networthData.networth.wallet || 0,
                                vaults: networthData.networth.vault || 0,
                                bank: networthData.networth.bank || 0,
                                overseas_bank: networthData.networth.cayman || 0,
                                points: networthData.networth.points || 0,
                                inventory: networthData.networth.items || 0,
                                display_case: networthData.networth.displaycase || 0,
                                bazaar: networthData.networth.bazaar || 0,
                                item_market: networthData.networth.itemmarket || 0,
                                property: networthData.networth.properties || 0,
                                stock_market: networthData.networth.stockmarket || 0,
                                auction_house: networthData.networth.auctionhouse || 0,
                                bookie: networthData.networth.bookie || 0,
                                company: networthData.networth.company || 0,
                                enlisted_cars: networthData.networth.enlistedcars || 0,
                                piggy_bank: networthData.networth.piggybank || 0,
                                pending: networthData.networth.pending || 0,
                                loans: networthData.networth.loan || 0,
                                unpaid_fees: networthData.networth.unpaidfees || 0,
                                trade: networthData.networth.trade || 0,
                            }
                        }
                    };
                    result.networth = transformed;
                    setCache('networth', transformed, 60 * 1000); // 60s TTL

                    if (networthData.city_bank && typeof networthData.city_bank === 'object') {
                        const cbData = {
                            amount: networthData.city_bank.amount || 0,
                            time_left: networthData.city_bank.time_left || 0
                        };
                        setCache('cityBank', cbData, 60 * 1000); // 60s TTL matches networth

                        // Patch user data immediately if available
                        if (result.userData && result.userData.money) {
                            result.userData.money.city_bank = cbData;
                        }
                    }
                }
            }
        }

        // Final Patch: Ensure userData has city_bank info if we have it in cache
        // This covers the case where we fetched UserData (V2) but Networth was cached (V1 not fetched)
        // or just restored from cache.
        if (result.userData && result.userData.money) {
            // Check if current userData has incomplete city_bank (V2 provides amount but often no time_left?)
            // Actually V2 money.city_bank might be number or object. 
            // If it's missing or lacks time_left, try to patch from cityBank cache.
            const currentCB = result.userData.money.city_bank;
            const isComplete = typeof currentCB === 'object' && currentCB !== null && 'time_left' in currentCB;

            if (!isComplete) {
                const cachedCB = await getCache<{ amount: number; time_left: number }>('cityBank');
                if (cachedCB) {
                    result.userData.money.city_bank = cachedCB;
                }
            }
        }

        // Final patch attempt if we have both objects
        // If we fetched user but got networth from cache, or vice versa.
        // V1 Networth call includes city_bank time_left. V2 User call includes city_bank amount but not time_left.
        // If we have networth data (fresh or cached), we might want to patch result.userData.
        // However, accessing the RAW cached networth response (with city_bank) is hard if we only cached the Transformed object.
        // Limitation: Transformed Networth object does NOT keep city_bank info. 
        // So we only patch if we JUST fetched Networth.

        return result;
    } catch (error) {
        console.error("Failed to fetch combined user data:", error);
        return { userData: null, networth: null };
    }
}

// Fetch user data (profile, bars, cooldowns, education, travel) - Legacy function, prefer fetchUserDataWithNetworth
export async function fetchUserData(): Promise<TornUserData | null> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

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

// Fetch only user bars (lightweight for high-frequency polling)
export async function fetchUserBars(): Promise<TornBars | null> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        trackApiRequest();
        const response = await fetch(
            `${TORN_API_V2_BASE}/user?selections=bars&key=${apiKey}&timestamp=${Date.now()}`,
            { signal: controller.signal, cache: 'no-store' }
        );
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.error) {
            console.error("Torn API error:", data.error);
            return null;
        }

        return data.bars as TornBars;
    } catch (error) {
        console.error("Failed to fetch user bars:", error);
        return null;
    }
}

// Fetch networth data using API v1 (may have different cache timing)
// Fetch networth data using API v1 (may have different cache timing)
export async function fetchNetworth(): Promise<TornNetworth | null> {
    try {
        const cached = await getCache<TornNetworth>('networth');
        if (cached) return cached;

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
            setCache('networth', transformed, 60 * 1000); // 60s TTL
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
        // User provided: https://api.torn.com/v2/faction/rankedwars
        // V2 Endpoint returns an array of ranked wars directly, which matches our interface.

        const response = await fetch(
            `${TORN_API_V2_BASE}/faction/rankedwars?limit=20&sort=DESC&key=${apiKey}`,
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

    // Ensure we're working with integers to avoid floating point display issues
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);

    if (hours > 0) {
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Format time detailed (e.g. "02:08:23:52")
export function formatTimeDetailed(seconds: number): string {
    if (seconds <= 0) return "00:00:00:00";

    const totalSeconds = Math.floor(seconds);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);

    const dd = days.toString().padStart(2, "0");
    const hh = hours.toString().padStart(2, "0");
    const mm = minutes.toString().padStart(2, "0");
    const ss = secs.toString().padStart(2, "0");

    return `${dd}:${hh}:${mm}:${ss}`;
}

// Combined Faction + User Data (OPTIMIZED: 2 API calls instead of 3)
export interface FactionDataCombined {
    factionBasic: FactionBasicData | null;
    rankedWars: RankedWarsResponse | null;
    userData: TornUserData | null;
}

// Cache for combined faction data
// Legacy cache variables removed - using apiCache
// let factionDataCache: FactionDataCombined | null = null;
// let factionDataCacheTime: number = 0;
// const FACTION_DATA_CACHE_DURATION = 30 * 1000; // 30 seconds

export async function fetchFactionDataCombined(forceRefresh = false): Promise<FactionDataCombined> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return { factionBasic: null, rankedWars: null, userData: null };

        // 1. Check Cache
        const cachedUser = await getCache<TornUserData>('userData');
        const cachedFaction = await getCache<FactionBasicData>('factionBasic');
        const cachedWars = await getCache<RankedWarsResponse>('rankedWars');

        const result: FactionDataCombined = {
            factionBasic: cachedFaction,
            rankedWars: cachedWars,
            userData: cachedUser
        };

        if (!forceRefresh && cachedUser && cachedFaction && cachedWars) {
            return result;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const apiCalls: Promise<Response>[] = [];
        const callTypes: string[] = [];

        // Faction Basic (Refresh if missing or forced)
        if (forceRefresh || !cachedFaction) {
            trackApiRequest();
            apiCalls.push(fetch(`https://api.torn.com/faction/?selections=basic&key=${apiKey}`, { signal: controller.signal, cache: 'no-store' }));
            callTypes.push('faction');
        }

        // Ranked Wars (Refresh if missing or forced)
        if (forceRefresh || !cachedWars) {
            trackApiRequest();
            apiCalls.push(fetch(`${TORN_API_V2_BASE}/faction/rankedwars?limit=20&sort=DESC&key=${apiKey}`, { signal: controller.signal, cache: 'no-store' }));
            callTypes.push('wars');
        }

        // User Data (Refresh if missing or forced)
        if (forceRefresh || !cachedUser) {
            trackApiRequest();
            apiCalls.push(fetch(`${TORN_API_V2_BASE}/user?selections=profile,bars&key=${apiKey}`, { signal: controller.signal, cache: 'no-store' }));
            callTypes.push('user');
        }

        if (apiCalls.length === 0) {
            clearTimeout(timeoutId);
            return result;
        }

        const responses = await Promise.all(apiCalls);
        clearTimeout(timeoutId);

        const jsonPromises = responses.map(r => r.json());
        const dataArray = await Promise.all(jsonPromises);

        for (let i = 0; i < callTypes.length; i++) {
            const data = dataArray[i];
            const type = callTypes[i];

            if (data.error) {
                console.error(`Torn API error (${type}):`, data.error);
                continue;
            }

            if (type === 'faction') {
                const facData = data as FactionBasicData;
                result.factionBasic = facData;
                setCache('factionBasic', facData, 30 * 1000);
            } else if (type === 'wars') {
                const warsData = data as RankedWarsResponse;
                result.rankedWars = warsData;
                setCache('rankedWars', warsData, 30 * 1000);
            } else if (type === 'user') {
                const userData = data as TornUserData;
                result.userData = userData;
                setCache('userData', userData, 10 * 1000);
            }
        }

        return result;
    } catch (error) {
        console.error("Failed to fetch combined faction data:", error);
        return { factionBasic: null, rankedWars: null, userData: null };
    }
}

// Combined Faction + Ranked Wars (No User Data)
export interface FactionDataParallel {
    factionBasic: FactionBasicData | null;
    rankedWars: RankedWarsResponse | null;
}

export async function fetchFactionDataParallel(): Promise<FactionDataParallel> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return { factionBasic: null, rankedWars: null };

        // 1. Check Cache
        const cachedFaction = await getCache<FactionBasicData>('factionBasic');
        const cachedWars = await getCache<RankedWarsResponse>('rankedWars');

        const result: FactionDataParallel = {
            factionBasic: cachedFaction,
            rankedWars: cachedWars
        };

        if (cachedFaction && cachedWars) {
            return result;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const apiCalls: Promise<Response>[] = [];
        const callTypes: string[] = [];

        if (!cachedFaction) {
            trackApiRequest();
            apiCalls.push(fetch(`https://api.torn.com/faction/?selections=basic&key=${apiKey}`, { signal: controller.signal, cache: 'no-store' }));
            callTypes.push('faction');
        }

        if (!cachedWars) {
            trackApiRequest();
            apiCalls.push(fetch(`${TORN_API_V2_BASE}/faction/rankedwars?limit=20&sort=DESC&key=${apiKey}`, { signal: controller.signal, cache: 'no-store' }));
            callTypes.push('wars');
        }

        if (apiCalls.length === 0) {
            clearTimeout(timeoutId);
            return result;
        }

        const responses = await Promise.all(apiCalls);
        clearTimeout(timeoutId);

        const jsonPromises = responses.map(r => r.json());
        const dataArray = await Promise.all(jsonPromises);

        for (let i = 0; i < callTypes.length; i++) {
            const data = dataArray[i];
            const type = callTypes[i];

            if (data.error) {
                console.error(`Torn API error (${type}):`, data.error);
                continue;
            }

            if (type === 'faction') {
                const facData = data as FactionBasicData;
                result.factionBasic = facData;
                setCache('factionBasic', facData, 30 * 1000);
            } else if (type === 'wars') {
                const warsData = data as RankedWarsResponse;
                result.rankedWars = warsData;
                setCache('rankedWars', warsData, 30 * 1000);
            }
        }

        return result;
    } catch (error) {
        console.error("Failed to fetch parallel faction data:", error);
        return { factionBasic: null, rankedWars: null };
    }
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
        desc = desc.replace(/United Arab Emirates/i, 'United Arab Emirates');
        desc = desc.replace(/United Kingdom/i, 'United Kingdom');
        desc = desc.replace(/South Africa/i, 'South Africa');
        desc = desc.replace(/Cayman Islands/i, 'Cayman Islands');

        return desc.toUpperCase();
    }

    // Handle Hospital state
    if (status.state === 'Hospital') {
        const desc = status.description;
        // Check for specific hospital location (e.g., "In an Argentinian hospital for X mins")
        const locationMatch = desc.match(/In (?:a|an) (\w+) hospital/i);
        if (locationMatch) {
            return `IN ${locationMatch[1].toUpperCase()} HOSPITAL`;
        }
        return 'IN HOSPITAL';
    }

    // Handle Jail state
    if (status.state === 'Jail') {
        return 'IN JAIL';
    }

    // Handle Federal state
    if (status.state === 'Federal') {
        return 'IN FEDERAL';
    }

    let desc = status.description;

    // Handle Traveling state
    if (status.state === 'Traveling') {
        // "Traveling to Mexico" -> "TO MEXICO"
        // "Returning to Torn from Mexico" -> "TO TORN"
        if (desc.includes('Returning to Torn')) return 'TO TORN';
        desc = desc.replace(/^Traveling to /i, 'TO ');
    }

    // Handle Abroad state
    if (status.state === 'Abroad') {
        // "In Mexico" -> "IN MEXICO"
        desc = desc.replace(/^In /i, 'IN ');
    }

    return desc.toUpperCase();
}

// Format large numbers with commas
export function formatNumber(num: number): string {
    return num.toLocaleString("en-US");
}

// Format chain status with next milestone
export function formatChainStatus(current: number): string {
    const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
    const nextMilestone = MILESTONES.find(m => m > current) || 100000;
    return `${current.toLocaleString('en-US')}/${nextMilestone.toLocaleString('en-US')}`;
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

// Cache for Monday xanax count - doesn't change during the week
let mondayXanaxCache: { timestamp: number; value: number } | null = null;

// Fetch weekly xanax usage (Monday to now) - OPTIMIZED with caching
export async function fetchWeeklyXanaxUsage(): Promise<number> {
    const mondayTimestamp = getCurrentWeekMondayTimestamp();

    // Check if we have a valid cached Monday xanax count
    let mondayXanax: number | null = null;
    if (mondayXanaxCache && mondayXanaxCache.timestamp === mondayTimestamp) {
        // Cache is valid for this week
        mondayXanax = mondayXanaxCache.value;
    } else {
        // Fetch and cache Monday xanax count (1 API call, only once per week)
        mondayXanax = await fetchXanaxAtTimestamp(mondayTimestamp);
        if (mondayXanax !== null) {
            mondayXanaxCache = { timestamp: mondayTimestamp, value: mondayXanax };
        }
    }

    // Fetch current xanax count (1 API call every time)
    const currentXanax = await fetchXanaxAtTimestamp();

    if (mondayXanax === null || currentXanax === null) {
        return 0;
    }

    return Math.max(0, currentXanax - mondayXanax);
}
// Education courses cache
// Education courses cache
// let educationCoursesCache: Record<string, string> | null = null; // Legacy

export async function fetchEducationCourses(): Promise<Record<string, string> | null> {
    const cached = await getCache<Record<string, string>>('educationCourses');
    if (cached) return cached;

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

        setCache('educationCourses', courses, 24 * 60 * 60 * 1000); // 24 hour cache
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
        const cached = await getCache<TornBattleStats>('battleStats');
        if (cached) return cached;

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

        const result = {
            strength: stats.strength?.value || stats.strength || 0,
            defense: stats.defense?.value || stats.defense || 0,
            speed: stats.speed?.value || stats.speed || 0,
            dexterity: stats.dexterity?.value || stats.dexterity || 0,
            total: stats.total || 0
        } as TornBattleStats;

        setCache('battleStats', result, 10 * 60 * 1000); // 10 min cache
        return result;
    } catch (error) {
        console.error("Failed to fetch battle stats:", error);
        return null;
    }
}

// Fetch active gym ID
// Fetch active gym ID
export async function fetchActiveGym(): Promise<number | null> {
    try {
        const cached = await getCache<number>('activeGym');
        if (cached !== null) return cached;

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

        const activeGym = data.active_gym || null;
        if (activeGym !== null) {
            setCache('activeGym', activeGym, 5 * 60 * 1000);
        }
        return activeGym;
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

// =============================================================================
// OPTIMIZED COMBINED FETCH FUNCTIONS WITH CACHING
// =============================================================================

// Global cache with TTL
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // TTL in milliseconds
}

// In-memory cache for synchronous access (e.g., getters)
const apiCache: {
    battleStats?: CacheEntry<TornBattleStats>;
    activeGym?: CacheEntry<number>;
    gymModifier?: CacheEntry<number>;
    factionBasic?: CacheEntry<FactionBasicData>;
    perksData?: CacheEntry<string[]>;
    userData?: CacheEntry<TornUserData>;
    networth?: CacheEntry<TornNetworth>;
    rankedWars?: CacheEntry<RankedWarsResponse>;
    cityBank?: CacheEntry<{ amount: number; time_left: number }>;
    bankRates?: CacheEntry<TornBankRates>;
    drugStats?: CacheEntry<TornDrugStats>;
    educationCourses?: CacheEntry<Record<string, string>>;
    tornItems?: CacheEntry<Record<string, any>>;
    // We can add more if needed
} = {};

/**
 * Get data from cache (Memory -> AsyncStorage)
 */
async function getCache<T>(key: keyof typeof apiCache): Promise<T | null> {
    const memEntry = apiCache[key]; // Access via key strings to satisfy TS if needed, or cast
    // Check memory first
    if (memEntry && Date.now() - memEntry.timestamp < memEntry.ttl) {
        return memEntry.data as T;
    }

    // Check storage
    try {
        // Race AsyncStorage against a timeout to prevent hanging
        const timeoutPromise = new Promise<string | null>((resolve) => {
            setTimeout(() => resolve(null), 1000);
        });

        const json = await Promise.race([
            AsyncStorage.getItem(`api_cache_${key}`),
            timeoutPromise
        ]);

        if (json) {
            const entry = JSON.parse(json) as CacheEntry<T>;
            if (Date.now() - entry.timestamp < entry.ttl) {
                // Hydrate memory
                (apiCache as any)[key] = entry;
                return entry.data;
            } else {
                // Expired in storage
                AsyncStorage.removeItem(`api_cache_${key}`).catch(() => { });
            }
        }
    } catch (e) {
        console.warn(`Failed to read cache for ${key}`, e);
    }

    return null;
}

/**
 * Set data to cache (Memory + AsyncStorage)
 */
function setCache<T>(key: keyof typeof apiCache, data: T, ttl: number): void {
    const entry = { data, timestamp: Date.now(), ttl };

    // Update memory
    (apiCache as any)[key] = entry;

    // Update storage (fire and forget)
    AsyncStorage.setItem(`api_cache_${key}`, JSON.stringify(entry)).catch(e => {
        console.warn(`Failed to write cache for ${key}`, e);
    });
}

// Combined Gym Data (OPTIMIZED: 2-3 API calls instead of 4, with smart caching)

export function getCachedChainStatus(): { current: number; max: number; timeout: number; cooldown: number; start: number } | null {
    // Sync getter relies on memory cache
    const userData = apiCache.userData?.data;
    if (!userData?.bars?.chain) return null;
    return userData.bars.chain;
}
export interface GymDataCombined {
    battleStats: TornBattleStats | null;
    userData: TornUserData | null;
    activeGym: number | null;
    gymModifier: number;
}

export async function fetchGymDataCombined(): Promise<GymDataCombined> {
    const result: GymDataCombined = {
        battleStats: null,
        userData: null,
        activeGym: null,
        gymModifier: 1
    };

    try {
        const apiKey = await getApiKey();
        if (!apiKey) return result;

        // Check cache for gym modifier (rarely changes, 10 min TTL)
        const cachedModifier = await getCache<number>('gymModifier');

        // Check cache for active gym (rarely changes, 5 min TTL)
        const cachedGym = await getCache<number>('activeGym');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        // Use cached values if available
        if (cachedModifier !== null) {
            result.gymModifier = cachedModifier;
        }
        if (cachedGym !== null) {
            result.activeGym = cachedGym;
        }

        // Build API calls array - only fetch what we need
        const apiCalls: Promise<Response>[] = [];
        const callTypes: string[] = [];

        // Always fetch: V2 user data (for bars - proper format)
        trackApiRequest();
        apiCalls.push(fetch(
            `${TORN_API_V2_BASE}/user?selections=bars&key=${apiKey}`,
            { signal: controller.signal, cache: 'no-store' }
        ));
        callTypes.push('user');

        // Always fetch: V2 battle stats
        trackApiRequest();
        apiCalls.push(fetch(
            `${TORN_API_V2_BASE}/user/battlestats?key=${apiKey}`,
            { signal: controller.signal, cache: 'no-store' }
        ));
        callTypes.push('battlestats');

        // Only fetch gym/perks if not cached
        if (cachedModifier === null || cachedGym === null) {
            trackApiRequest();
            apiCalls.push(fetch(
                `https://api.torn.com/user/?selections=gym,perks&key=${apiKey}`,
                { signal: controller.signal, cache: 'no-store' }
            ));
            callTypes.push('gymperks');
        }

        const responses = await Promise.all(apiCalls);
        clearTimeout(timeoutId);

        const jsonPromises = responses.map(r => r.json());
        const dataArray = await Promise.all(jsonPromises);

        // Process responses
        for (let i = 0; i < callTypes.length; i++) {
            const data = dataArray[i];
            const type = callTypes[i];

            if (data.error) {
                console.error(`Torn API error (${type}):`, data.error);
                continue;
            }

            switch (type) {
                case 'user':
                    // V2 format - create minimal userData with bars
                    result.userData = {
                        profile: { id: 0, name: '', level: 0, rank: '', title: '', age: 0, property: null, life: data.bars?.life || { current: 0, maximum: 0 }, status: { description: '', details: null, state: 'Okay', color: 'green', until: null } },
                        bars: data.bars || {
                            energy: { current: 0, maximum: 0, increment: 0, interval: 0, tick_time: 0, full_time: 0 },
                            nerve: { current: 0, maximum: 0, increment: 0, interval: 0, tick_time: 0, full_time: 0 },
                            happy: { current: 0, maximum: 0, increment: 0, interval: 0, tick_time: 0, full_time: 0 },
                            life: { current: 0, maximum: 0, increment: 0, interval: 0, tick_time: 0, full_time: 0 },
                            chain: { id: 0, current: 0, max: 0, timeout: 0, modifier: 0, cooldown: 0, start: 0, end: 0 }
                        },
                        cooldowns: { drug: 0, medical: 0, booster: 0, jail: 0 },
                        education: { complete: [], current: null },
                        travel: null,
                        money: { points: 0, wallet: 0, company: 0, vault: 0, cayman_bank: 0, city_bank: null, city_bank_time_left: null, faction: null, daily_networth: 0 },
                        property: { property: { id: 0, name: 'None' }, status: 'owned', rental_period_remaining: 0 }
                    };
                    break;

                case 'battlestats':
                    const stats = data.battlestats || data;
                    result.battleStats = {
                        strength: stats.strength?.value || stats.strength || 0,
                        defense: stats.defense?.value || stats.defense || 0,
                        speed: stats.speed?.value || stats.speed || 0,
                        dexterity: stats.dexterity?.value || stats.dexterity || 0,
                        total: stats.total || 0
                    };
                    break;

                case 'gymperks':
                    // Active gym (cache for 5 min)
                    if (data.active_gym !== undefined) {
                        result.activeGym = data.active_gym;
                        setCache('activeGym', data.active_gym, 5 * 60 * 1000);
                    }

                    // Gym modifier from perks (cache for 10 min)
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
                    let modifier = 1;
                    for (const perk of allPerks) {
                        const gymGains = parseGymGainsPerk(perk);
                        if (gymGains > 0) {
                            modifier *= (1 + gymGains);
                        }
                    }
                    result.gymModifier = modifier;
                    setCache('gymModifier', modifier, 10 * 60 * 1000);
                    break;
            }
        }

        return result;
    } catch (error) {
        console.error("Failed to fetch combined gym data:", error);
        return result;
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
/**
 * Fetch item details from Torn API (for effects)
 * Returns a map of itemId -> item details
 * WARNING: 'selections=items' fetches the ENTIRE item database. Very expensive.
 * We MUST cache this aggressively.
 */
export async function fetchItemDetails(itemIds: number[]): Promise<Record<number, TornItem>> {
    try {
        // Try to get FULL item cache first
        // We use a special key 'tornItems' for the massive blob
        const cachedItems = await getCache<Record<string, any>>('tornItems');

        // Helper to extract needed IDs from source (whether cached or fresh)
        const extractItems = (sourceItems: Record<string, any>) => {
            const items: Record<number, TornItem> = {};
            for (const itemId of itemIds) {
                const item = sourceItems[String(itemId)];
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
            return items;
        }

        if (cachedItems) {
            return extractItems(cachedItems);
        }

        const apiKey = await getApiKey();
        if (!apiKey) return {};

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // Long timeout for big data

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

        // Cache the entire items blob for 24 hours
        if (data.items) {
            // 'tornItems' is not in apiCache struct yet, we need to cast or add it 
            setCache('tornItems' as any, data.items, 24 * 60 * 60 * 1000);
            return extractItems(data.items);
        }

        return {};
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
