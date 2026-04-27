-- Recipe cache (shared across users, no PII)
CREATE TABLE public.recipe_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  spoonacular_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  source_url TEXT,
  ready_minutes INTEGER,
  servings INTEGER,
  likes INTEGER DEFAULT 0,
  used_ingredients JSONB DEFAULT '[]'::jsonb,
  missed_ingredients JSONB DEFAULT '[]'::jsonb,
  payload JSONB,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipe_cache_key ON public.recipe_cache(cache_key);
CREATE INDEX idx_recipe_cache_cached_at ON public.recipe_cache(cached_at);

ALTER TABLE public.recipe_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read recipe cache"
  ON public.recipe_cache FOR SELECT
  TO authenticated
  USING (true);

-- Recipe history (per user)
CREATE TABLE public.recipe_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  spoonacular_id INTEGER NOT NULL,
  title TEXT,
  image_url TEXT,
  action TEXT NOT NULL CHECK (action IN ('viewed','cooked','saved','skipped')),
  ingredients_used JSONB DEFAULT '[]'::jsonb,
  waste_saved_sgd NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipe_history_user ON public.recipe_history(user_id, created_at DESC);

ALTER TABLE public.recipe_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recipe history"
  ON public.recipe_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipe history"
  ON public.recipe_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipe history"
  ON public.recipe_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);