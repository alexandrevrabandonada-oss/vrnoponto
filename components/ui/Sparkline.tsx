'use client';

import * as React from 'react';

/**
 * Technical Sparkline Component
 * Design: High-contrast yellow/industrial for technical data visualization.
 * Supports: Simple number arrays or data objects with week_start/p90.
 */

interface SparklineDataPoint {
    value: number;
    week_start?: string;
    p90?: number;
}

interface SparklineProps {
    data: (number | SparklineDataPoint)[];
    width?: number;
    height?: number;
    color?: string;
    showPoints?: boolean;
}

export function Sparkline({
    data,
    width = 200,
    height = 40,
    color = '#FFCC00',
    showPoints = true
}: SparklineProps) {
    if (!data || data.length < 2) {
        return <div className="text-[10px] font-black uppercase tracking-tighter text-white/20">Dados insuficientes</div>;
    }

    // Normalize data
    const points: SparklineDataPoint[] = data.map(d =>
        typeof d === 'number' ? { value: d } : d
    );

    const values = points.map(p => p.value);
    const p90s = points.map(p => p.p90).filter((v): v is number => v !== undefined);

    const min = 0; // Baseline at zero for bus waits
    const max = Math.max(...values, ...p90s, 10); // Minimum 10min scale

    const getX = (i: number) => (i / (points.length - 1)) * width;
    const getY = (val: number) => height - ((val - min) / (max - min)) * height;

    const pathData = points.map((p, i) => `${getX(i)},${getY(p.value)}`).join(' ');
    const hasP90 = points.some(p => p.p90 !== undefined);

    return (
        <div className="flex flex-col gap-1">
            <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
                {/* P90 Technical Projection (Dashed) */}
                {hasP90 && (
                    <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth="1"
                        strokeDasharray="4,2"
                        opacity="0.2"
                        points={points.map((p, i) => `${getX(i)},${p.p90 !== undefined ? getY(p.p90) : getY(p.value)}`).join(' ')}
                    />
                )}

                {/* Main Trend Line (P50/Actual) */}
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pathData}
                />

                {/* Data Points */}
                {showPoints && points.map((p, i) => (
                    <circle
                        key={i}
                        cx={getX(i)}
                        cy={getY(p.value)}
                        r="2.5"
                        fill={color}
                        className="transition-all hover:r-4"
                    />
                ))}
            </svg>
        </div>
    );
}
