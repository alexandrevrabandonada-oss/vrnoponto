export interface GlossaryTerm {
    title: string;
    description: string;
}

export const GLOSSARY: Record<string, GlossaryTerm> = {
    ponto: {
        title: 'Ponto',
        description: 'Parada física onde os passageiros aguardam o ônibus.'
    },
    linha: {
        title: 'Linha',
        description: 'O trajeto específico feito pelo ônibus (ex: 210, 325).'
    },
    bairro: {
        title: 'Bairro',
        description: 'Região da cidade onde os pontos e linhas estão localizados.'
    },
    relato: {
        title: 'Relato',
        description: 'O registro de um evento (ex: "o ônibus passou", "cheguei no ponto").'
    },
    prova_forte: {
        title: 'Prova Forte',
        description: 'Um relato que foi validado tecnicamente (por GPS ou cruzamento de dados).'
    },
    amostra_minima: {
        title: 'Amostra Mínima',
        description: 'Número mínimo de 3 relatos necessários para gerar estatísticas confiáveis.'
    },
    tempo_tipico: {
        title: 'Tempo Típico',
        description: 'O tempo médio ou mais comum de espera registrado recentemente.'
    },
    cenario_critico: {
        title: 'Cenário Crítico',
        description: 'O tempo de espera mais longo registrado (atinge 90% dos usuários).'
    },
    confiabilidade: {
        title: 'Confiabilidade',
        description: 'O nível de certeza que temos sobre os horários baseado na quantidade de dados.'
    }
};

export type GlossaryKey = keyof typeof GLOSSARY;
