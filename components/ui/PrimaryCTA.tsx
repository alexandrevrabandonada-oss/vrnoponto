'use client';

import * as React from 'react';
import { Button } from './Button';
import { ArrowRight } from 'lucide-react';

type ButtonProps = React.ComponentProps<typeof Button>;

export const PrimaryCTA = (props: ButtonProps) => {
    const {
        children,
        icon = <ArrowRight size={20} />,
        className = '',
        ...rest
    } = props;

    // We use a type assertion to ButtonProps to avoid union spread issues
    // without using 'any', satisfying the linter.
    const buttonProps = {
        variant: 'primary' as const,
        icon,
        iconPosition: 'right' as const,
        className: `w-full !h-14 !text-xl shadow-brand/10 hover:shadow-brand/20 transition-all ${className}`,
        ...rest
    } as ButtonProps;

    return (
        <Button {...buttonProps}>
            {children}
        </Button>
    );
};
