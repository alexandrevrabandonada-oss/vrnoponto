-- Migration 0021: Partner Funnel Views
-- Cria visualizações agregadas para o funil de parceiros baseadas na tabela telemetry_counts.

-- 1. Visão Diária Transposta (Últimos 60 dias)
CREATE OR REPLACE VIEW public.vw_partner_funnel_daily AS
SELECT
    d.date,
    COALESCE(MAX(CASE WHEN t.event_key = 'page_view_partners' THEN t.count END), 0) as views_partners,
    COALESCE(MAX(CASE WHEN t.event_key = 'page_view_partner_apply' THEN t.count END), 0) as views_apply,
    COALESCE(MAX(CASE WHEN t.event_key = 'partner_request_created' THEN t.count END), 0) as requests_created,
    COALESCE(MAX(CASE WHEN t.event_key = 'partner_request_approved' THEN t.count END), 0) as requests_approved,
    COALESCE(MAX(CASE WHEN t.event_key = 'partner_kit_generated' THEN t.count END), 0) as kits_generated
FROM (
    SELECT generate_series(
        current_date - interval '60 days',
        current_date,
        '1 day'::interval
    )::date AS date
) d
LEFT JOIN public.telemetry_counts t ON t.date = d.date AND t.event_key IN (
    'page_view_partners', 
    'page_view_partner_apply', 
    'partner_request_created', 
    'partner_request_approved', 
    'partner_kit_generated'
)
GROUP BY d.date
ORDER BY d.date DESC;


-- 2. Resumo de 30 Dias (Totais e Taxas)
CREATE OR REPLACE VIEW public.vw_partner_funnel_summary_30d AS
WITH totals AS (
    SELECT
        SUM(views_partners) as total_views_partners,
        SUM(views_apply) as total_views_apply,
        SUM(requests_created) as total_requests_created,
        SUM(requests_approved) as total_requests_approved,
        SUM(kits_generated) as total_kits_generated
    FROM public.vw_partner_funnel_daily
    WHERE date >= current_date - interval '30 days'
)
SELECT
    total_views_partners,
    total_views_apply,
    total_requests_created,
    total_requests_approved,
    total_kits_generated,
    -- Taxas de Conversão (com safe division para evitar div/0)
    CASE WHEN total_views_apply > 0 
         THEN ROUND((total_requests_created::numeric / total_views_apply::numeric) * 100, 1) 
         ELSE 0.0 END AS apply_rate_pct,
         
    CASE WHEN total_requests_created > 0 
         THEN ROUND((total_requests_approved::numeric / total_requests_created::numeric) * 100, 1) 
         ELSE 0.0 END AS approval_rate_pct,
         
    CASE WHEN total_requests_approved > 0 
         THEN ROUND((total_kits_generated::numeric / total_requests_approved::numeric) * 100, 1) 
         ELSE 0.0 END AS kit_rate_pct
FROM totals;

-- Garantir acesso da view para service_role e anon (se necessário, ou roles adm)
GRANT SELECT ON public.vw_partner_funnel_daily TO anon, authenticated, service_role;
GRANT SELECT ON public.vw_partner_funnel_summary_30d TO anon, authenticated, service_role;
