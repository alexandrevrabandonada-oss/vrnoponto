/**
 * Simple utility for conditional class names.
 * Avoids dependencies like clsx or tailwind-merge as per user guardrails.
 */
export function cn(...classes: (string | boolean | undefined | null)[]) {
    return classes.filter(Boolean).join(' ');
}
