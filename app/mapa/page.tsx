import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

function buildQuery(params: SearchParams): string {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'string' && value.length > 0) {
            query.set(key, value);
            return;
        }

        if (Array.isArray(value)) {
            value.filter((v) => typeof v === 'string' && v.length > 0).forEach((v) => {
                query.append(key, v);
            });
        }
    });

    const raw = query.toString();
    return raw ? `?${raw}` : '';
}

export default async function MapaIndexPage(props: { searchParams: Promise<SearchParams> }) {
    const searchParams = await props.searchParams;
    const suffix = buildQuery(searchParams);
    redirect(`/mapa/bairros${suffix}`);
}

