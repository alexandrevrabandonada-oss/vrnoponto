'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import { Button, Card, InlineAlert, Select } from '@/components/ui';
import { enqueueProofTask } from '@/lib/offlineProofQueue';
import { BusPhotoDraft, saveBusPhotoDraft } from '@/lib/busPhotoDraft';

type LineOption = {
    line_id: string;
    code: string;
    name: string;
};

type AnalyzeResponse = {
    ai_text: string | null;
    ai_line_guess: string | null;
    ai_confidence: number | null;
};

const MAX_DIMENSION = 1280;
const TARGET_QUALITY = 0.72;
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

interface BusPhotoModalProps {
    isOpen: boolean;
    onClose: () => void;
    deviceId: string | null;
    stopId?: string | null;
    lineId?: string | null;
    location?: { lat: number; lng: number } | null;
    isOnline: boolean;
    onSaved?: (draft: BusPhotoDraft) => void;
}

function toDataUrl(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function confidenceLabel(value: number | null): string {
    if (value === null) return 'sem confiança';
    if (value >= 80) return 'alta';
    if (value >= 50) return 'média';
    return 'baixa';
}

async function supportsWebp(): Promise<boolean> {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Não foi possível ler a imagem.'));
        };
        img.src = url;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Falha ao processar imagem.'));
                return;
            }
            resolve(blob);
        }, type, quality);
    });
}

async function compressForProof(file: File): Promise<{ blob: Blob; mimeType: string; ext: 'webp' | 'jpg' }> {
    const image = await loadImage(file);
    const ratio = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Falha ao preparar compressão.');
    }

    // Draw in canvas to strip EXIF/metadata and keep only pixel data.
    ctx.drawImage(image, 0, 0, width, height);

    const useWebp = await supportsWebp();
    const mimeType = useWebp ? 'image/webp' : 'image/jpeg';
    const blob = await canvasToBlob(canvas, mimeType, TARGET_QUALITY);
    return { blob, mimeType, ext: useWebp ? 'webp' : 'jpg' };
}

function blobToFile(blob: Blob, baseName: string, ext: 'webp' | 'jpg', mimeType: string): File {
    const normalized = baseName.replace(/\.[a-z0-9]+$/i, '');
    return new File([blob], `${normalized}.${ext}`, { type: mimeType });
}

