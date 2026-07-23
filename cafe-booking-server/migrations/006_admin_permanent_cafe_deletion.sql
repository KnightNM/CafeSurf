ALTER TABLE public.cafe_revisions
  DROP CONSTRAINT cafe_revisions_cafe_id_fkey;

ALTER TABLE public.cafe_revisions
  ADD CONSTRAINT cafe_revisions_cafe_id_fkey
  FOREIGN KEY (cafe_id)
  REFERENCES public.cafes(id)
  ON DELETE CASCADE;
