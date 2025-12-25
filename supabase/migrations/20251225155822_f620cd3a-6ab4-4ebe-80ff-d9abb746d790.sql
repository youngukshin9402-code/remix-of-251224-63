-- Add gender and activity_level columns to nutrition_settings table
ALTER TABLE public.nutrition_settings 
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS activity_level text;