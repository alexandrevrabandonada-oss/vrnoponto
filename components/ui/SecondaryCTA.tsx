'use client';

import * as React from 'react';
import { Button } from './Button';

type ButtonProps = React.ComponentProps<typeof Button>;

export const SecondaryCTA = (props: ButtonProps) => {
    const {
        children,
        className = '',
        variant = 'secondary',
        ...rest
    } = props;

    // Type assertion to ButtonProps to avoid union spread issues
    const buttonProps = {
        variant,
        className: `w-full !h-12 !text-base ${className}`,
        ...rest
    } as ButtonProps;

    return (
        <Button {...buttonProps}>
            {children}
        </Button>
    );
};
