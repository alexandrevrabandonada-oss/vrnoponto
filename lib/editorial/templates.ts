/**
 * Editorial Kit Templates Logic
 * Provides functions to generate captions based on transport metrics.
 */

export type EditorialTone = 'direct' | 'explanatory' | 'convocatory';

interface CaptionOutput {
    caption: string;
    shortCaption: string;
    hashtags: string;
    cta: string;
}

// Helpers
const formatMin = (m: number | null) => m ? `${Math.round(m)}min` : '--';
const formatPct = (p: number | null) => p !== null ? `${p > 0 ? '+' : ''}${p.toFixed(p % 1 === 0 ? 0 : 1)}%` : '0%';

/**
 * Weekly Bulletin Templates
 */
export function generateBulletinCaption(data: { summary: { total: number, CRIT: number, WARN: number }, worstStops: { stop_name: string, p50_wait_min: number }[], worstLines: { line_id: string, p50_headway_min: number }[] }, tone: EditorialTone): CaptionOutput {
    const { summary, worstStops, worstLines } = data;
    const isSmallSample = summary.total < 5;

    const headlines = {
        direct: `A realidade das ruas não mente: ${summary.CRIT} alertas críticos de transporte esta semana.`,
        explanatory: `O balanço semanal do VR no Ponto registrou ${summary.total} ocorrências de irregularidade.`,
        convocatory: `Precisamos falar sobre as linhas que estão deixando a gente na mão.`
    };

    const worstStop = worstStops?.[0];
    const worstLine = worstLines?.[0];

    let body = "";
    if (tone === 'direct') {
        body = `O serviço em Volta Redonda continua castigando quem depende do ônibus. O ponto "${worstStop?.stop_name}" registrou espera mediana de ${formatMin(worstStop?.p50_wait_min)}, enquanto a linha ${worstLine?.line_id} opera com intervalos abusivos de ${formatMin(worstLine?.p50_headway_min)}.`;
    } else if (tone === 'explanatory') {
        body = `Nossa auditoria popular consolidou ${summary.CRIT} situações de alto atraso e ${summary.WARN} avisos de irregularidade. Destaque negativo para o bairro ${worstStop?.stop_name?.split('-')?.[0] || ''}, com as maiores esperas do período.`;
    } else {
        body = `Não dá pra aceitar o descaso. O boletim mostra ${summary.CRIT} pontos críticos que precisam de intervenção imediata. O ponto "${worstStop?.stop_name}" é hoje o símbolo da falta de pontualidade.`;
    }

    if (isSmallSample) {
        body += "\n\n(Atenção: Volume de relatos baixo no período. Registre sua viagem para tornar este dado mais forte!)";
    }

    return {
        caption: `${headlines[tone]}\n\n${body}`,
        shortCaption: `${summary.CRIT} alertas críticos em VR esta semana. Pior ponto: ${worstStop?.stop_name || '--'}.`,
        hashtags: "#VRnoPonto #VoltaRedonda #TransportePublico #MobilidadeUrbana",
        cta: "Confira o boletim completo em vrnoponto.vercel.app/boletim"
    };
}

/**
 * Monthly Report Templates
 */
