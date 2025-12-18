-- ========================================
-- 건강양갱 데이터베이스 스키마 v1.0
-- ========================================

-- ENUM 타입 정의
CREATE TYPE public.user_type AS ENUM ('user', 'guardian', 'coach', 'admin');
CREATE TYPE public.subscription_tier AS ENUM ('basic', 'premium');
CREATE TYPE public.health_record_status AS ENUM ('uploading', 'analyzing', 'pending_review', 'completed', 'rejected');
CREATE TYPE public.daily_log_type AS ENUM ('food', 'mission');
CREATE TYPE public.coaching_session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.app_role AS ENUM ('admin', 'coach', 'guardian', 'user');

-- ========================================
-- 1. 사용자 프로필 테이블
-- ========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  phone TEXT,
  user_type public.user_type NOT NULL DEFAULT 'user',
  subscription_tier public.subscription_tier DEFAULT 'basic',
  current_points INTEGER DEFAULT 0,
  assigned_coach_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 프로필 정책
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ========================================
-- 2. 사용자 역할 테이블 (보안용 별도 테이블)
-- ========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 역할 체크 함수 (Security Definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 역할 정책
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- 3. 보호자 연결 테이블
-- ========================================
CREATE TABLE public.guardian_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_code TEXT,
  code_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, guardian_id)
);

ALTER TABLE public.guardian_connections ENABLE ROW LEVEL SECURITY;

-- 보호자 연결 정책
CREATE POLICY "Users can view own guardian connections"
  ON public.guardian_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = guardian_id);

CREATE POLICY "Users can create connection codes"
  ON public.guardian_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Guardians can update connection"
  ON public.guardian_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = guardian_id OR auth.uid() = user_id);

-- ========================================
-- 4. 건강 기록 테이블
-- ========================================
CREATE TABLE public.health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  raw_image_urls TEXT[] NOT NULL,
  parsed_data JSONB,
  health_tags TEXT[],
  health_age INTEGER,
  status public.health_record_status DEFAULT 'uploading',
  coach_comment TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

-- 건강 기록 정책
CREATE POLICY "Users can view own health records"
  ON public.health_records FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.has_role(auth.uid(), 'coach')
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.guardian_connections 
      WHERE guardian_id = auth.uid() AND user_id = health_records.user_id
    )
  );

CREATE POLICY "Users can insert own health records"
  ON public.health_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches and admins can update health records"
  ON public.health_records FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'coach') 
    OR public.has_role(auth.uid(), 'admin')
  );

-- ========================================
-- 5. 일일 활동 기록 테이블
-- ========================================
CREATE TABLE public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  log_type public.daily_log_type NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  ai_feedback TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- 일일 기록 정책
CREATE POLICY "Users can view own daily logs"
  ON public.daily_logs FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.has_role(auth.uid(), 'coach')
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.guardian_connections 
      WHERE guardian_id = auth.uid() AND user_id = daily_logs.user_id
    )
  );

CREATE POLICY "Users can insert own daily logs"
  ON public.daily_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily logs"
  ON public.daily_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ========================================
-- 6. 미션 템플릿 테이블
-- ========================================
CREATE TABLE public.mission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  points INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mission_templates ENABLE ROW LEVEL SECURITY;

-- 미션 템플릿 정책
CREATE POLICY "Users can view own missions"
  ON public.mission_templates FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.has_role(auth.uid(), 'coach')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Coaches can manage missions"
  ON public.mission_templates FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'coach') 
    OR public.has_role(auth.uid(), 'admin')
  );

-- ========================================
-- 7. 포인트 내역 테이블
-- ========================================
CREATE TABLE public.point_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.point_history ENABLE ROW LEVEL SECURITY;

-- 포인트 내역 정책
CREATE POLICY "Users can view own point history"
  ON public.point_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert point history"
  ON public.point_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 8. 코칭 세션 테이블
-- ========================================
CREATE TABLE public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  status public.coaching_session_status DEFAULT 'scheduled',
  video_room_id TEXT,
  coach_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

-- 코칭 세션 정책
CREATE POLICY "Users can view own coaching sessions"
  ON public.coaching_sessions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR auth.uid() = coach_id 
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can insert coaching sessions"
  ON public.coaching_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can update coaching sessions"
  ON public.coaching_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = coach_id OR public.has_role(auth.uid(), 'admin'));

-- ========================================
-- 9. 코치 가용 시간 테이블
-- ========================================
CREATE TABLE public.coach_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.coach_availability ENABLE ROW LEVEL SECURITY;

-- 코치 가용 시간 정책
CREATE POLICY "Everyone can view coach availability"
  ON public.coach_availability FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Coaches can manage own availability"
  ON public.coach_availability FOR ALL
  TO authenticated
  USING (auth.uid() = coach_id OR public.has_role(auth.uid(), 'admin'));

-- ========================================
-- 10. 상품 테이블
-- ========================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  health_tags TEXT[],
  image_url TEXT,
  purchase_link TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 상품 정책
CREATE POLICY "Everyone can view active products"
  ON public.products FOR SELECT
  TO authenticated
  USING (is_active = TRUE OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- 11. 구독 테이블
-- ========================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES public.profiles(id),
  plan_type TEXT NOT NULL,
  price INTEGER NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 구독 정책
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR auth.uid() = payer_id 
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can insert subscriptions"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = payer_id);

-- ========================================
-- 트리거: 신규 사용자 프로필 자동 생성
-- ========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', '사용자'),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::public.user_type, 'user')
  );
  
  -- 기본 역할 부여
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'user_type')::public.app_role, 'user'));
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 트리거: updated_at 자동 갱신
-- ========================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();