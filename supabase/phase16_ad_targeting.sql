-- Migration to add targeting columns to ads table

ALTER TABLE public.ads
ADD COLUMN target_tags text[] DEFAULT array[]::text[],
ADD COLUMN target_categories integer[] DEFAULT array[]::integer[];

-- Refresh the schema cache if needed for PostgREST
NOTIFY pgrst, 'reload schema';
