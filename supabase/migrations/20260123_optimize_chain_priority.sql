-- =============================================
-- MIGRATION: Optimize chain target checking priority
-- Prioritizes:
-- 1. Targets whose hospital time just expired (need immediate recheck)
-- 2. Targets that haven't been checked in a while
-- =============================================

-- Drop and recreate the function with better priority logic
CREATE OR REPLACE FUNCTION get_chain_targets_to_check(
    p_batch_size INT DEFAULT 20
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
        -- Include: Okay targets (need periodic recheck)
        ct.status = 'Okay' 
        -- Include: Unknown targets (never checked)
        OR ct.status = 'Unknown'
        -- Include: Hospital/Jail whose time has expired (PRIORITY!)
        OR (ct.status IN ('Hospital', 'Jail') AND ct.status_until IS NOT NULL AND ct.status_until < EXTRACT(EPOCH FROM now()))
    ORDER BY 
        -- PRIORITY 1: Hospital/Jail expired (just got out!) - check these FIRST
        CASE 
            WHEN ct.status IN ('Hospital', 'Jail') 
                 AND ct.status_until IS NOT NULL 
                 AND ct.status_until < EXTRACT(EPOCH FROM now()) 
            THEN 0 
            ELSE 1 
        END,
        -- PRIORITY 2: Oldest checked first
        ct.last_checked_at ASC NULLS FIRST
    LIMIT p_batch_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also add a status_priority column if not exists (for app sorting)
-- 0 = Okay (ready to attack)
-- 1 = Hospital/Jail (waiting)
-- 2 = Unknown
ALTER TABLE chain_target ADD COLUMN IF NOT EXISTS status_priority INT4 DEFAULT 2;

-- Function to update status with auto-calculated priority
CREATE OR REPLACE FUNCTION update_chain_target_status(
    p_torn_id INT8,
    p_status TEXT,
    p_status_until INT8
)
RETURNS VOID AS $$
DECLARE
    v_priority INT4;
BEGIN
    -- Calculate priority based on status
    v_priority := CASE p_status
        WHEN 'Okay' THEN 0
        WHEN 'Hospital' THEN 1
        WHEN 'Jail' THEN 1
        WHEN 'Traveling' THEN 1
        ELSE 2
    END;

    UPDATE chain_target
    SET 
        status = p_status,
        status_until = p_status_until,
        status_priority = v_priority,
        last_checked_at = now()
    WHERE torn_id = p_torn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
