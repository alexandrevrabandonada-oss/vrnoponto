import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // Auditamos apenas as 4 variáveis primordiais requeridas no Vercel Go-Live.
        const auditVars = [
            'NEXT_PUBLIC_SUPABASE_URL',
            'NEXT_PUBLIC_SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_ROLE_KEY',
            'ADMIN_TOKEN'
        ];

        const result: Record<string, string> = {};

        for (const key of auditVars) {
            if (process.env[key] && process.env[key].trim() !== '') {
                result[key] = 'OK';
            } else {
                result[key] = 'MISSING';
            }
        }

        return NextResponse.json({ env: result });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
