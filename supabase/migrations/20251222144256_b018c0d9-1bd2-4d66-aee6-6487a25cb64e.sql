-- 알림 테이블 생성
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'health_comment', 'coaching_feedback', etc.
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID, -- 관련 레코드 ID (health_record_id 등)
  related_type TEXT, -- 'health_record', 'coaching_session', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 알림만 볼 수 있음
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- 사용자는 자신의 알림을 읽음 처리할 수 있음
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- 코치/관리자가 알림을 생성할 수 있음
CREATE POLICY "Coaches and admins can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'coach'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- 인덱스 생성
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;