import { createClient } from '@supabase/supabase-js';

// Initializes an admin/service-role client bypassing RLS to log system events securely.
function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
}

export type JobName = 'sync_official' | 'run_alerts' | 'bulletin_card' | 'manual';
export type JobStatus = 'OK' | 'WARN' | 'FAIL' | 'RUNNING';

/**
 * Starts a new system run log, marking it as 'RUNNING'.
 * Returns the run UUID to be closed later by `finishRun`.
 */
export async function startRun(job: JobName, meta: Record<string, unknown> = {}): Promise<string | null> {
    try {
        const adminClient = getAdminClient();
        const { data, error } = await adminClient
            .from('system_runs')
            .insert({
                job,
                status: 'RUNNING',
                started_at: new Date().toISOString(),
                meta
            })
            .select('id')
            .single();

        if (error) {
            console.error('Failed to log startRun', error);
            return null;
        }
        return data.id;
    } catch {
        return null; // Silent fail, logging should not break app flow
    }
}

/**
 * Closes an existing run by updating status and recording the finished time.
 */
export async function finishRun(
    id: string | null,
    status: JobStatus,
    metaMerge: Record<string, unknown> = {}
) {
    if (!id) return;
    try {
        const adminClient = getAdminClient();

        // Fetch current meta to merge
        const { data: current } = await adminClient
            .from('system_runs')
            .select('meta')
            .eq('id', id)
            .single();

        const updatedMeta = { ...(current?.meta || {}), ...metaMerge };

        await adminClient
            .from('system_runs')
            .update({
                status,
                finished_at: new Date().toISOString(),
                meta: updatedMeta
            })
            .eq('id', id);
    } catch {
        // Silent
    }
}

/**
 * Record a quick synchronous run directly. 
 * Use for simple endpoints without long pipelines.
 */
export async function recordOneShot(job: JobName, status: JobStatus, meta: Record<string, unknown> = {}) {
    try {
        const now = new Date().toISOString();
        const adminClient = getAdminClient();
        await adminClient
            .from('system_runs')
            .insert({
                job,
                status,
                started_at: now,
                finished_at: now,
                meta
            });
    } catch {
        // Silent
    }
}
