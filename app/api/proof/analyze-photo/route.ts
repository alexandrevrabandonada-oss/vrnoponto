import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type AnalyzeResult = {
    ai_text: string | null;
    ai_line_guess: string | null;
    ai_confidence: number | null;
    provider: string;
};

function clampConfidence(value: number): number {
    if (!Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > 100) return 100;
    return Math.round(value);
}

function normalizeLineCode(raw: string): string {
    return raw
        .toUpperCase()
        .replace(/^LINHA[\s:_-]*/i, '')
        .replace(/\s+/g, '')
        .trim();
}

function inferLineFromText(text: string): { line: string | null; confidence: number | null } {
    const normalized = text.toUpperCase();

    const explicit = normalized.match(/LINHA[\s:_-]*([A-Z]?\d{2,4}[A-Z]?)/i);
    if (explicit?.[1]) {
        return { line: normalizeLineCode(explicit[1]), confidence: 90 };
    }

    const withPrefix = normalized.match(/\bP[\s-]?(\d{2,4}[A-Z]?)\b/i);
    if (withPrefix?.[1]) {
        return { line: `P${normalizeLineCode(withPrefix[1])}`, confidence: 78 };
    }

    const generic = normalized.match(/\b(\d{2,4}[A-Z]?)\b/);
    if (generic?.[1]) {
        return { line: normalizeLineCode(generic[1]), confidence: 60 };
    }

    return { line: null, confidence: null };
}

function extractTextFromOcrPayload(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null;
    const data = payload as Record<string, unknown>;
    const candidates = [
        data.text,
        data.ocr_text,
        data.result,
        data.output,
        data.content
    ];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim();
        }
    }
    return null;
}

async function runExternalOcr(signedUrl: string, photoPath: string): Promise<AnalyzeResult> {
    const webhook = process.env.PROOF_OCR_WEBHOOK_URL;
    if (!webhook) {
        return {
            ai_text: null,
            ai_line_guess: null,
            ai_confidence: null,
            provider: 'disabled'
        };
    }

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (process.env.PROOF_OCR_API_KEY) {
        headers.Authorization = `Bearer ${process.env.PROOF_OCR_API_KEY}`;
    }

    const response = await fetch(webhook, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            image_url: signedUrl,
            photo_path: photoPath
        })
    });

    if (!response.ok) {
        return {
            ai_text: null,
            ai_line_guess: null,
            ai_confidence: null,
            provider: 'error'
        };
    }

    const payload = await response.json().catch(() => null);
    const aiText = extractTextFromOcrPayload(payload);
    const infer = aiText ? inferLineFromText(aiText) : { line: null, confidence: null };

    return {
        ai_text: aiText,
        ai_line_guess: infer.line,
        ai_confidence: infer.confidence !== null ? clampConfidence(infer.confidence) : null,
        provider: 'external'
    };
}

export async function POST(req: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        if (!supabaseUrl || !serviceKey) {
            return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
        }

        const body = await req.json();
        const photoPath = String(body?.photo_path || '').trim();
        if (!photoPath) {
            return NextResponse.json({ error: 'photo_path is required' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, serviceKey);
        const { data: signed, error } = await supabase.storage
            .from('proof')
            .createSignedUrl(photoPath, 60);

        if (error || !signed?.signedUrl) {
            return NextResponse.json({ error: error?.message || 'Failed to sign URL' }, { status: 500 });
        }

        const analyzed = await runExternalOcr(signed.signedUrl, photoPath);

        return NextResponse.json({
            ok: true,
            ...analyzed
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
