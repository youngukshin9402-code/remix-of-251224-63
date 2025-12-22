-- chat_messages 테이블에 이미지 메시지 지원 추가
ALTER TABLE public.chat_messages
ADD COLUMN message_type text NOT NULL DEFAULT 'text',
ADD COLUMN image_url text;

-- chat-media 버킷 생성
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', false);

-- chat-media 업로드 정책
CREATE POLICY "Users can upload chat media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);

-- chat-media 조회 정책 (자신의 대화 이미지만)
CREATE POLICY "Users can view chat media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);