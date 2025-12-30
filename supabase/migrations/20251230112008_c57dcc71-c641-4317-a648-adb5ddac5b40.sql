-- Drop the existing UPDATE policy that blocks soft delete
DROP POLICY IF EXISTS "Users can update own replies" ON public.support_ticket_replies;

-- Create new UPDATE policy with proper USING and WITH CHECK
-- USING: only non-deleted replies can be updated
-- WITH CHECK: allows is_deleted to be set to true (soft delete)
CREATE POLICY "Users can update own replies" 
ON public.support_ticket_replies 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id AND sender_type = 'user' AND is_deleted = false)
WITH CHECK (auth.uid() = user_id AND sender_type = 'user');