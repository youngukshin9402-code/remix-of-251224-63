-- Add UNIQUE constraint on ai_health_reports.source_record_id for upsert to work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_health_reports_source_record_id_key'
  ) THEN
    ALTER TABLE public.ai_health_reports
      ADD CONSTRAINT ai_health_reports_source_record_id_key UNIQUE (source_record_id);
  END IF;
END $$;