export function generateMonthlyCaption(data: { topStops: { stop_name: string, p50_wait_min: number, delta_p50_percent: number | null }[], topLines: { line_code: string, p50_headway_min: number, delta_p50_percent: number | null }[], month?: string }, tone: EditorialTone): CaptionOutput {
    const topStop = data.topStops?.[0];
    const topLine = data.topLines?.[0];

    const headlines = {
        direct: `RESUMO DO DESCASO: O que o transporte de VR nos reservou este mês.`,
        explanatory: `Relatório Mensal consolidado: Uma análise da confiabilidade do nosso sistema.`,
        convocatory: `Os dados estão aqui. Agora falta a prefeitura agir.`
    };

    let body = "";
    if (tone === 'direct') {
        body = `O ponto "${topStop?.stop_name}" foi o campeão de espera este mês: ${formatMin(topStop?.p50_wait_min)} de mediana. Um aumento de ${formatPct(topStop?.delta_p50_percent)} de sofrimento na vida do trabalhador.`;
    } else if (tone === 'explanatory') {
        body = `A análise mensal mostra que o ponto "${topStop?.stop_name}" e a linha ${topLine?.line_code} foram os gargalos mais frequentes para o passageiro de Volta Redonda em ${data.month || 'últimos 30 dias'}.`;
    } else {
        body = `Exigimos melhorias na linha ${topLine?.line_code}. Um intervalo médio de ${formatMin(topLine?.p50_headway_min)} é incompatível com o que a cidade precisa.`;
    }

    return {
        caption: `${headlines[tone]}\n\n${body}`,
        shortCaption: `Pior ponto do mês: ${topStop?.stop_name || '--'} (${formatMin(topStop?.p50_wait_min || null)}). Pior linha: ${topLine?.line_code || '--'}.`,
        hashtags: "#VRnoPonto #AuditoriaPopular #VoltaRedonda #ManifestoTransporte",
        cta: "Veja o relatório detalhado: vrnoponto.vercel.app/relatorio/mensal"
    };
}

/**
 * Stop/Point Specific Templates
 */
export function generateStopCaption(stop: { id: string, name: string, neighborhood: string }, metrics: { samples: number, p50_wait_min: number | null, p90_wait_min: number | null, delta_7d_pct: number | null }, tone: EditorialTone): CaptionOutput {
    const isSmallSample = metrics.samples < 3;
    const isWorsening = metrics.delta_7d_pct && metrics.delta_7d_pct > 0;

    const headlines = {
        direct: `Esperar no ponto ${stop.name} virou teste de paciência.`,
        explanatory: `Análise de performance: Ponto ${stop.name} (${stop.neighborhood}).`,
        convocatory: `Quem passa pelo ponto ${stop.name} merece mais respeito.`
    };

    let body = "";
    if (tone === 'direct') {
        body = `Mediana de ${formatMin(metrics.p50_wait_min)} de espera. ${isWorsening ? `Piorou ${formatPct(metrics.delta_7d_pct)} esta semana.` : 'A situação continua crítica.'} O p90 (pior caso) chega a ${formatMin(metrics.p90_wait_min)}.`;
    } else if (tone === 'explanatory') {
        body = `Com base em ${metrics.samples} auditorias, identificamos que a média de espera para quem embarca em ${stop.name} está em torno de ${formatMin(metrics.p50_wait_min)}.`;
    } else {
        body = `Vamos denunciar a demora no ponto ${stop.name}. Registre sua espera no VR no Ponto e ajude a cobrar a prefeitura.`;
    }

    if (isSmallSample) {
        body += "\n\n(Amostra pequena: Apenas " + metrics.samples + " relatos recentes aqui.)";
    }

    return {
        caption: `${headlines[tone]}\n\n${body}`,
        shortCaption: `Ponto ${stop.name}: ${formatMin(metrics.p50_wait_min)} de espera mediana. ${metrics.samples} relatos técnicos gravados.`,
        hashtags: `#VRnoPonto #${stop.neighborhood.replace(/\s+/g, '')} #OndaVerde #VRSemFila`,
        cta: "Detalhes do ponto: vrnoponto.vercel.app/ponto/" + stop.id
    };
}

/**
 * Line Specific Templates
 */
