-- =============================================
-- MIGRATION: Create faction and user_travel_status tables
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- Table: faction
-- Stores faction data synced from Torn API
-- =============================================
CREATE TABLE IF NOT EXISTS faction (
    id INT8 PRIMARY KEY,
    name TEXT NOT NULL,
    tag TEXT,
    leader_id INT8,
    co_leader_id INT8,
    respect INT8 DEFAULT 0,
    age INT4,
    capacity INT4,
    best_chain INT4,
    member_count INT4,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- First, insert placeholder factions for any existing faction_ids in users table
-- This prevents FK constraint violation
INSERT INTO faction (id, name)
SELECT DISTINCT faction_id, 'Unknown Faction'
FROM users
WHERE faction_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Add foreign key from users.faction_id to faction.id
-- (This links existing users table to faction table)
ALTER TABLE users 
ADD CONSTRAINT fk_users_faction 
FOREIGN KEY (faction_id) REFERENCES faction(id) 
ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE faction ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read faction data
CREATE POLICY "Anyone can read faction" ON faction
    FOR SELECT USING (true);

-- Policy: Authenticated users can insert/update (for syncing from app)
CREATE POLICY "Authenticated can insert faction" ON faction
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update faction" ON faction
    FOR UPDATE TO authenticated USING (true);

-- =============================================
-- Table: user_travel_status
-- Stores travel and status data for app users
-- =============================================
CREATE TABLE IF NOT EXISTS user_travel_status (
    user_id INT8 PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    travel_state TEXT,
    travel_destination TEXT,
    travel_arrival INT8,
    status_state TEXT,
    status_until INT8,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_travel_user_id ON user_travel_status(user_id);

-- Enable RLS
ALTER TABLE user_travel_status ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read (to see faction mates' status)
CREATE POLICY "Authenticated can read travel status" ON user_travel_status
    FOR SELECT TO authenticated USING (true);

-- Policy: Users can only insert their own record
CREATE POLICY "Users can insert own status" ON user_travel_status
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::int8);

-- Policy: Users can only update their own record
CREATE POLICY "Users can update own status" ON user_travel_status
    FOR UPDATE TO authenticated USING (user_id = auth.uid()::int8);

-- =============================================
-- Helper function: Upsert user travel status
-- Can be called from app via supabase.rpc()
-- =============================================
CREATE OR REPLACE FUNCTION upsert_user_travel_status(
    p_user_id INT8,
    p_travel_state TEXT,
    p_travel_destination TEXT,
    p_travel_arrival INT8,
    p_status_state TEXT,
    p_status_until INT8
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_travel_status (
        user_id, travel_state, travel_destination, travel_arrival, 
        status_state, status_until, updated_at
    )
    VALUES (
        p_user_id, p_travel_state, p_travel_destination, p_travel_arrival,
        p_status_state, p_status_until, now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        travel_state = EXCLUDED.travel_state,
        travel_destination = EXCLUDED.travel_destination,
        travel_arrival = EXCLUDED.travel_arrival,
        status_state = EXCLUDED.status_state,
        status_until = EXCLUDED.status_until,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Helper function: Upsert faction data
-- =============================================
CREATE OR REPLACE FUNCTION upsert_faction(
    p_id INT8,
    p_name TEXT,
    p_tag TEXT,
    p_leader_id INT8,
    p_co_leader_id INT8,
    p_respect INT8,
    p_age INT4,
    p_capacity INT4,
    p_best_chain INT4,
    p_member_count INT4
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO faction (
        id, name, tag, leader_id, co_leader_id, respect, 
        age, capacity, best_chain, member_count, updated_at
    )
    VALUES (
        p_id, p_name, p_tag, p_leader_id, p_co_leader_id, p_respect,
        p_age, p_capacity, p_best_chain, p_member_count, now()
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        tag = EXCLUDED.tag,
        leader_id = EXCLUDED.leader_id,
        co_leader_id = EXCLUDED.co_leader_id,
        respect = EXCLUDED.respect,
        age = EXCLUDED.age,
        capacity = EXCLUDED.capacity,
        best_chain = EXCLUDED.best_chain,
        member_count = EXCLUDED.member_count,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- View: Get faction members with travel status
-- Joins users with user_travel_status for easy querying
-- =============================================
CREATE OR REPLACE VIEW faction_members_with_travel AS
SELECT 
    u.id as user_id,
    u.username,
    u.faction_id,
    u.last_active,
    t.travel_state,
    t.travel_destination,
    t.travel_arrival,
    t.status_state,
    t.status_until,
    t.updated_at as travel_updated_at
FROM users u
LEFT JOIN user_travel_status t ON u.id = t.user_id;
