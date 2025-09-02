CREATE TABLE IF NOT EXISTS public.scene_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID NOT NULL,
  status TEXT NOT NULL,
  provider_job_id TEXT,
  source_url TEXT,
  ingested_source_id TEXT,
  rendition_url TEXT,
  selected BOOLEAN DEFAULT FALSE,
  cost_cents INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ready_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_scene FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE
);

ALTER TABLE public.scene_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their scene_versions" ON public.scene_versions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert scene_versions" ON public.scene_versions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update scene_versions" ON public.scene_versions
  FOR UPDATE TO authenticated USING (true);