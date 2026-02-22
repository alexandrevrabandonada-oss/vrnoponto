-- Migration 0028 (patched): Stop × Line Promised vs Real (30d)
-- Fix: official_schedule_hourly does NOT have line_id; derive line_id from official_schedules (active schedule per line)
-- Robust: supports presence/absence of override_promised_headway_min

DO $$
DECLARE
  has_override boolean;
  v_sql text;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='official_schedule_hourly'
      AND column_name='override_promised_headway_min'
  ) INTO has_override;

  IF has_override THEN
    v_sql := $view$
      CREATE OR REPLACE VIEW public.vw_stopline_promised_vs_real_30d AS
      WITH active_schedules AS (
        SELECT DISTINCT ON (os.line_id)
          os.line_id,
          os.id AS schedule_id
        FROM public.official_schedules os
        WHERE os.doc_type = 'HORARIO'
          AND os.line_id IS NOT NULL
        ORDER BY os.line_id,
                 os.valid_from DESC NULLS LAST,
                 os.fetched_at DESC NULLS LAST
      ),
      promised AS (
        SELECT
          a.line_id,
          sh.day_group,
          sh.hour,
          COALESCE(sh.override_promised_headway_min, sh.promised_headway_min) AS promised_headway_min
        FROM active_schedules a
        JOIN public.official_schedule_hourly sh
          ON sh.schedule_id = a.schedule_id
      )
      SELECT
        r.stop_id,
        r.line_id,
        r.day_group,
        r.hour,
        p.promised_headway_min,
        r.real_p50_headway_min,
        ROUND((r.real_p50_headway_min - p.promised_headway_min)::numeric, 1) AS delta_min,
        CASE
          WHEN p.promised_headway_min > 0
          THEN ROUND(((r.real_p50_headway_min - p.promised_headway_min) / p.promised_headway_min * 100.0)::numeric, 1)
          ELSE NULL
        END AS delta_pct,
        r.samples,
        r.pct_verified,
        CASE
          WHEN p.promised_headway_min IS NULL THEN 'NO_PROMISE'
          ELSE 'OK'
        END AS meta
      FROM public.vw_stopline_headway_hourly_30d r
      LEFT JOIN promised p
        ON p.line_id = r.line_id
       AND p.day_group = r.day_group
       AND p.hour = r.hour;
    $view$;
  ELSE
    v_sql := $view$
      CREATE OR REPLACE VIEW public.vw_stopline_promised_vs_real_30d AS
      WITH active_schedules AS (
        SELECT DISTINCT ON (os.line_id)
          os.line_id,
          os.id AS schedule_id
        FROM public.official_schedules os
        WHERE os.doc_type = 'HORARIO'
          AND os.line_id IS NOT NULL
        ORDER BY os.line_id,
                 os.valid_from DESC NULLS LAST,
                 os.fetched_at DESC NULLS LAST
      ),
      promised AS (
        SELECT
          a.line_id,
          sh.day_group,
          sh.hour,
          sh.promised_headway_min
        FROM active_schedules a
        JOIN public.official_schedule_hourly sh
          ON sh.schedule_id = a.schedule_id
      )
      SELECT
        r.stop_id,
        r.line_id,
        r.day_group,
        r.hour,
        p.promised_headway_min,
        r.real_p50_headway_min,
        ROUND((r.real_p50_headway_min - p.promised_headway_min)::numeric, 1) AS delta_min,
        CASE
          WHEN p.promised_headway_min > 0
          THEN ROUND(((r.real_p50_headway_min - p.promised_headway_min) / p.promised_headway_min * 100.0)::numeric, 1)
          ELSE NULL
        END AS delta_pct,
        r.samples,
        r.pct_verified,
        CASE
          WHEN p.promised_headway_min IS NULL THEN 'NO_PROMISE'
          ELSE 'OK'
        END AS meta
      FROM public.vw_stopline_headway_hourly_30d r
      LEFT JOIN promised p
        ON p.line_id = r.line_id
       AND p.day_group = r.day_group
       AND p.hour = r.hour;
    $view$;
  END IF;

  EXECUTE v_sql;
END $$;