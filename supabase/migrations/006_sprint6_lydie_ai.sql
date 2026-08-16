-- ═══════════════════════════════════════════════════════════════════
-- IME CRM — Sprint 6 : Lydie AI
-- ═══════════════════════════════════════════════════════════════════

-- Supprimer toute référence à Lydie AI (renommage)
-- UPDATE public.technical_calculations SET ai_model = 'lydie-v1'
--   WHERE ai_model IS NOT NULL;

-- Type de contexte conversation
DO $$ BEGIN
  CREATE TYPE ai_context_type AS ENUM (
    'commercial', 'technique', 'projet', 'dashboard', 'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table conversations Lydie AI
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,           -- 'user' | 'assistant'
  message       TEXT NOT NULL,
  response      TEXT,
  context_type  ai_context_type DEFAULT 'general',
  context_data  JSONB DEFAULT '{}',      -- Données CRM injectées dans le contexte
  model         TEXT DEFAULT 'gpt-4o-mini',
  tokens_used   INT,
  session_id    UUID,                    -- Groupe les messages par session
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conv_user    ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conv_session ON public.ai_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_conv_created ON public.ai_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conv_context ON public.ai_conversations(context_type);

-- RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_conv_select" ON public.ai_conversations;
CREATE POLICY "ai_conv_select" ON public.ai_conversations FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "ai_conv_insert" ON public.ai_conversations;
CREATE POLICY "ai_conv_insert" ON public.ai_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ai_conv_delete" ON public.ai_conversations;
CREATE POLICY "ai_conv_delete" ON public.ai_conversations FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

-- Vue usage Lydie AI pour dashboard
CREATE OR REPLACE VIEW public.lydie_usage_stats AS
SELECT
  u.id AS user_id,
  u.full_name,
  u.role,
  COUNT(c.id) FILTER (WHERE c.role = 'user') AS messages_sent,
  COUNT(DISTINCT c.session_id) AS sessions,
  COUNT(c.id) FILTER (WHERE c.context_type = 'commercial') AS commercial_queries,
  COUNT(c.id) FILTER (WHERE c.context_type = 'technique')  AS technique_queries,
  COUNT(c.id) FILTER (WHERE c.context_type = 'projet')     AS projet_queries,
  MAX(c.created_at) AS last_used_at
FROM public.users_profiles u
LEFT JOIN public.ai_conversations c ON c.user_id = u.id
GROUP BY u.id, u.full_name, u.role;
