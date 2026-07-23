ALTER TABLE public.cafes
  ADD COLUMN google_business_status TEXT,
  ADD COLUMN google_imported_at TIMESTAMPTZ;

UPDATE public.cafes
SET opening_hours = (
  SELECT jsonb_object_agg(
    day_name,
    CASE
      WHEN schedule ? 'periods' THEN schedule
      ELSE jsonb_build_object(
        'closed', COALESCE((schedule->>'closed')::boolean, true),
        'periods', CASE
          WHEN COALESCE((schedule->>'closed')::boolean, true) THEN '[]'::jsonb
          ELSE jsonb_build_array(jsonb_build_object(
            'open_minute', COALESCE((schedule->>'open')::int, 0) * 60,
            'close_minute', COALESCE((schedule->>'close')::int, 24) * 60
          ))
        END
      )
    END
  )
  FROM jsonb_each(opening_hours) AS entry(day_name, schedule)
);

ALTER TABLE public.cafes
  ALTER COLUMN opening_hours SET DEFAULT jsonb_build_object(
    'monday', jsonb_build_object('closed', false, 'periods', jsonb_build_array(jsonb_build_object('open_minute', 0, 'close_minute', 1440))),
    'tuesday', jsonb_build_object('closed', false, 'periods', jsonb_build_array(jsonb_build_object('open_minute', 0, 'close_minute', 1440))),
    'wednesday', jsonb_build_object('closed', false, 'periods', jsonb_build_array(jsonb_build_object('open_minute', 0, 'close_minute', 1440))),
    'thursday', jsonb_build_object('closed', false, 'periods', jsonb_build_array(jsonb_build_object('open_minute', 0, 'close_minute', 1440))),
    'friday', jsonb_build_object('closed', false, 'periods', jsonb_build_array(jsonb_build_object('open_minute', 0, 'close_minute', 1440))),
    'saturday', jsonb_build_object('closed', false, 'periods', jsonb_build_array(jsonb_build_object('open_minute', 0, 'close_minute', 1440))),
    'sunday', jsonb_build_object('closed', false, 'periods', jsonb_build_array(jsonb_build_object('open_minute', 0, 'close_minute', 1440)))
  );
