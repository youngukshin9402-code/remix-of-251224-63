-- 1. 취약한 RLS 정책 제거 (공개적으로 코드 조회 가능한 정책)
DROP POLICY IF EXISTS "Users can view connection by code" ON public.guardian_connections;

-- 2. 휴대전화 인증 테이블 생성
CREATE TABLE public.phone_verification_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  phone text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL DEFAULT 'guardian_connection',
  expires_at timestamp with time zone NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 인증 코드만 관리 가능
CREATE POLICY "Users can manage own verification codes"
ON public.phone_verification_codes
FOR ALL
USING (auth.uid() = user_id);

-- 3. 보호자 연결을 위한 새로운 secure RPC 함수 (코드 + 휴대전화 인증 방식)
CREATE OR REPLACE FUNCTION public.connect_guardian_with_phone_verification(
  p_target_user_phone text,
  p_verification_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id uuid;
  v_guardian_id uuid := auth.uid();
  v_connection_id uuid;
  v_existing_connection uuid;
BEGIN
  -- 1. 인증 코드 확인
  SELECT user_id INTO v_target_user_id
  FROM phone_verification_codes
  WHERE phone = p_target_user_phone
    AND code = p_verification_code
    AND purpose = 'guardian_connection'
    AND expires_at > now()
    AND verified = false;
  
  IF v_target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;
  
  -- 2. 자기 자신 연결 방지
  IF v_target_user_id = v_guardian_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_connection');
  END IF;
  
  -- 3. 이미 연결된 경우 확인
  SELECT id INTO v_existing_connection
  FROM guardian_connections
  WHERE user_id = v_target_user_id AND guardian_id = v_guardian_id;
  
  IF v_existing_connection IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_connected');
  END IF;
  
  -- 4. 인증 코드를 사용됨으로 표시
  UPDATE phone_verification_codes
  SET verified = true
  WHERE phone = p_target_user_phone
    AND code = p_verification_code
    AND purpose = 'guardian_connection';
  
  -- 5. 연결 생성
  INSERT INTO guardian_connections (user_id, guardian_id, connected_at)
  VALUES (v_target_user_id, v_guardian_id, now())
  RETURNING id INTO v_connection_id;
  
  RETURN jsonb_build_object('success', true, 'connection_id', v_connection_id);
END;
$$;

-- 4. 인증 코드 생성 함수 (Mock 모드에서 사용)
CREATE OR REPLACE FUNCTION public.generate_phone_verification_code(
  p_phone text,
  p_purpose text DEFAULT 'guardian_connection'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text;
BEGIN
  -- 6자리 랜덤 코드 생성
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');
  
  -- 기존 미사용 코드 삭제
  DELETE FROM phone_verification_codes
  WHERE user_id = v_user_id AND purpose = p_purpose AND verified = false;
  
  -- 새 코드 생성 (5분 유효)
  INSERT INTO phone_verification_codes (user_id, phone, code, purpose, expires_at)
  VALUES (v_user_id, p_phone, v_code, p_purpose, now() + interval '5 minutes');
  
  RETURN jsonb_build_object('success', true, 'code', v_code, 'expires_in_minutes', 5);
END;
$$;