import { createClient } from '@supabase/supabase-js';

// Initializes an admin/service-role client bypassing RLS
function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
}

/**
 * Tries to read the latest applied migration from supabase_migrations.schema_migrations.
 * If the table is inaccessible or doesn't exist (e.g. non-CLI managed remote), returns 'UNKNOWN'.
 */
export async function getLastAppliedMigration(): Promise<{ version: string, checked_at: string }> {
    const defaultRes = { version: 'UNKNOWN', checked_at: new Date().toISOString() };
    try {
        const adminClient = getAdminClient();

        // Supabase tracks CLI migrations in the `supabase_migrations.schema_migrations` table
        // We can query it via service_role to show the status on our Dashboard
        const { data, error } = await adminClient
            .from('schema_migrations')
            .select('version')
            .order('version', { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) {
            return defaultRes;
        }

        return {
            version: data[0].version,
            checked_at: new Date().toISOString()
        };
    } catch {
        return defaultRes;
    }
}
