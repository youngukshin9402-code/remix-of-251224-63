-- 건강검진 기록에 검진일(exam_date) 컬럼 추가
ALTER TABLE public.health_records 
ADD COLUMN IF NOT EXISTS exam_date date DEFAULT CURRENT_DATE;

-- 사용자가 자신의 건강검진 기록을 삭제할 수 있도록 RLS 정책 추가
CREATE POLICY "Users can delete own health records"
ON public.health_records
FOR DELETE
USING (auth.uid() = user_id);

-- 사용자가 자신의 건강검진 기록을 수정할 수 있도록 UPDATE 정책 추가 (기존에 coach/admin만 가능했음)
CREATE POLICY "Users can update own health records"
ON public.health_records
FOR UPDATE
USING (auth.uid() = user_id);