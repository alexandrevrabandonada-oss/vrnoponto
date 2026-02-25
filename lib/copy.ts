export const dictionary = {
    'wait.median': 'Espera (Mediana)',
    'wait.average': 'Atraso Médio',
    'alerts.critical': 'Alertas Críticos (P1)',
    'alerts.warning': 'Avisos de Frequência (P2)',
    'status.bad': 'Ruim ou Péssimo',
    'status.delay': 'Atrasos Leves',
    'action.report': 'Relatar agora',
    'action.create': 'Criar Registros',
    'metric.worst': 'Pior Atraso',
    'samples.audit': 'Relatos da Comunidade',
    'samples.total': 'registros comunitários',
    'trend.stable': 'estável',
    'trend.worsening': 'Piora de',
    'trend.improving': 'Melhora de',
    'empty.history': 'Nenhum histórico reportado neste bairro.',
};

export type CopyKey = keyof typeof dictionary;

export function t(key: CopyKey, fallback?: string): string {
    return dictionary[key] || fallback || key;
}
