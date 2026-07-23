ALTER TABLE public.bookings
  ADD COLUMN team_size INTEGER NOT NULL DEFAULT 1
  CHECK (team_size >= 1);

ALTER TABLE public.cafes
  ADD COLUMN cover_image_path TEXT;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'cafe-covers',
  'cafe-covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
