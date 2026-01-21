-- =============================================
-- MIGRATION: Create chain_target table
-- Run this in Supabase SQL Editor
-- =============================================

-- Table: chain_target
-- Stores chain target players for attacking
CREATE TABLE IF NOT EXISTS chain_target (
    id SERIAL PRIMARY KEY,
    torn_id INT8 UNIQUE NOT NULL,
    name TEXT NOT NULL,
    level INT4,
    total_stats INT8,
    strength INT8,
    defense INT8,
    speed INT8,
    dexterity INT8,
    status TEXT DEFAULT 'Unknown',     -- Okay, Hospital, Jail, Traveling, Unknown
    status_until INT8,                  -- Unix timestamp when Hospital/Jail ends
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_chain_target_status ON chain_target(status);
CREATE INDEX IF NOT EXISTS idx_chain_target_torn_id ON chain_target(torn_id);
CREATE INDEX IF NOT EXISTS idx_chain_target_level ON chain_target(level);

-- Enable RLS
ALTER TABLE chain_target ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read chain targets
CREATE POLICY "Anyone can read chain targets" ON chain_target
    FOR SELECT USING (true);

-- Policy: Service role can insert/update (for edge functions)
CREATE POLICY "Service can insert chain targets" ON chain_target
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service can update chain targets" ON chain_target
    FOR UPDATE TO service_role USING (true);

-- =============================================
-- Function: Update chain target status
-- Called by edge function to update status
-- =============================================
CREATE OR REPLACE FUNCTION update_chain_target_status(
    p_torn_id INT8,
    p_status TEXT,
    p_status_until INT8
)
RETURNS VOID AS $$
BEGIN
    UPDATE chain_target
    SET 
        status = p_status,
        status_until = p_status_until,
        last_checked_at = now()
    WHERE torn_id = p_torn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Get next batch of targets to check
-- Returns targets that need status check
-- (status = 'Okay' OR status_until has passed)
-- =============================================
CREATE OR REPLACE FUNCTION get_chain_targets_to_check(
    p_batch_size INT DEFAULT 10
)
RETURNS TABLE (
    torn_id INT8,
    name TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ct.torn_id, ct.name, ct.status
    FROM chain_target ct
    WHERE 
        ct.status = 'Okay' 
        OR ct.status = 'Unknown'
        OR (ct.status_until IS NOT NULL AND ct.status_until < EXTRACT(EPOCH FROM now()))
    ORDER BY ct.last_checked_at ASC NULLS FIRST
    LIMIT p_batch_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
