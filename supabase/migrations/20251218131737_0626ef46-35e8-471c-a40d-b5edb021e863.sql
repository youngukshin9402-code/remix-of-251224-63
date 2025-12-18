-- Add client_id column for idempotency
ALTER TABLE public.meal_records ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.gym_records ADD COLUMN IF NOT EXISTS client_id TEXT;

-- Create unique constraint for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS meal_records_user_client_unique ON public.meal_records (user_id, client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS gym_records_user_client_unique ON public.gym_records (user_id, client_id) WHERE client_id IS NOT NULL;

-- Add Storage policies for food-logs bucket (already exists as private bucket)
CREATE POLICY "Users can upload their own food images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'food-logs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own food images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'food-logs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own food images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'food-logs' AND (storage.foldername(name))[1] = auth.uid()::text);