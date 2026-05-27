-- Chat assistant 👍/👎 feedback. Used to surface answer quality on the
-- admin chat dashboard and to identify questions the model is failing
-- at so we can patch the knowledge base.

CREATE TABLE IF NOT EXISTS public.chat_message_feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  -- Client-side message id (not a FK — assistant messages aren't
  -- persisted individually so we key on the id the widget generates).
  message_id      text NOT NULL,
  rating          smallint NOT NULL CHECK (rating IN (-1, 1)),
  -- Free-form note from the visitor (rarely supplied today; here so
  -- adding the "what was wrong?" UI later doesn't need another schema
  -- migration).
  note            text,
  ip              inet,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- A visitor can flip their vote — last one wins per message.
  UNIQUE (conversation_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_message_feedback_conv
  ON public.chat_message_feedback (conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_feedback_rating
  ON public.chat_message_feedback (rating, created_at DESC);

-- Anyone with the conversation_id can rate (anon votes are valid). Only
-- admins can read.
ALTER TABLE public.chat_message_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_insert" ON public.chat_message_feedback;
CREATE POLICY "anyone_insert" ON public.chat_message_feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "anyone_update_own" ON public.chat_message_feedback;
CREATE POLICY "anyone_update_own" ON public.chat_message_feedback
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin_select" ON public.chat_message_feedback;
CREATE POLICY "admin_select" ON public.chat_message_feedback
  FOR SELECT TO authenticated
  USING (public.is_admin());

GRANT SELECT ON public.chat_message_feedback TO authenticated;
GRANT INSERT, UPDATE ON public.chat_message_feedback TO anon, authenticated;
