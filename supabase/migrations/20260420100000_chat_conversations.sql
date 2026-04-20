-- Chat persistence for the DeepSeek-backed AI assistant.
--
-- Every chat message — anonymous or signed-in — lands in these two tables
-- so the admin can audit questions for UX insight. Signed-in users get
-- durable conversations (memory) keyed by user_id; anonymous visitors get
-- ephemeral ones keyed by a client-generated session_id stored in
-- localStorage, then expired/purged by a cron job later.
--
-- Security model:
--   * A user can SELECT and INSERT into their own conversations/messages.
--   * Anonymous visitors cannot read or write through RLS at all — the
--     server inserts on their behalf via SECURITY DEFINER RPCs, so the
--     anon key never touches these tables directly.
--   * Admins read everything through is_admin().

-- ---------------------------------------------------------------------------
-- chat_conversations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id   text,
  locale       text NOT NULL DEFAULT 'en' CHECK (locale IN ('ar','en')),
  title        text,
  ip_address   inet,
  user_agent   text,
  message_count integer NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_conversations_owner CHECK (
    (user_id IS NOT NULL AND session_id IS NULL)
    OR (user_id IS NULL AND session_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_chat_conv_user
  ON public.chat_conversations (user_id, updated_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_conv_session
  ON public.chat_conversations (session_id)
  WHERE session_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- chat_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user','assistant')),
  content         text NOT NULL,
  token_count     integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conv
  ON public.chat_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages      ENABLE ROW LEVEL SECURITY;

-- Strip any default grants; only authenticated + admins get explicit access.
REVOKE ALL ON public.chat_conversations FROM anon, authenticated;
REVOKE ALL ON public.chat_messages      FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chat_conversations TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;

-- Owners can read + update their own conversations.
DROP POLICY IF EXISTS chat_conv_owner_select ON public.chat_conversations;
CREATE POLICY chat_conv_owner_select ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS chat_conv_owner_insert ON public.chat_conversations;
CREATE POLICY chat_conv_owner_insert ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS chat_conv_owner_update ON public.chat_conversations;
CREATE POLICY chat_conv_owner_update ON public.chat_conversations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can read all conversations for the audit page.
DROP POLICY IF EXISTS chat_conv_admin_select ON public.chat_conversations;
CREATE POLICY chat_conv_admin_select ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Messages: owners can read + insert for their own conversations.
DROP POLICY IF EXISTS chat_msg_owner_select ON public.chat_messages;
CREATE POLICY chat_msg_owner_select ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
       WHERE c.id = chat_messages.conversation_id
         AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_msg_owner_insert ON public.chat_messages;
CREATE POLICY chat_msg_owner_insert ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
       WHERE c.id = chat_messages.conversation_id
         AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_msg_admin_select ON public.chat_messages;
CREATE POLICY chat_msg_admin_select ON public.chat_messages
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- Bump message_count/last_message_at on each insert — avoids an extra
-- round-trip from the API and keeps the list view cheap.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_chat_messages_bump_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.chat_conversations
     SET message_count   = message_count + 1,
         last_message_at = NEW.created_at,
         updated_at      = NEW.created_at
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_messages_bump ON public.chat_messages;
CREATE TRIGGER trg_chat_messages_bump
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_chat_messages_bump_conversation();

-- ---------------------------------------------------------------------------
-- RPC: anonymous visitors don't have auth.uid(), so the server uses the
-- admin client to insert on their behalf through this function. Keeps the
-- service role key off the direct INSERT path and logs who/what cleanly.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.record_anonymous_chat_turn(text, text, text, text, text, inet, text);

CREATE OR REPLACE FUNCTION public.record_anonymous_chat_turn(
  p_conversation_id text,   -- caller-provided UUID OR null to mint a new one
  p_session_id      text,
  p_locale          text,
  p_user_message    text,
  p_assistant_message text,
  p_ip              inet,
  p_user_agent      text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  IF p_conversation_id IS NULL OR p_conversation_id = '' THEN
    INSERT INTO public.chat_conversations (session_id, locale, ip_address, user_agent, title)
    VALUES (p_session_id, p_locale, p_ip, p_user_agent, left(p_user_message, 80))
    RETURNING id INTO v_conversation_id;
  ELSE
    v_conversation_id := p_conversation_id::uuid;
    -- Defensive: tie a stranger's UUID to the right session. If someone
    -- supplies an ID that doesn't belong to them, the insert below will fail
    -- the owner check.
    IF NOT EXISTS (
      SELECT 1 FROM public.chat_conversations
       WHERE id = v_conversation_id AND session_id = p_session_id
    ) THEN
      RAISE EXCEPTION 'conversation_not_found_for_session';
    END IF;
  END IF;

  INSERT INTO public.chat_messages (conversation_id, role, content)
  VALUES
    (v_conversation_id, 'user',      p_user_message),
    (v_conversation_id, 'assistant', p_assistant_message);

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_anonymous_chat_turn(text, text, text, text, text, inet, text) FROM PUBLIC;
-- Only the service role needs to call this — tighten below by grant-to-none
-- and relying on the server route using the admin client.
GRANT EXECUTE ON FUNCTION public.record_anonymous_chat_turn(text, text, text, text, text, inet, text) TO service_role;
