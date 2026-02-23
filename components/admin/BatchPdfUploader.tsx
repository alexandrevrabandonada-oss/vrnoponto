import { useState, useCallback } from 'react';
import { CloudUpload, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Card, Button } from '@/components/ui';

interface BatchResult {
    fileName: string;
    lineCode?: string;
    status: 'OK' | 'ERROR';
    error?: string;
    tripsCount?: number;
}

export function BatchPdfUploader({ onComplete }: { onComplete?: () => void }) {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [results, setResults] = useState<BatchResult[]>([]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
        setFiles(prev => [...prev, ...droppedFiles]);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
            setFiles(prev => [...prev, ...selectedFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const runBatch = async () => {
        if (files.length === 0) return;
        setIsUploading(true);
        setResults([]);

        const formData = new FormData();
        files.forEach(f => formData.append('files', f));

        try {
            let adminToken = localStorage.getItem('vrnp_admin_token') || localStorage.getItem('admin_token');

            if (!adminToken) {
                adminToken = prompt('Digite o token de ADMIN para autorizar o envio:');
                if (adminToken) {
                    localStorage.setItem('vrnp_admin_token', adminToken);
                }
            }

            if (!adminToken) {
                setIsUploading(false);
                return;
            }

            const res = await fetch(`/api/admin/oficial/batch-upload?t=${adminToken}`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Erro na comunicação com o servidor');

            const data = await res.json();
            setResults(data.results || []);
            setFiles([]);
            if (onComplete) onComplete();
        } catch (err: unknown) {
            setResults([{ fileName: 'Lote', status: 'ERROR', error: err instanceof Error ? err.message : 'Erro fatal' }]);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card className="border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
            {/* Background Icon */}
            <CloudUpload className="absolute -right-8 -bottom-8 w-40 h-40 text-emerald-500/5 -rotate-12 pointer-events-none" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="font-industrial text-lg uppercase tracking-tight text-white flex items-center gap-2">
                            Super Upload de Lote
                        </h2>
                        <p className="text-[10px] text-emerald-400/60 font-bold uppercase tracking-widest">
                            Detecção automática de Linha e Horários.
                        </p>
                    </div>
                </div>

                {/* Dropzone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${isDragging ? 'border-brand bg-brand/5 scale-[0.99]' : 'border-white/10 hover:border-white/20'
                        }`}
                    onClick={() => document.getElementById('batch-input')?.click()}
                >
                    <input
                        id="batch-input"
                        type="file"
                        multiple
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-400">
                            <CloudUpload size={32} />
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">Arraste seus PDFs aqui</p>
                            <p className="text-muted text-[10px] uppercase font-black mt-1">Ou clique para selecionar múltiplos arquivos</p>
                        </div>
                    </div>
                </div>

                {/* Selected Files List */}
                {files.length > 0 && (
                    <div className="mt-8 space-y-3">
                        <div className="flex items-center justify-between px-2">
                            <span className="text-[10px] font-black uppercase text-muted tracking-widest">Aguardando Envio ({files.length})</span>
                            <button onClick={() => setFiles([])} className="text-[10px] font-black uppercase text-danger hover:underline">Limpar Tudo</button>
                        </div>
                        <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                            {files.map((f, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileText size={16} className="text-muted shrink-0" />
                                        <span className="text-[11px] text-white/70 truncate">{f.name}</span>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="p-1 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <Button
                            className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest mt-4"
                            onClick={runBatch}
                            loading={isUploading}
                        >
                            <CheckCircle2 size={18} className="mr-2" /> Iniciar Processamento em Lote
                        </Button>
                    </div>
                )}

                {/* Results List */}
                {results.length > 0 && (
                    <div className="mt-8 space-y-4">
                        <Divider label="RESULTADOS DO ÚLTIMO LOTE" />
                        <div className="space-y-2">
                            {results.map((r, i) => (
                                <div key={i} className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${r.status === 'OK' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-danger/10 border-danger/20'
                                    }`}>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex items-center gap-2 mb-1">
                                            {r.status === 'OK' ? <CheckCircle2 size={14} className="text-emerald-400" /> : <AlertCircle size={14} className="text-danger" />}
                                            <span className="text-[11px] font-bold text-white truncate max-w-[200px]">{r.fileName}</span>
                                            {r.lineCode && <span className="text-[9px] font-black bg-white/10 px-2 py-0.5 rounded uppercase">Linha {r.lineCode}</span>}
                                        </div>
                                        <p className="text-[10px] text-white/50">{r.status === 'OK' ? `Sucesso: ${r.tripsCount} horários extraídos.` : r.error}</p>
                                    </div>
                                    {r.status === 'OK' && (
                                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter shrink-0 ring-1 ring-emerald-400/30 px-2 py-1 rounded">PRONTO</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}

function Divider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-4 py-2">
            <div className="h-[1px] flex-1 bg-white/5" />
            <span className="text-[9px] font-black text-muted tracking-widest uppercase">{label}</span>
            <div className="h-[1px] flex-1 bg-white/5" />
        </div>
    );
}
