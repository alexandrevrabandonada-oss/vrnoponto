'use client';

import React from 'react';

interface RadioOption {
    value: string;
    label: string;
    description?: string;
}

interface RadioGroupProps {
    name: string;
    options: RadioOption[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
    id?: string;
    orientation?: 'vertical' | 'horizontal';
}

export const RadioGroup = ({ name, options, value, onChange, className = '', id, orientation = 'vertical' }: RadioGroupProps) => {
    return (
        <div
            id={id}
            className={`
                grid gap-3 ${className}
                ${orientation === 'horizontal' ? 'grid-flow-col' : ''}
            `}
            role="radiogroup"
        >
            {options.map((option) => {
                const isSelected = value === option.value;
                const optionId = `${id}-${option.value}`;

                return (
                    <label
                        key={option.value}
                        htmlFor={optionId}
                        className={`
                            relative flex cursor-pointer rounded-2xl border transition-all outline-none items-center justify-center
                            ${orientation === 'horizontal' ? 'p-2 flex-1 aspect-square' : 'p-4 min-h-[64px]'}
                            ${isSelected
                                ? 'bg-brand/5 border-brand ring-4 ring-brand/10'
                                : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]'
                            }
                        `}
                    >
                        <input
                            type="radio"
                            id={optionId}
                            name={name}
                            value={option.value}
                            checked={isSelected}
                            onChange={() => onChange(option.value)}
                            className="sr-only"
                        />
                        <div className={`flex w-full items-center ${orientation === 'horizontal' ? 'justify-center' : 'justify-between'}`}>
                            <div className={`flex flex-col ${orientation === 'horizontal' ? 'items-center text-center' : ''}`}>
                                <span className={`font-industrial text-sm uppercase tracking-widest ${isSelected ? 'text-brand' : 'text-white'}`}>
                                    {option.label}
                                </span>
                                {option.description && orientation === 'vertical' && (
                                    <span className="text-[10px] font-medium text-muted uppercase tracking-tight opacity-50">
                                        {option.description}
                                    </span>
                                )}
                            </div>
                            {orientation === 'vertical' && (
                                <div className={`
                                    flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all
                                    ${isSelected ? 'border-brand' : 'border-white/10'}
                                `}>
                                    {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-brand" />}
                                </div>
                            )}
                        </div>
                    </label>
                );
            })}
        </div>
    );
};
