
-- Create food item status enum
CREATE TYPE public.food_status AS ENUM ('active', 'consumed', 'wasted');

-- Create user_settings table
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  default_expiry_days INTEGER NOT NULL DEFAULT 7,
  notify_days_before INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create food_items table
CREATE TABLE public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  expiry_date DATE NOT NULL,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  status food_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own food items" ON public.food_items
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food items" ON public.food_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food items" ON public.food_items
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own food items" ON public.food_items
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create index for common queries
CREATE INDEX food_items_user_status_expiry ON public.food_items(user_id, status, expiry_date);

-- Auto-create user_settings on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_settings();

-- Create storage bucket for fridge images
INSERT INTO storage.buckets (id, name, public) VALUES ('fridge-images', 'fridge-images', true);

-- Storage policies
CREATE POLICY "Users can upload fridge images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fridge-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view fridge images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'fridge-images');

CREATE POLICY "Users can delete own fridge images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'fridge-images' AND (storage.foldername(name))[1] = auth.uid()::text);
