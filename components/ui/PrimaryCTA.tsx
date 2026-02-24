'use client';

import * as React from 'react';
import { Button } from './Button';
import { ArrowRight } from 'lucide-react';

type PrimaryCTAProps = React.ComponentProps<typeof Button>;

export const PrimaryCTA = (props: PrimaryCTAProps) => {
    const {
        children,
        href,
        icon = <ArrowRight size={20} />,
        className = '',
        ...rest
    } = props;
    return (
        <Button
            variant="primary"
            href={href as any}
            icon={icon}
            iconPosition="right"
            className={`w-full !h-14 !text-xl shadow-brand/10 hover:shadow-brand/20 transition-all ${className}`}
            {...rest}
        >
            {children}
        </Button>
    );
};
