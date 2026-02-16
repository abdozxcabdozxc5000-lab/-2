
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
UPDATE public.custodies SET category = type WHERE category IS NULL; -- 'type' was used before as classification
UPDATE public.custodies SET "paymentMethod" = 'نقدية' WHERE "paymentMethod" IS NULL;
UPDATE public.custodies SET source = 'الخزينة' WHERE source IS NULL;

-- Done. The table is now ready for the new fields.
