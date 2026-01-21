-- Add status_priority column
ALTER TABLE chain_target ADD COLUMN IF NOT EXISTS status_priority SMALLINT DEFAULT 4;

-- Create function to update priority based on status
CREATE OR REPLACE FUNCTION update_chain_target_priority()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.status
    WHEN 'Okay' THEN NEW.status_priority := 0;
    WHEN 'Hospital' THEN NEW.status_priority := 1;
    WHEN 'Jail' THEN NEW.status_priority := 2;
    WHEN 'Traveling' THEN NEW.status_priority := 3;
    ELSE NEW.status_priority := 4;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update priority on insert/update
DROP TRIGGER IF EXISTS tr_update_status_priority ON chain_target;

CREATE TRIGGER tr_update_status_priority
BEFORE INSERT OR UPDATE OF status ON chain_target
FOR EACH ROW
EXECUTE FUNCTION update_chain_target_priority();

-- Backfill existing data to set correct priority
UPDATE chain_target SET status = status;
