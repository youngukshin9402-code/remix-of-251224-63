-- 1. support_ticket_replies INSERT 정책 수정
DROP POLICY IF EXISTS "Users can create replies on own tickets" ON public.support_ticket_replies;

-- 사용자가 자신의 티켓에 답글 가능
CREATE POLICY "Users can create replies on own tickets" 
ON public.support_ticket_replies FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) AND 
  (sender_type = 'user') AND
  (EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE support_tickets.id = support_ticket_replies.ticket_id 
    AND support_tickets.user_id = auth.uid()
  ))
);

-- 관리자/코치가 모든 티켓에 답글 가능
CREATE POLICY "Admins can create replies on any ticket"
ON public.support_ticket_replies FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coach'::app_role)) AND
  (sender_type = 'admin') AND
  (auth.uid() = user_id)
);

-- 2. notifications INSERT 정책 추가 (사용자도 문의 관련 알림 생성 가능)
CREATE POLICY "Users can create support notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  (related_type = 'support_ticket') AND
  (type IN ('support_reply', 'support_new'))
);