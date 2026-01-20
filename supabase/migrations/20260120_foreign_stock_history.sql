-- 1. Create table for storing history of foreign stocks
CREATE TABLE IF NOT EXISTS public.foreign_stock_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_id bigint NOT NULL,
  country_code text NOT NULL,
  quantity integer NOT NULL,
  previous_quantity integer, -- To track the delta/change amount (useful for detecting restocks)
  price bigint NOT NULL DEFAULT 0,
  recorded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fk_history_item FOREIGN KEY (item_id) REFERENCES public.items(id)
);

-- 2. Index for efficient querying by item/country and time
CREATE INDEX IF NOT EXISTS idx_foreign_stock_history_lookup 
ON public.foreign_stock_history (country_code, item_id, recorded_at DESC);

-- 3. Function to handle auto-logging
CREATE OR REPLACE FUNCTION log_foreign_stock_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle UPDATE: Log only if quantity changes
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.quantity IS DISTINCT FROM NEW.quantity) THEN
            INSERT INTO public.foreign_stock_history (
                item_id, 
                country_code, 
                quantity, 
                previous_quantity, 
                price, 
                recorded_at
            )
            VALUES (
                NEW.item_id, 
                NEW.country_code, 
                NEW.quantity, 
                OLD.quantity, 
                NEW.price, 
                NOW()
            );
        END IF;
    
    -- Handle INSERT: Log initial state
    ELSIF (TG_OP = 'INSERT') THEN
         INSERT INTO public.foreign_stock_history (
            item_id, 
            country_code, 
            quantity, 
            previous_quantity, 
            price, 
            recorded_at
        ) VALUES (
            NEW.item_id, 
            NEW.country_code, 
            NEW.quantity, 
            0, -- Previous is 0 for new inserts
            NEW.price, 
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger to execute the function on any INSERT or UPDATE to item_foreign_stocks
-- Ensures history is tracked immediately when the scraper updates the main table
DROP TRIGGER IF EXISTS trigger_log_foreign_stock ON public.item_foreign_stocks;

CREATE TRIGGER trigger_log_foreign_stock
AFTER INSERT OR UPDATE ON public.item_foreign_stocks
FOR EACH ROW
EXECUTE FUNCTION log_foreign_stock_change();
