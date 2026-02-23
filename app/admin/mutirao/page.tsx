'use client';

import { useState, useEffect } from 'react';
import { Plus, Play, Pause, Trophy, Target, Calendar } from 'lucide-react';
import { Card, Button, Divider } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

interface Mutirao {
    id: string;
    slug: string;
    title: string;
    description: string;
    goal: number;
    is_active: boolean;
}

export default function AdminMutirao() {
    const [mutiroes, setMutiroes] = useState<Mutirao[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    const [newMutirao, setNewMutirao] = useState({
        title: '',
        slug: '',
        description: '',
        goal: 50,
        is_active: false
    });



    const fetchMutiroes = async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from('mutiroes')
            .select('*')
            .order('created_at', { ascending: false });

        setMutiroes(data || []);
        setLoading(false);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchMutiroes();
    }, []);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/mutirao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', mutirao: newMutirao })
            });
            if (res.ok) {
                setIsCreating(false);
                setNewMutirao({ title: '', slug: '', description: '', goal: 50, is_active: false });
                fetchMutiroes();
            }
        } catch (error) {
            console.error('Error creating mutirao:', error);
        }
    }

    async function handleToggle(mutirao: Mutirao) {
        try {
            const res = await fetch('/api/admin/mutirao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'toggle',
                    mutirao: { id: mutirao.id, is_active: !mutirao.is_active }
                })
            });
            if (res.ok) {
                fetchMutiroes();
            }
        } catch (error) {
            console.error('Error toggling mutirao:', error);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Mutirões Comunitários</h1>
                    <p className="text-gray-600">Gerencie campanhas de engajamento e metas coletivas.</p>
                </div>
                <Button onClick={() => setIsCreating(!isCreating)} icon={<Plus size={20} />}>
                    Novo Mutirão
                </Button>
            </div>

            {isCreating && (
                <Card className="max-w-xl animate-scale-in">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-gray-400">Título</label>
                                <input
                                    className="w-full p-2 border rounded"
                                    value={newMutirao.title}
                                    onChange={e => setNewMutirao({ ...newMutirao, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-gray-400">Slug</label>
                                <input
                                    className="w-full p-2 border rounded font-mono text-sm"
                                    value={newMutirao.slug}
                                    onChange={e => setNewMutirao({ ...newMutirao, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                    required
                                    placeholder="ex: mutirao-do-centro"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-gray-400">Descrição/Chamada</label>
                            <textarea
                                className="w-full p-2 border rounded h-20"
                                value={newMutirao.description}
                                onChange={e => setNewMutirao({ ...newMutirao, description: e.target.value })}
                                required
                            />
                        </div>
                        <div className="w-32 space-y-1">
                            <label className="text-xs font-bold uppercase text-gray-400">Meta (Amostras)</label>
                            <input
                                type="number"
                                className="w-full p-2 border rounded"
                                value={newMutirao.goal}
                                onChange={e => setNewMutirao({ ...newMutirao, goal: Number(e.target.value) })}
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setIsCreating(false)}>Cancelar</Button>
                            <Button type="submit">Criar Mutirão</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                    <p>Carregando...</p>
                ) : mutiroes.length === 0 ? (
                    <p className="text-gray-400 italic">Nenhum mutirão cadastrado.</p>
                ) : (
                    mutiroes.map(m => (
                        <Card key={m.id} className={`relative overflow-hidden ${m.is_active ? 'border-brand ring-1 ring-brand/20' : ''}`}>
                            {m.is_active && (
                                <div className="absolute top-0 right-0 bg-brand text-black text-[10px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-widest">
                                    Ativo agora
                                </div>
                            )}
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl ${m.is_active ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-gray-400'}`}>
                                    <Target size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900">{m.title}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{m.description}</p>

                                    <div className="flex items-center gap-4 mt-4">
                                        <div className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase">
                                            <Trophy size={14} />
                                            Meta: {m.goal}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase">
                                            <Calendar size={14} />
                                            /{m.slug}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Divider className="my-4" />

                            <div className="flex justify-end gap-2">
                                <Button
                                    variant={m.is_active ? "secondary" : "primary"}
                                    className={`h-9 px-4 text-xs font-bold ${m.is_active ? 'border-red-500 text-red-500 hover:bg-red-50' : ''}`}
                                    onClick={() => handleToggle(m)}
                                    icon={m.is_active ? <Pause size={14} /> : <Play size={14} />}
                                >
                                    {m.is_active ? 'Desativar' : 'Ativar Mutirão'}
                                </Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
