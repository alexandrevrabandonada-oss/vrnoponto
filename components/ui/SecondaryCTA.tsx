'use client';

import * as React from 'react';
import { Button } from './Button';

type SecondaryCTAProps = React.ComponentProps<typeof Button>;

export const SecondaryCTA = (props: SecondaryCTAProps) => {
    const {
        children,
        href,
        icon,
        variant = 'secondary',
        className = '',
        ...rest
    } = props;
    return (
        <Button
            variant={variant}
            href={href as any}
            icon={icon}
            className={`w-full !h-12 !text-base ${className}`}
            {...rest}
        >
            {children}
        </Button>
    );
};
