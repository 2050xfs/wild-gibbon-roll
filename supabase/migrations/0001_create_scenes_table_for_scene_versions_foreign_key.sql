CREATE TABLE IF NOT EXISTS public.scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID,
  idx INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read scenes" ON public.scenes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert scenes" ON public.scenes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update scenes" ON public.scenes
  FOR UPDATE TO authenticated USING (true);