import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()

        // Testa conectividade simples com uma query leve
        const { error } = await supabase.from('_health_check').select('id').limit(1);

        // Mesmo que a tabela não exista, o fato de retornar um erro estruturado
        // do Postgres significa que a conexão HTTP / Auth funcionou.
        // Se a URL ou Key fossem totalmente inválidas, poderia dar throw ou erro CORS/Auth.

        return NextResponse.json({
            status: 'ok',
            supabase: 'connected',
            dbError: error ? error.message : null
        }, { status: 200 })
    } catch (error) {
        const errMessage = error instanceof Error ? error.message : 'Supabase connection failed';
        return NextResponse.json({
            status: 'error',
            supabase: 'disconnected',
            message: errMessage
        }, { status: 500 })
    }
}
