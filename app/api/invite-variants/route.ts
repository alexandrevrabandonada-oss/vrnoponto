import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        // Fetch only active variants
        const { data: variants, error } = await supabase
            .from('invite_variants')
            .select('key, title, message')
            .eq('is_active', true)
            .order('key', { ascending: true });

        if (error) {
            console.error('Error fetching variants:', error);
            return NextResponse.json({ error: 'Failed to fetch variants' }, { status: 500 });
        }

        return NextResponse.json({ variants });
    } catch (error) {
        console.error('Unhandled error in invite-variants:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
