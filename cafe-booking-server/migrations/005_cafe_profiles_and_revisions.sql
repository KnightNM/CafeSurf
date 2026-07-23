ALTER TABLE public.cafes
  ALTER COLUMN area TYPE TEXT,
  ADD COLUMN description TEXT NOT NULL DEFAULT '',
  ADD COLUMN contact_phone VARCHAR(30),
  ADD COLUMN contact_email VARCHAR(254),
  ADD COLUMN website_url TEXT,
  ADD COLUMN amenities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN opening_hours JSONB NOT NULL DEFAULT jsonb_build_object(
    'monday', jsonb_build_object('closed', false, 'open', 0, 'close', 24),
    'tuesday', jsonb_build_object('closed', false, 'open', 0, 'close', 24),
    'wednesday', jsonb_build_object('closed', false, 'open', 0, 'close', 24),
    'thursday', jsonb_build_object('closed', false, 'open', 0, 'close', 24),
    'friday', jsonb_build_object('closed', false, 'open', 0, 'close', 24),
    'saturday', jsonb_build_object('closed', false, 'open', 0, 'close', 24),
    'sunday', jsonb_build_object('closed', false, 'open', 0, 'close', 24)
  ),
  ADD COLUMN house_rules TEXT NOT NULL DEFAULT '',
  ADD COLUMN access_instructions TEXT NOT NULL DEFAULT '',
  ADD COLUMN publication_status VARCHAR(20) NOT NULL DEFAULT 'published'
    CHECK (publication_status IN ('published', 'archived')),
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  ADD COLUMN published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN archived_at TIMESTAMPTZ;

ALTER TABLE public.bookings
  ADD COLUMN cancellation_reason TEXT;

CREATE TABLE public.cafe_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'archive')),
  proposed_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  proposed_cover_image_path TEXT,
  proposed_cover_content_type TEXT,
  base_version INTEGER CHECK (base_version IS NULL OR base_version >= 1),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT cafe_revision_shape CHECK (
    (action = 'create' AND base_version IS NULL
      AND ((status = 'approved' AND cafe_id IS NOT NULL) OR (status <> 'approved' AND cafe_id IS NULL)))
    OR
    (action IN ('update', 'archive') AND cafe_id IS NOT NULL AND base_version IS NOT NULL)
  )
);

CREATE UNIQUE INDEX cafe_revisions_one_open_per_cafe
  ON public.cafe_revisions(cafe_id)
  WHERE cafe_id IS NOT NULL AND status IN ('draft', 'pending');

CREATE INDEX cafe_revisions_owner_updated
  ON public.cafe_revisions(owner_id, updated_at DESC);

CREATE INDEX cafe_revisions_review_queue
  ON public.cafe_revisions(status, submitted_at);

ALTER TABLE public.cafe_revisions ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'cafe-revision-covers',
  'cafe-revision-covers',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
