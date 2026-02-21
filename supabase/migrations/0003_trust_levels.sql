-- Adicionar a coluna trust_level na tabela principal de stop_events
ALTER TABLE public.stop_events
ADD COLUMN trust_level VARCHAR NOT NULL DEFAULT 'L1'
CHECK (trust_level IN ('L1', 'L2', 'L3'));

-- A tabela trust_confirmations já foi criada na init, mas 
-- foi idealizada de maneira q referenciaria a confirmação. 
-- Já suportamos (event_id, device_id). Vamos apenas criar 
-- uma UNIQUE CONSTRAINT pra não permitir q o mesmo device confirme o mesmo evento X vezes
ALTER TABLE public.trust_confirmations
ADD CONSTRAINT uq_trust_conf_event_device UNIQUE (event_id, device_id);

-- E também atualizar no view
DROP VIEW IF EXISTS public.vw_recent_stop_events;
CREATE VIEW public.vw_recent_stop_events AS
SELECT e.id, e.stop_id, e.line_id, e.event_type, e.occurred_at, e.trust_level,
       s.name as stop_name, l.code as line_code
FROM public.stop_events e
JOIN public.stops s ON e.stop_id = s.id
JOIN public.lines l ON e.line_id = l.id
WHERE e.occurred_at >= NOW() - INTERVAL '2 hours';
