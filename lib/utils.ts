/**
 * Simple utility for conditional class names.
 */
export function cn(...classes: (string | boolean | undefined | null)[]) {
    return classes.filter(Boolean).join(' ');
}

/**
 * Normalizes stop names for better readability.
 * - Trims and collapses spaces.
 * - Fixes all-caps input.
 */
export function formatStopName(name: string): string {
    if (!name) return '';

    // 1. Trim and collapse spaces
    let result = name.trim().replace(/\s+/g, ' ');

    // 2. Avoid all caps
    if (result === result.toUpperCase() && result.length > 3) {
        result = result.charAt(0) + result.slice(1).toLowerCase();
        // Capitalize after space if it's a "proper" word (heuristic)
        result = result.split(' ').map(word => {
            if (word.length <= 2) return word.toLowerCase(); // a, o, em, de
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    }

    return result;
}
