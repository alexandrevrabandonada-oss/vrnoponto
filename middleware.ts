import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function getSafeAdminNext(nextPath: string | null): string {
    if (!nextPath) return '/admin';
    if (!nextPath.startsWith('/admin')) return '/admin';
    return nextPath;
}

export function middleware(request: NextRequest) {
    // Apenas proteger rotas que começam com /admin
    if (request.nextUrl.pathname.startsWith('/admin')) {
        const pathname = request.nextUrl.pathname;
        const isLoginRoute = pathname === '/admin/login';

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
            // Compatibilidade para páginas client-side que ainda leem token via document.cookie
            response.cookies.set('admin_token', urlToken, {
                path: '/admin',
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 1 semana
            })

            return response
        }

        // 3. Se não veio via query param, verificar se há um cookie válido
        const cookieToken =
            request.cookies.get('vrnp_admin_token')?.value ||
            request.cookies.get('admin_token')?.value;

        if (cookieToken === adminTokenEnv) {
            if (isLoginRoute) {
                const target = getSafeAdminNext(request.nextUrl.searchParams.get('next'));
                return NextResponse.redirect(new URL(target, request.url));
            }

            // Cookie válido, segue o jogo
            const response = NextResponse.next();
            // Garante cookie de compatibilidade sempre atualizado para páginas client-side.
            response.cookies.set('admin_token', cookieToken, {
                path: '/admin',
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 1 semana
            });
            return response;
        }

        // 4. Sem token ou token inválido -> redirecionar para login admin.
        if (isLoginRoute) {
            return NextResponse.next();
        }

        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
        return NextResponse.redirect(loginUrl);
    }

    // Deixar as rotas públicas passarem
    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
}
