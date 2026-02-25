'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

interface AdminGuardProps {
    children: React.ReactNode;
}

/**
 * Guardrail simples: renderiza conteúdo apenas em rotas /admin/*.
 */
export function AdminGuard({ children }: AdminGuardProps) {
    const pathname = usePathname();
    const isAdminRoute = pathname?.startsWith('/admin');

    if (!isAdminRoute) return null;

    return <>{children}</>;
}

