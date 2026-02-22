'use client';

import * as React from 'react';

type BaseProps = {
    variant?: 'primary' | 'secondary' | 'ghost';
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
};

type ButtonAsButtonProps = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };
type ButtonAsLinkProps = BaseProps & React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
    (props, ref) => {
        const { className = '', variant = 'primary', icon: Icon, iconPosition = 'left', loading, children } = props;

        const baseStyles = 'inline-flex items-center justify-center gap-2 px-6 py-4 font-industrial text-lg uppercase tracking-tight transition-all active:scale-95 focus-ring disabled:opacity-50 disabled:pointer-events-none rounded-xl';

        const variants = {
            primary: 'bg-brand text-black hover:bg-[#E5B800] shadow-2xl',
            secondary: 'bg-transparent border-2 border-brand text-brand hover:bg-brand/5',
            ghost: 'bg-transparent text-muted hover:text-white hover:bg-white/5 px-2 py-2',
        };

        const content = (
            <>
                {loading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />}
                {!loading && Icon && iconPosition === 'left' && Icon}
                {children}
                {!loading && Icon && iconPosition === 'right' && Icon}
            </>
        );

        // Discriminate based on href
        if ('href' in props && props.href) {
            const { href, ...linkRest } = props as ButtonAsLinkProps;
            return (
                <a
                    ref={ref as React.Ref<HTMLAnchorElement>}
                    href={href}
                    className={`${baseStyles} ${variants[variant]} ${className}`}
                    {...linkRest}
                >
                    {content}
                </a>
            );
        }

        const { ...buttonRest } = props as ButtonAsButtonProps;

        return (
            <button
                ref={ref as React.Ref<HTMLButtonElement>}
                className={`${baseStyles} ${variants[variant]} ${className}`}
                disabled={loading || buttonRest.disabled}
                {...buttonRest}
            >
                {content}
            </button>
        );
    }
);

Button.displayName = 'Button';
