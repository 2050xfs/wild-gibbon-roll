CREATE TABLE IF NOT EXISTS public.renders (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  url TEXT,
  poster TEXT,
  thumbnail TEXT,
  error TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.renders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read renders" ON public.renders
  FOR SELECT USING (true);

CREATE POLICY "Webhooks can insert/update renders" ON public.renders
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Webhooks can update renders" ON public.renders
  FOR UPDATE TO authenticated USING (true);