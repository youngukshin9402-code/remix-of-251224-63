-- Widen the UPDATE policy to apply to all roles (including anon) while keeping strict ownership checks.
-- Note: auth.uid() is NULL for non-authenticated requests, so they still cannot pass these conditions.

DROP POLICY IF EXISTS "Users can update own replies" ON public.support_ticket_replies;

CREATE POLICY "Users can update own replies"
ON public.support_ticket_replies
FOR UPDATE
TO public
USING (auth.uid() = user_id AND sender_type = 'user')
WITH CHECK (auth.uid() = user_id AND sender_type = 'user');
