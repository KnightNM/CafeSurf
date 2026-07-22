DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.bookings LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.cafes LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.users LIMIT 1) THEN
    RAISE EXCEPTION 'Legacy application data must be cleared with auth:reset-demo-data before applying this migration.';
  END IF;
END
$$;

ALTER TABLE public.users DROP COLUMN password_hash;

ALTER TABLE public.users
  ADD CONSTRAINT users_auth_user_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.bookings
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

CREATE TABLE public.owner_applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  business_name VARCHAR(150) NOT NULL,
  contact_phone VARCHAR(30) NOT NULL,
  cafe_name     VARCHAR(150) NOT NULL,
  location      VARCHAR(200) NOT NULL,
  notes         VARCHAR(1000),
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  review_note   VARCHAR(1000),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ
);

CREATE UNIQUE INDEX owner_applications_one_pending_per_user
  ON public.owner_applications (user_id)
  WHERE status = 'pending';

CREATE INDEX owner_applications_status_created_idx
  ON public.owner_applications (status, created_at);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    LOWER(NEW.email),
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
      SPLIT_PART(NEW.email, '@', 1)
    ),
    'customer'
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_applications ENABLE ROW LEVEL SECURITY;