export function generateLineCaption(line: { id: string, code: string, name: string }, metrics: { samples: number, p50_headway_min: number, prev_p50?: number } | null, tone: EditorialTone): CaptionOutput {
    const isSmallSample = (metrics?.samples || 0) < 3;
    const prevP50 = metrics?.prev_p50 ?? 0;
    const isWorsening = (metrics?.p50_headway_min ?? 0) > prevP50 && prevP50 > 0;

    const headlines = {
        direct: `Linha ${line.code}: O intervalo que ninguém aguenta mais.`,
        explanatory: `Status da Linha ${line.code} (${line.name}): Dados de Headway.`,
        convocatory: `Cadê os ônibus da linha ${line.code}, prefeitura?`
    };

    let body = "";
    if (tone === 'direct') {
        body = `O intervalo entre ônibus nesta linha está em ${formatMin(metrics?.p50_headway_min || null)}. ${isWorsening ? 'A irregularidade aumentou nos últimos dias.' : 'As janelas de espera continuam excessivas.'} Um descaso com quem precisa chegar no horário.`;
    } else if (tone === 'explanatory') {
        body = `Nossa auditoria popular mediu o headway (tempo entre veículos) da linha ${line.code} e a mediana está em ${formatMin(metrics?.p50_headway_min || null)}.`;
    } else {
        body = `Não seja apenas passageiro, seja auditor. Ajude a monitorar a linha ${line.code} pelo app VR no Ponto.`;
    }

    if (isSmallSample) {
        body += "\n\n(Baixa amostragem para esta linha no momento.)";
    }

    return {
        caption: `${headlines[tone]}\n\n${body}`,
        shortCaption: `Linha ${line.code}: ${formatMin(metrics?.p50_headway_min || null)} de intervalo mediano.`,
        hashtags: `#VRnoPonto #Linha${line.code} #TransporteVR #ChegaDeEspera`,
        cta: "Status da linha: vrnoponto.vercel.app/linha/" + line.id
    };
}

/**
 * Promised vs Real Template
 */
export function generatePromisedVsRealCaption(data: { line: { id: string, code: string, name: string }, dayGroup: string, worstHour: { hour: number, promised_headway_min: number | null, real_p50_headway_min: number | null, delta_pct: number | null, samples: number } | null }, tone: EditorialTone): CaptionOutput {
    const { line, dayGroup, worstHour } = data;

    const dayName = dayGroup === 'WEEKDAY' ? 'Dias Úteis' : dayGroup === 'SAT' ? 'Sábados' : 'Domingos/Feriados';

    const headlines = {
        direct: `Promessa x Realidade: O abismo na Linha ${line.code} aos ${dayName}.`,
        explanatory: `Checagem de Fatos: A operação real da linha ${line.code} vs O quadro da Prefeitura.`,
        convocatory: `A prefeitura finge que os ônibus da ${line.code} passam, e nós fingimos que acreditamos.`
    };

    let body = "";

    if (!worstHour) {
        body = `Nossa auditoria não encontrou atrasos absurdos para a linha ${line.code} (ou precisamos de mais colaborações de passageiros para ter certeza). Continue relatando no app!`;
    } else {
        if (tone === 'direct') {
            body = `A tabela de ${dayName} promete carros a cada ${worstHour.promised_headway_min} minutos na pior faixa de horário (${worstHour.hour}h), mas na rua os passageiros aguardam a mediana de ${worstHour.real_p50_headway_min} minutos. Isso é uma explosão de +${Math.round(worstHour.delta_pct!)}% de atraso em cima da tabela.`;
        } else if (tone === 'explanatory') {
            body = `Batam as planilhas: Cruzamos a Tabela Oficial validada pela PMVR com a telemetria do VR no Ponto. A variação da Linha ${line.code} chega a picos de +${Math.round(worstHour.delta_pct!)}% de atraso contra o estipulado às ${worstHour.hour}h.`;
        } else {
            body = `Eles prometem ${worstHour.promised_headway_min}min. A vida real entrega ${worstHour.real_p50_headway_min}min (um rombo de +${Math.round(worstHour.delta_pct!)}%). Até quando a população de Volta Redonda será guiada por planilhas fictícias? Compartilhe e cobre as autoridades.`;
        }
    }

    return {
        caption: `${headlines[tone]}\n\n${body}`,
        shortCaption: worstHour ? `Linha ${line.code}: Atraso bate +${Math.round(worstHour.delta_pct!)}% sobre tabela oficial às ${worstHour.hour}h.` : `Monitoramento Prometido vs Real da Linha ${line.code}.`,
        hashtags: `#VRnoPonto #SindicatoDasEmpresas #VoltaRedonda #PrometicaXRealidade`,
        cta: "Compare a tabela oficial: vrnoponto.vercel.app/linha/" + line.id
    };
}
