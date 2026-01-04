-- 코치 알림 설정 테이블 생성
CREATE TABLE public.coach_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  health_checkup_upload BOOLEAN DEFAULT true,
  inbody_upload BOOLEAN DEFAULT true,
  chat_message BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(coach_id)
);

-- RLS 활성화
ALTER TABLE public.coach_notification_settings ENABLE ROW LEVEL SECURITY;

-- 코치가 자신의 알림 설정 관리 가능
CREATE POLICY "Coaches can manage own notification settings"
ON public.coach_notification_settings
FOR ALL
USING (auth.uid() = coach_id);

-- 업데이트 시 updated_at 자동 갱신
CREATE TRIGGER update_coach_notification_settings_updated_at
BEFORE UPDATE ON public.coach_notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- 코칭 상담 기록 테이블 생성
CREATE TABLE public.coaching_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_time TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.coaching_records ENABLE ROW LEVEL SECURITY;

-- 코치가 자신의 코칭 기록 관리 가능
CREATE POLICY "Coaches can manage own coaching records"
ON public.coaching_records
FOR ALL
USING (auth.uid() = coach_id);

-- 관리자가 모든 코칭 기록 조회 가능
CREATE POLICY "Admins can view all coaching records"
ON public.coaching_records
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 업데이트 시 updated_at 자동 갱신
CREATE TRIGGER update_coaching_records_updated_at
BEFORE UPDATE ON public.coaching_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();