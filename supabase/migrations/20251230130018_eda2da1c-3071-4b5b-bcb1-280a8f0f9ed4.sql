-- checkin_reports 테이블 확장: 스냅샷 저장, 버전 관리, 관리자 전송 지원
-- 1) sent_at 컬럼 추가 (전송 시각 - 정렬 기준)
ALTER TABLE public.checkin_reports 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- 2) version_number 컬럼 추가 (같은 날짜 여러 전송 시 구분)
ALTER TABLE public.checkin_reports 
ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1;

-- 3) snapshot_data 컬럼 추가 (불변 스냅샷 JSON - 건강/영양/운동/홈 전체 데이터)
ALTER TABLE public.checkin_reports 
ADD COLUMN IF NOT EXISTS snapshot_data JSONB DEFAULT '{}'::jsonb;

-- 4) 관리자(admin) 전송 위한 admin_id 컬럼 (nullable - 코치 전송이면 NULL)
ALTER TABLE public.checkin_reports 
ADD COLUMN IF NOT EXISTS admin_id UUID DEFAULT NULL;

-- 5) 코치/관리자가 모든 리포트를 조회할 수 있도록 RLS 정책 수정
-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Admins can view all reports" ON public.checkin_reports;
DROP POLICY IF EXISTS "Coaches can view assigned user reports" ON public.checkin_reports;
DROP POLICY IF EXISTS "Users can create own reports" ON public.checkin_reports;
DROP POLICY IF EXISTS "Users can view own reports" ON public.checkin_reports;

-- 관리자는 모든 리포트 조회 가능
CREATE POLICY "Admins can view all reports" 
ON public.checkin_reports 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 코치는 자신에게 배정된 사용자 리포트만 조회
CREATE POLICY "Coaches can view assigned user reports" 
ON public.checkin_reports 
FOR SELECT 
USING (
  has_role(auth.uid(), 'coach'::app_role) AND 
  (EXISTS ( 
    SELECT 1 FROM profiles 
    WHERE profiles.id = checkin_reports.user_id 
    AND profiles.assigned_coach_id = auth.uid()
  ))
);

-- 사용자는 자신의 리포트 조회 가능
CREATE POLICY "Users can view own reports" 
ON public.checkin_reports 
FOR SELECT 
USING (auth.uid() = user_id);

-- 사용자는 자신의 리포트 생성 가능
CREATE POLICY "Users can create own reports" 
ON public.checkin_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 6) 인덱스 추가: 사용자별 날짜별 + 전송시각 정렬
CREATE INDEX IF NOT EXISTS idx_checkin_reports_user_date_sent 
ON public.checkin_reports (user_id, report_date, sent_at DESC);