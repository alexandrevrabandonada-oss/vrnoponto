'use client';

interface SparklineData {
    week_start: string;
    value: number;
    p90?: number;
}

export function Sparkline({ data, height = 40, width = 200, color = '#6366f1' }: {
    data: SparklineData[],
    height?: number,
    width?: number,
    color?: string
}) {
    if (!data || data.length < 2) return <div className="text-zinc-500 text-xs">Dados insuficientes</div>;

    const values = data.map(d => d.value);
    const min = 0; // Iniciar do zero faz mais sentido para tempo
    const max = Math.max(...values, 10); // Pelo menos 10 para escala

    const getX = (index: number) => (index / (data.length - 1)) * width;
    const getY = (val: number) => height - ((val - min) / (max - min)) * height;

    const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');

    return (
        <div className="flex flex-col gap-1">
            <svg width={width} height={height} className="overflow-visible">
                {/* Linha P50 */}
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                />

                {/* Linha P90 opcional (tracejada) */}
                {data[0].p90 !== undefined && (
                    <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth="1"
                        strokeDasharray="4,2"
                        opacity="0.3"
                        points={data.map((d, i) => `${getX(i)},${getY(d.p90!)}`).join(' ')}
                    />
                )}

                {/* Pontos */}
                {data.map((d, i) => (
                    <circle
                        key={i}
                        cx={getX(i)}
                        cy={getY(d.value)}
                        r="3"
                        fill={color}
                        className="transition-all hover:r-4"
                    />
                ))}
            </svg>
        </div>
    );
}
