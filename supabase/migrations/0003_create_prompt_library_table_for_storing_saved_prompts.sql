CREATE TABLE public.prompt_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt_json JSONB NOT NULL,
  fingerprint TEXT NOT NULL,
  template_version TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.prompt_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prompts" ON public.prompt_library
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prompts" ON public.prompt_library
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompts" ON public.prompt_library
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts" ON public.prompt_library
  FOR DELETE TO authenticated USING (auth.uid() = user_id);