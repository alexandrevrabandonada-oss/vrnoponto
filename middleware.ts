import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Apenas proteger rotas que começam com /admin
    if (request.nextUrl.pathname.startsWith('/admin')) {

        // 1. Verificar se a funcionalidade admin está habilitada globalmente
        const adminTokenEnv = process.env.ADMIN_TOKEN;
        if (!adminTokenEnv) {
            // Retorna uma reescrita ou erro simples avisando que o Admin está desativado na infraestrutura
            return new NextResponse('Admin desabilitado. Defina ADMIN_TOKEN nas variáveis de ambiente.', { status: 403 });
        }

        // 2. Verificar se o usuário está tentando se autenticar via query param (?t=TOKEN)
        const urlToken = request.nextUrl.searchParams.get('t');

        if (urlToken === adminTokenEnv) {
            // Autenticação aceita via URL. Vamos setar o cookie e redirecionar pra limpar a URL.
            const url = request.nextUrl.clone()
            url.searchParams.delete('t')

            const response = NextResponse.redirect(url)
            response.cookies.set('vrnp_admin_token', urlToken, {
                path: '/admin',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 1 semana
            })

            return response
        }

        // 3. Se não veio via query param, verificar se há um cookie válido
        const cookieToken = request.cookies.get('vrnp_admin_token')?.value;

        if (cookieToken === adminTokenEnv) {
            // Cookie válido, segue o jogo
            return NextResponse.next();
        }

        // 4. Sem token ou token inválido -> Bloquear acesso
        return new NextResponse('Acesso Negado (401 Unauthorized)', { status: 401 });
    }

    // Deixar as rotas públicas passarem
    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
}