export function BusPhotoModal({
    isOpen,
    onClose,
    deviceId,
    stopId,
    lineId,
    location,
    isOnline,
    onSaved
}: BusPhotoModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
    const [uploadedPath, setUploadedPath] = useState<string | null>(null);
    const [lineOptions, setLineOptions] = useState<LineOption[]>([]);
    const [manualLineId, setManualLineId] = useState<string>('');
    const [manualMode, setManualMode] = useState(false);

    const selectedLine = useMemo(
        () => lineOptions.find(line => line.line_id === manualLineId) || null,
        [lineOptions, manualLineId]
    );

    const trackTelemetry = (event: string) => {
        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event })
        }).catch(() => { /* ignore telemetry failures */ });
    };

    useEffect(() => {
        if (!isOpen) return;
        trackTelemetry('bus_photo_open');
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;

        async function loadLines() {
            try {
                if (stopId) {
                    const topRes = await fetch(`/api/stop/top-lines?stop_id=${stopId}&limit=8`);
                    if (topRes.ok) {
                        const data = await topRes.json();
                        const top = Array.isArray(data?.lines) ? data.lines : [];
                        if (!cancelled && top.length > 0) {
                            setLineOptions(top);
                            const defaultId = lineId || top[0].line_id;
                            setManualLineId(defaultId);
                            return;
                        }
                    }
                }

                const linesRes = await fetch('/api/lines');
                if (!linesRes.ok) return;
                const lines = await linesRes.json();
                if (cancelled || !Array.isArray(lines)) return;
                const mapped = lines.slice(0, 50).map((line: { id: string; code: string; name: string }) => ({
                    line_id: line.id,
                    code: line.code,
                    name: line.name
                }));
                setLineOptions(mapped);
                if (lineId) {
                    setManualLineId(lineId);
                } else if (mapped.length > 0) {
                    setManualLineId(mapped[0].line_id);
                }
            } catch {
                // no-op
            }
        }

        loadLines();
        return () => { cancelled = true; };
    }, [isOpen, stopId, lineId]);

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setPreviewUrl(null);
            setIsUploading(false);
            setError(null);
            setAnalysis(null);
            setUploadedPath(null);
            setManualMode(false);
        }
    }, [isOpen]);

    const close = () => {
        if (isUploading) return;
        onClose();
    };

    const finalizeDraft = (userConfirmed: boolean, source: 'AI' | 'MANUAL') => {
        if (!deviceId) return;
        const resolvedLineId = source === 'AI'
            ? null
            : (selectedLine?.line_id || lineId || null);
        const resolvedLineCode = source === 'AI'
            ? (analysis?.ai_line_guess || null)
            : (selectedLine?.code || analysis?.ai_line_guess || null);
        const draft: BusPhotoDraft = {
            id: crypto.randomUUID(),
            mode: uploadedPath ? 'ONLINE' : 'OFFLINE',
            captured_at: Date.now(),
            device_id: deviceId,
            stop_id: stopId || null,
            line_id: resolvedLineId,
            line_code: resolvedLineCode,
            lat: location?.lat ?? null,
            lng: location?.lng ?? null,
            photo_path: uploadedPath || null,
            proof_task_id: null,
            ai_text: analysis?.ai_text ?? null,
            ai_line_guess: analysis?.ai_line_guess ?? null,
            ai_confidence: analysis?.ai_confidence ?? null,
            user_confirmed: userConfirmed
        };
        saveBusPhotoDraft(draft);
        onSaved?.(draft);
    };

    const handleProcess = async () => {
        if (!file || !deviceId) {
            setError('Selecione uma foto e tente novamente.');
            return;
        }
        setError(null);
        setIsUploading(true);
        try {
            const compressed = await compressForProof(file);
            if (compressed.blob.size > MAX_UPLOAD_BYTES) {
                throw new Error('A foto ficou muito pesada. Tente novamente com melhor enquadramento.');
            }
            const processedFile = blobToFile(compressed.blob, file.name || 'bus-proof', compressed.ext, compressed.mimeType);

            if (!isOnline) {
                const dataUrl = await toDataUrl(compressed.blob);
                const taskId = crypto.randomUUID();
                await enqueueProofTask({
                    id: taskId,
                    device_id: deviceId,
                    photo_data_url: dataUrl,
                    mime_type: compressed.mimeType,
                    stop_id: stopId || null,
                    line_id: lineId || manualLineId || null,
                    lat: location?.lat ?? null,
                    lng: location?.lng ?? null,
                    user_confirmed: !!manualLineId,
                    status: 'PENDING',
                    created_at: Date.now(),
                    retry_count: 0
                });

                const draft: BusPhotoDraft = {
                    id: crypto.randomUUID(),
                    mode: 'OFFLINE',
                    captured_at: Date.now(),
                    device_id: deviceId,
                    stop_id: stopId || null,
                    line_id: lineId || manualLineId || null,
                    line_code: selectedLine?.code || null,
                    lat: location?.lat ?? null,
                    lng: location?.lng ?? null,
                    photo_path: null,
                    proof_task_id: taskId,
                    ai_text: null,
                    ai_line_guess: null,
                    ai_confidence: null,
                    user_confirmed: !!manualLineId
                };
                saveBusPhotoDraft(draft);
                onSaved?.(draft);
                trackTelemetry('bus_photo_uploaded');
                trackTelemetry('bus_photo_fallback_manual');
                onClose();
                return;
            }

            const uploadData = new FormData();
            uploadData.append('photo', processedFile);
            uploadData.append('device_id', deviceId);

            const uploadRes = await fetch('/api/proof/upload-photo', {
                method: 'POST',
                body: uploadData
            });
            const uploadJson = await uploadRes.json();
            if (!uploadRes.ok) {
                throw new Error(uploadJson?.error || 'Falha no upload da foto');
            }
            const photoPath = uploadJson.photo_path as string;
            setUploadedPath(photoPath);
            trackTelemetry('bus_photo_uploaded');

            const analyzeRes = await fetch('/api/proof/analyze-photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    photo_path: photoPath,
                    stop_id: stopId || null
                })
            });
            const analyzeJson = await analyzeRes.json();
            if (!analyzeRes.ok) {
                throw new Error(analyzeJson?.error || 'Falha ao analisar foto');
            }

            const result: AnalyzeResponse = {
                ai_text: analyzeJson.ai_text ?? null,
                ai_line_guess: analyzeJson.ai_line_guess ?? null,
                ai_confidence: typeof analyzeJson.ai_confidence === 'number' ? analyzeJson.ai_confidence : null
            };
            setAnalysis(result);

            if (result.ai_line_guess) {
                trackTelemetry('bus_photo_ai_suggested');
            } else {
                setManualMode(true);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Falha ao processar foto');
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirmSuggestion = () => {
        finalizeDraft(true, 'AI');
        trackTelemetry('bus_photo_confirmed');
        onClose();
    };

    const handleManualConfirm = () => {
        finalizeDraft(true, 'MANUAL');
        trackTelemetry('bus_photo_fallback_manual');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm p-4 flex items-end sm:items-center justify-center">
            <Card className="w-full max-w-md !bg-zinc-900 border-white/10 space-y-4 relative">
                <button
                    onClick={close}
                    className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                    aria-label="Fechar"
                >
                    <X size={20} />
                </button>

                <div className="space-y-1">
                    <h3 className="font-industrial text-lg uppercase tracking-wide text-white flex items-center gap-2">
                        <Camera size={18} className="text-brand" />
                        Foto do Ônibus (Opcional)
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                        Captura leve para sugestão de linha e prova contextual.
                    </p>
                </div>

                {!analysis && (
                    <>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="block w-full text-xs text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:font-black file:text-black"
                        />

                        {previewUrl && (
                            <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={previewUrl} alt="Preview da foto do ônibus" className="w-full h-56 object-cover" />
                            </div>
                        )}

                        <Button
                            onClick={handleProcess}
                            loading={isUploading}
                            disabled={!file || !deviceId}
                            className="w-full h-12"
                        >
                            <Upload size={16} className="mr-2" />
                            Usar esta foto
                        </Button>
                    </>
                )}

                {analysis && (
                    <div className="space-y-3">
                        <InlineAlert
                            variant={analysis.ai_line_guess ? 'warning' : 'error'}
                            title={analysis.ai_line_guess ? 'Sugestão de Linha' : 'Sem sugestão automática'}
                        >
                            {analysis.ai_line_guess
                                ? `Parece ser: ${analysis.ai_line_guess} (confiança ${confidenceLabel(analysis.ai_confidence)}).`
                                : 'Não foi possível inferir a linha automaticamente. Escolha manualmente se quiser.'}
                        </InlineAlert>

                        {analysis.ai_line_guess && !manualMode && (
                            <div className="grid grid-cols-2 gap-3">
                                <Button onClick={handleConfirmSuggestion} className="h-11">
                                    <CheckCircle2 size={16} className="mr-2" />
                                    Confirmar
                                </Button>
                                <Button variant="secondary" onClick={() => setManualMode(true)} className="h-11">
                                    Escolher outra
                                </Button>
                            </div>
                        )}

                        {(manualMode || !analysis.ai_line_guess) && (
                            <div className="space-y-3">
                                <Select
                                    value={manualLineId}
                                    onChange={(e) => setManualLineId(e.target.value)}
                                    className="!h-11"
                                >
                                    <option value="">Selecione a linha...</option>
                                    {lineOptions.map(line => (
                                        <option key={line.line_id} value={line.line_id}>
                                            {line.code} - {line.name}
                                        </option>
                                    ))}
                                </Select>
                                <Button
                                    onClick={handleManualConfirm}
                                    disabled={!manualLineId}
                                    className="w-full h-11"
                                >
                                    Confirmar linha manual
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {isUploading && (
                    <div className="flex items-center justify-center gap-2 text-xs text-white/60 uppercase font-black tracking-widest">
                        <Loader2 size={14} className="animate-spin" />
                        Processando...
                    </div>
                )}

                {error && (
                    <InlineAlert variant="error" title="Falha no fluxo da foto">
                        {error}
                    </InlineAlert>
                )}
            </Card>
        </div>
    );
}
