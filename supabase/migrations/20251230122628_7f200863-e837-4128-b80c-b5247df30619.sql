-- 기존 UPDATE 정책 삭제 후 is_deleted 조건 없이 재생성
DROP POLICY IF EXISTS "Users can update own replies" ON public.support_ticket_replies;

CREATE POLICY "Users can update own replies"
ON public.support_ticket_replies
FOR UPDATE
USING (auth.uid() = user_id AND sender_type = 'user')
WITH CHECK (auth.uid() = user_id AND sender_type = 'user');