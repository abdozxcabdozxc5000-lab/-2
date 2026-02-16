
-- ==============================================================================
-- SQL Script: Update Custodies Table
-- Add new columns for enhanced custody management
-- ==============================================================================

-- 1. Add `category` column (to store classification e.g. Factory Custody) if it doesn't exist
ALTER TABLE public.custodies ADD COLUMN IF NOT EXISTS category text;

-- 2. Add `paymentMethod` column (e.g. Cash, Transfer)
ALTER TABLE public.custodies ADD COLUMN IF NOT EXISTS "paymentMethod" text;

-- 3. Add `source` column (e.g. Belal, Maged, Bank)
ALTER TABLE public.custodies ADD COLUMN IF NOT EXISTS source text;

-- 4. Update existing records to have default values (Optional but recommended)
-- Only set default if the value is NULL to avoid overwriting existing data
UPDATE public.custodies SET category = type WHERE category IS NULL; 
UPDATE public.custodies SET "paymentMethod" = 'نقدية' WHERE "paymentMethod" IS NULL;
UPDATE public.custodies SET source = 'الخزينة' WHERE source IS NULL;

-- 5. Ensure RLS is enabled and policies allow access
ALTER TABLE public.custodies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for custodies" ON public.custodies;

CREATE POLICY "Enable all access for custodies" ON public.custodies 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Done. The table is now ready for the new fields.
