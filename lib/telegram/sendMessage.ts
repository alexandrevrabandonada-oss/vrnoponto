/**
 * Utility to send messages via Telegram Bot API
 * Server-only as it requires TELEGRAM_BOT_TOKEN
 */

export interface TelegramOptions {
    parse_mode?: 'Markdown' | 'HTML' | 'MarkdownV2';
    disable_web_page_preview?: boolean;
    disable_notification?: boolean;
}

export async function sendTelegramMessage(text: string, options: TelegramOptions = {}) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.warn('Telegram Bot Token or Chat ID missing. Skipping notification.');
        return { success: false, error: 'Telegram credentials missing' };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const body = {
        chat_id: chatId,
        text,
        parse_mode: options.parse_mode || 'Markdown',
        disable_web_page_preview: options.disable_web_page_preview ?? true,
        disable_notification: options.disable_notification ?? false,
    };

    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (res.ok && data.ok) {
                return { success: true, data };
            }

            lastError = data.description || `HTTP ${res.status}`;
            console.error(`Telegram attempt ${attempt} failed:`, lastError);

            // If it's a 4xx error (except rate limiting), don't retry
            if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                break;
            }
        } catch (err) {
            lastError = err instanceof Error ? err.message : 'Unknown fetch error';
            console.error(`Telegram attempt ${attempt} error:`, lastError);
        }

        if (attempt === 1) {
            // Wait slightly before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return { success: false, error: lastError };
}
