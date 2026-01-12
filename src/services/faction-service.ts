// src/services/faction-service.ts
// Service for syncing and fetching faction & travel data from Supabase

import { supabase } from './supabase';
import { FactionBasicData } from './torn-api';

// =============================================
// Types
// =============================================

export interface FactionData {
    id: number;
    name: string;
    tag: string | null;
    leader_id: number | null;
    co_leader_id: number | null;
    respect: number;
    age: number | null;
    capacity: number | null;
    best_chain: number | null;
    member_count: number | null;
    updated_at: string;
}

export interface UserTravelStatus {
    user_id: number;
    travel_state: string | null;
    travel_destination: string | null;
    travel_arrival: number | null;
    status_state: string | null;
    status_until: number | null;
    updated_at: string;
}

export interface FactionMemberWithTravel {
    user_id: number;
    username: string | null;
    faction_id: number | null;
    last_active: string | null;
    travel_state: string | null;
    travel_destination: string | null;
    travel_arrival: number | null;
    status_state: string | null;
    status_until: number | null;
    travel_updated_at: string | null;
}

// =============================================
// Faction Functions
// =============================================

/**
 * Sync faction data to Supabase
 * Call this when fetching faction data from Torn API
 */
export async function syncFactionData(factionData: FactionBasicData): Promise<boolean> {
    try {
        const { error } = await supabase.rpc('upsert_faction', {
            p_id: factionData.ID,
            p_name: factionData.name,
            p_tag: factionData.tag || null,
            p_leader_id: factionData.leader || null,
            p_co_leader_id: factionData['co-leader'] || null,
            p_respect: factionData.respect || 0,
            p_age: factionData.age || null,
            p_capacity: factionData.capacity || null,
            p_best_chain: factionData.best_chain || null,
            p_member_count: factionData.members ? Object.keys(factionData.members).length : null
        });

        if (error) {
            console.error('Error syncing faction data:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Error in syncFactionData:', err);
        return false;
    }
}

/**
 * Fetch faction data from Supabase
 */
export async function fetchFactionFromDB(factionId: number): Promise<FactionData | null> {
    try {
        const { data, error } = await supabase
            .from('faction')
            .select('*')
            .eq('id', factionId)
            .single();

        if (error) {
            console.error('Error fetching faction from DB:', error);
            return null;
        }

        return data as FactionData;
    } catch (err) {
        console.error('Error in fetchFactionFromDB:', err);
        return null;
    }
}

// =============================================
// User Travel Status Functions
// =============================================

/**
 * Sync user's travel and status data to Supabase
 * Call this after fetching user data from Torn API
 */
export async function syncUserTravelStatus(
    userId: number,
    travelState: string | null,
    travelDestination: string | null,
    travelArrival: number | null,
    statusState: string | null,
    statusUntil: number | null
): Promise<boolean> {
    try {
        const { error } = await supabase.rpc('upsert_user_travel_status', {
            p_user_id: userId,
            p_travel_state: travelState,
            p_travel_destination: travelDestination,
            p_travel_arrival: travelArrival,
            p_status_state: statusState,
            p_status_until: statusUntil
        });

        if (error) {
            console.error('Error syncing user travel status:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Error in syncUserTravelStatus:', err);
        return false;
    }
}

/**
 * Fetch travel status for all members in a faction
 * Uses the faction_members_with_travel view
 */
export async function fetchFactionMembersTravelStatus(factionId: number): Promise<FactionMemberWithTravel[]> {
    try {
        const { data, error } = await supabase
            .from('faction_members_with_travel')
            .select('*')
            .eq('faction_id', factionId);

        if (error) {
            console.error('Error fetching faction members travel status:', error);
            return [];
        }

        return (data || []) as FactionMemberWithTravel[];
    } catch (err) {
        console.error('Error in fetchFactionMembersTravelStatus:', err);
        return [];
    }
}

/**
 * Calculate time left from arrival timestamp
 * Returns seconds remaining, or 0 if already arrived/no data
 */
export function calculateTravelTimeLeft(travelArrival: number | null): number {
    if (!travelArrival) return 0;
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, travelArrival - now);
}
