
-- Add phone to barbers for notifications
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS phone text;

-- Add reminder + whatsapp confirmation fields to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_by_whatsapp boolean NOT NULL DEFAULT false;

-- WhatsApp bot session state
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  state text NOT NULL DEFAULT 'idle',
  data_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  human_handoff boolean NOT NULL DEFAULT false,
  last_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_sessions_phone_idx ON public.whatsapp_sessions(phone);
CREATE INDEX IF NOT EXISTS whatsapp_sessions_updated_idx ON public.whatsapp_sessions(updated_at);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa sessions admin read" ON public.whatsapp_sessions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Required extensions for cron-driven daily reminder
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
