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
 * Fetch weekly xanax stats for all members in a faction
 */
export interface FactionMemberStats {
    member_id: number;
    xanax_weekly_usage: number;
}

export async function fetchFactionMembersStats(factionId: number): Promise<FactionMemberStats[]> {
    try {
        const { data, error } = await supabase.rpc('get_faction_member_stats', {
            p_faction_id: factionId
        });

        if (error) {
            console.error('Error fetching faction members stats:', error);
            return [];
        }

        return (data || []) as FactionMemberStats[];
    } catch (err) {
        console.error('Error in fetchFactionMembersStats:', err);
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

// =============================================
// Ranked War Members
// =============================================

export interface RankedWarMember {
    user_id: number;
    faction_id: number;
    name: string;
    level: number;
    score: number;
    attacks: number;
    status_state: string;
    status_details: string;
    status_until: number;
    updated_at: string;
}

/**
 * Fetch ranked war members from Supabase
 */
export async function fetchRankedWarMembersFromDB(factionId: number): Promise<RankedWarMember[]> {
    try {
        const { data, error } = await supabase
            .from('ranked_war_members')
            .select('*')
            .eq('faction_id', factionId)
            .order('score', { ascending: false });

        if (error) {
            console.error('Error fetching ranked war members:', error);
            return [];
        }

        return (data || []) as RankedWarMember[];
    } catch (err) {
        console.error('Error in fetchRankedWarMembers:', err);
        return [];
    }
}


export interface RankedWarOverview {
    factions: {
        id: number;
        name: string;
        score: number;
    }[];
}

/**
 * Fetch ranked war overview (scores) from DB by aggregating members
 */
export async function fetchRankedWarOverviewFromDB(): Promise<RankedWarOverview | null> {
    try {
        // 1. Get all members
        const { data: members, error } = await supabase
            .from('ranked_war_members')
            .select('faction_id, score');

        if (error) throw error;
        if (!members) return null;

        // 2. Aggregate scores
        const scores: Record<number, number> = {};
        const factionIds = new Set<number>();

        members.forEach(m => {
            factionIds.add(m.faction_id);
            scores[m.faction_id] = (scores[m.faction_id] || 0) + (Number(m.score) || 0);
        });

        const ids = Array.from(factionIds);
        if (ids.length === 0) return null;

        // 3. Get faction names
        const { data: factions, error: factionError } = await supabase
            .from('faction')
            .select('id, name')
            .in('id', ids);

        if (factionError) throw factionError;

        // 4. Combine
        const result = ids.map(id => {
            const f = factions?.find(fac => fac.id === id);
            return {
                id,
                name: f?.name || `Faction ${id}`,
                score: scores[id] || 0
            };
        });

        return { factions: result };
    } catch (err) {
        console.error('Error in fetchRankedWarOverviewFromDB:', err);
        return null;
    }
}

// =============================================
// Ranked War Alerts
// =============================================

export interface RankedWarAlert {
    id: number;
    user_id: number;
    target_user_id: number;
    target_faction_id: number;
    is_active: boolean;
    last_notified_at: string | null;
    last_notified_type: string | null;
    created_at: string;
}

/**
 * Toggle alert for a specific ranked war member
 * Returns the new active state
 */
export async function toggleRankedWarAlert(
    userId: number,
    targetUserId: number,
    targetFactionId: number
): Promise<boolean> {
    try {
        // Check if alert exists
        const { data: existing, error: fetchError } = await supabase
            .from('ranked_war_alerts')
            .select('id, is_active')
            .eq('user_id', userId)
            .eq('target_user_id', targetUserId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // Not found is ok
            console.error('Error checking existing alert:', fetchError);
            return false;
        }

        if (existing) {
            // Toggle existing alert
            const newState = !existing.is_active;
            const { error: updateError } = await supabase
                .from('ranked_war_alerts')
                .update({ is_active: newState })
                .eq('id', existing.id);

            if (updateError) {
                console.error('Error updating alert:', updateError);
                return existing.is_active;
            }
            return newState;
        } else {
            // Create new alert (active by default)
            const { error: insertError } = await supabase
                .from('ranked_war_alerts')
                .insert({
                    user_id: userId,
                    target_user_id: targetUserId,
                    target_faction_id: targetFactionId,
                    is_active: true
                });

            if (insertError) {
                // Handle Race Condition: Duplicate key means it was just created by another request
                if (insertError.code === '23505') {
                    // Treat as success (already created = true)
                    return true;
                }
                console.error('Error creating alert:', insertError);
                return false;
            }
            return true;
        }
    } catch (err) {
        console.error('Error in toggleRankedWarAlert:', err);
        return false;
    }
}

/**
 * Fetch active alerts for a user
 */
export async function fetchRankedWarAlerts(userId: number): Promise<number[]> {
    try {
        const { data, error } = await supabase
            .from('ranked_war_alerts')
            .select('target_user_id')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) {
            console.error('Error fetching alerts:', error);
            return [];
        }

        return (data || []).map(a => a.target_user_id);
    } catch (err) {
        console.error('Error in fetchRankedWarAlerts:', err);
        return [];
    }
}
