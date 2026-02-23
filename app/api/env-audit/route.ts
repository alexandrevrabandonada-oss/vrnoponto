import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Auditamos as variáveis primordiais requeridas no Vercel Go-Live.

        const result = {
            has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            has_admin_token: !!process.env.ADMIN_TOKEN,
            ok: false
        };

        // Consider 'ok' if public vars are present (minimum for app to render)
        result.ok = result.has_supabase_url && result.has_anon_key;

        return NextResponse.json({ env: result });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
