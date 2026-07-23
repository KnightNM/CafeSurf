ALTER TABLE public.cafes
  ADD COLUMN google_place_id TEXT;

CREATE UNIQUE INDEX cafes_google_place_id_unique
  ON public.cafes (google_place_id)
  WHERE google_place_id IS NOT NULL;
