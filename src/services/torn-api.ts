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

export interface TornCooldowns {
    drug: number;
    medical: number;
    booster: number;
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
}

export interface TornNetworth {
    personalstats: {
        networth: {
            total: number;
            wallet: number;
            bank: number;
            points: number;
            cayman: number;
            vault: number;
            piggybank: number;
            items: number;
            displaycase: number;
            bazaar: number;
            properties: number;
            stockmarket: number;
            auctionhouse: number;
            company: number;
            bookie: number;
            enlistedcars: number;
            pending: number;
            unpaidfees: number;
            loan: number;
        };
    };
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
            { signal: controller.signal }
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
        const response = await fetch(
            `${TORN_API_V2_BASE}/user?selections=profile,bars,cooldowns,education,travel&key=${apiKey}`,
            { signal: controller.signal }
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

// Fetch networth data
export async function fetchNetworth(playerId: number): Promise<TornNetworth | null> {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) return null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        trackApiRequest();
        const response = await fetch(
            `${TORN_API_V2_BASE}/user/${playerId}/personalstats?cat=networth&key=${apiKey}`,
            { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.error) {
            console.error("Torn API error:", data.error);
            return null;
        }

        return data as TornNetworth;
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
        const response = await fetch(url, { signal: controller.signal });
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
            { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.error) {
            console.error("Torn API error:", data.error);
            return null;
        }

        // Transform to ID -> Name map using recursive extraction
        // to handle POTENTIAL nested structure (e.g. Categories -> Courses)
        const courses: Record<string, string> = {};

        const extractCourses = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;

            // Check if this object is a course (has id and name/title)
            // We ensure 'id' is present. 'title' or 'name' is the label.
            if (obj.id && (obj.title || obj.name)) {
                courses[String(obj.id)] = obj.title || obj.name;
            }

            // Recurse into children
            Object.values(obj).forEach(value => {
                if (typeof value === 'object') {
                    extractCourses(value);
                }
            });
        };

        if (data.education) {
            extractCourses(data.education);
        }

        educationCoursesCache = courses;
        return courses;

    } catch (error) {
        console.error("Failed to fetch education courses:", error);
        return null;
    }
}
