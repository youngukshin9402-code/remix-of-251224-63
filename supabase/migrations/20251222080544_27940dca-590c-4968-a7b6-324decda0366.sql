-- 1. consultation_requests 테이블 (상담 신청, Realtime용)
CREATE TABLE public.consultation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  goal TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 신청만 볼 수 있음
CREATE POLICY "Users can view own requests" ON public.consultation_requests
FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 신청 가능
CREATE POLICY "Users can create requests" ON public.consultation_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 관리자는 모든 신청 관리 가능
CREATE POLICY "Admins can manage all requests" ON public.consultation_requests
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_requests;

-- 2. payments 테이블 (결제)
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id),
  provider TEXT NOT NULL DEFAULT 'toss',
  order_id TEXT UNIQUE NOT NULL,
  payment_key TEXT,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 결제만 조회 가능
CREATE POLICY "Users can view own payments" ON public.payments
FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 결제 생성 가능
CREATE POLICY "Users can create payments" ON public.payments
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 관리자는 모든 결제 관리 가능
CREATE POLICY "Admins can manage all payments" ON public.payments
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 3. daily_goal_achievements 테이블 (목표 달성 알림용)
CREATE TABLE public.daily_goal_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  achieved BOOLEAN NOT NULL DEFAULT false,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_goal_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own achievements" ON public.daily_goal_achievements
FOR ALL USING (auth.uid() = user_id);

-- 4. ai_health_reports 테이블 (AI 분석 결과)
CREATE TABLE public.ai_health_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'health_checkup',
  source_record_id UUID,
  input_snapshot JSONB,
  ai_result JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_health_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON public.ai_health_reports
FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create reports" ON public.ai_health_reports
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reports" ON public.ai_health_reports
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 5. ai_health_reviews 테이블 (관리자 검토)
CREATE TABLE public.ai_health_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.ai_health_reports(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  review_note TEXT,
  overrides JSONB,
  review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_health_reviews ENABLE ROW LEVEL SECURITY;

-- 사용자는 published된 리뷰만 볼 수 있음
CREATE POLICY "Users can view published reviews" ON public.ai_health_reviews
FOR SELECT USING (
  review_status = 'published' AND EXISTS (
    SELECT 1 FROM public.ai_health_reports 
    WHERE ai_health_reports.id = ai_health_reviews.report_id 
    AND ai_health_reports.user_id = auth.uid()
  )
);

-- 관리자는 모든 리뷰 관리 가능
CREATE POLICY "Admins can manage all reviews" ON public.ai_health_reviews
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 6. products 테이블에 코칭 상품 추가
INSERT INTO public.products (name, description, price, is_active, health_tags)
VALUES ('4주 코칭 패키지', '전문가와 함께하는 4주 맞춤 건강 관리 프로그램', 199000, true, ARRAY['coaching']);

-- 7. Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_daily_goal_achievements_updated_at
BEFORE UPDATE ON public.daily_goal_achievements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_ai_health_reviews_updated_at
BEFORE UPDATE ON public.ai_health_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();