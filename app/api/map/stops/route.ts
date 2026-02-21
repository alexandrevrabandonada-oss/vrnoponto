import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        // "days" parameter could be used to dynamically change the view,
        // mas no MVP fizemos a lógica hardcoded de 30 dias na view para performance.
        // O daysParam aqui fica como feature futura caso a view passe a ser Function RPC.
        const daysParam = searchParams.get('days') || '30';

        const supabase = await createClient();

        // 1. Busca todos os pontos ATIVOS com base na tabela principal `public.stops`
        // Usamos postgis para extrair lat/lng da column `location` que é GEOGRAPHY
        // Para simplificar, nós colocamos na View vw_stop_wait_30d as coords direto.
        // Contudo, nós queremos renderizar MESMO pontos sem dados recentes no mapa (verde ou cinza).
        // Então buscaremos todos os pontos (via RPC ou cruzamento) e a View isolada.

        // Estratégia de busca cruzada para JSON otimizado
        // const { data: stops, error: stopsError } = await supabase
        //    .rpc('rpc_get_active_stops_with_metrics', { p_days: parseInt(daysParam) });

        // NOTA: Como não criamos uma RPC `rpc_get_active_stops_with_metrics` ainda,
        // Faremos a leitura das duas fontes e merge no nodeJS.
        const { data: activeStops, error: dbError1 } = await supabase
            .from('stops')
            .select('id, name, location, is_active')
            .eq('is_active', true);

        if (dbError1) throw dbError1;

        const { data: activeMetrics, error: dbError2 } = await supabase
            .from('vw_stop_wait_30d')
            .select('*');

        if (dbError2) throw dbError2;

        // Merge O(n)
        const metricsMap = new Map();
        activeMetrics?.forEach(m => {
            metricsMap.set(m.stop_id, m);
        });

        // Parse PostGIS EWKB Text or Object. 
        // Supabase JS usa o `{ type: 'Point', coordinates: [lng, lat] }` nativamente p/ GeoJSON
        const combinedStops = activeStops?.map(s => {
            const metrics = metricsMap.get(s.id);
            // location in supabase-js might come as GeoJSON or EWKT.
            // If it's a string EWKT: "0101000020E6100000..." -> we better parse the original JSON, 
            // Mas o supabase-js v2 geralmente traduz `GEOGRAPHY` pra `{ "type": "Point", "coordinates": [...] }`
            let lng = metrics?.lng;
            let lat = metrics?.lat;

            // Fallback se n tiver metrics
            if (s.location && typeof s.location === 'object' && s.location.coordinates) {
                lng = s.location.coordinates[0];
                lat = s.location.coordinates[1];
            }

            return {
                id: s.id,
                name: s.name,
                location: { lat, lng },
                metrics: metrics ? {
                    p50_wait_min: metrics.p50_wait_min,
                    p90_wait_min: metrics.p90_wait_min,
                    samples: metrics.samples
                } : null
            };
        });

        return NextResponse.json({
            generated_at: new Date().toISOString(),
            window_days: parseInt(daysParam),
            stops: combinedStops || []
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
