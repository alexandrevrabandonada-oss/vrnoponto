import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos Service Role Key no Server para ignorar RLS e Storage Policies padrão

export async function POST(req: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const formData = await req.formData();
        const lineId = formData.get('lineId') as string;
        const validFrom = formData.get('validFrom') as string;
        const pdfFile = formData.get('pdfFile') as File | null;

        if (!lineId || !validFrom || !pdfFile) {
            return NextResponse.json({ error: 'Faltam campos obrigatórios' }, { status: 400 });
        }

        if (pdfFile.type !== 'application/pdf') {
            return NextResponse.json({ error: 'Apenas arquivos PDF são permitidos' }, { status: 400 });
        }

        const fileBuffer = await pdfFile.arrayBuffer();
        const fileName = `${lineId}_${Date.now()}.pdf`;

        // 1. Upload para o Supabase Storage (bucket 'official')
        const { data: uploadData, error: uploadError } = await supabaseAdmin
            .storage
            .from('official')
            .upload(fileName, fileBuffer, {
                contentType: 'application/pdf',
                upsert: false
            });

        if (uploadError) {
            console.error('Upload Error:', uploadError);
            return NextResponse.json({ error: 'Erro ao salvar o arquivo no Storage. O bucket existe?' }, { status: 500 });
        }

        const pdfPath = uploadData.path;

        // 2. Achar a variante genérica (já que o upload é pra linha, vamos pegar a primeira variante para amarrar, ou criar uma)
        // No MVP, a tabela official_schedules exige line_variant_id.
        const { data: variants } = await supabaseAdmin
            .from('line_variants')
            .select('id')
            .eq('line_id', lineId)
            .limit(1);

        let variantId = variants?.[0]?.id;

        // Se não tiver variante, cria uma fallback
        if (!variantId) {
            const { data: newVariant } = await supabaseAdmin
                .from('line_variants')
                .insert({
                    line_id: lineId,
                    name: 'Principal',
                    direction: 'circular'
                })
                .select('id')
                .single();
            variantId = newVariant?.id;
        }

        // 3. Registrar no Banco de Dados
        const { error: dbError } = await supabaseAdmin
            .from('official_schedules')
            .insert({
                line_variant_id: variantId,
                valid_from: validFrom,
                pdf_path: pdfPath,
                title: 'Tabela de Horários Oficial'
            });

        if (dbError) {
            // Fallback: Tentar apagar do storage se deu erro no BD
            await supabaseAdmin.storage.from('official').remove([pdfPath]);
            throw dbError;
        }

        return NextResponse.json({ success: true, path: pdfPath }, { status: 201 });

    } catch (error: unknown) {
        console.error('API /admin/upload-pdf:', error);
        const errMessage = error instanceof Error ? error.message : 'Erro Interno';
        return NextResponse.json({ error: errMessage }, { status: 500 });
    }
}
