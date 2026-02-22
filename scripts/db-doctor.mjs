import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else {
    dotenv.config();
}

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

async function runDoctor() {
    console.log('--- 🩺 VRNP DB DOCTOR ---');

    if (!PROJECT_REF || !DB_PASSWORD) {
        console.warn('⚠️  SUPABASE_PROJECT_REF or SUPABASE_DB_PASSWORD not set.');
        console.log('Skipping remote database checks.');
        return;
    }

    const connectionString = `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`;
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('✅ Connected to remote Supabase Postgres.\n');

        // 1. Schema Checks
        console.log('📋 Checking Tables & Columns...');
        const schemaChecks = [
            {
                table: 'stops',
                columns: ['id', 'name', 'location', 'neighborhood', 'neighborhood_norm']
            },
            {
                table: 'lines',
                columns: ['id', 'code', 'name']
            },
            {
                table: 'official_schedules',
                columns: ['id', 'doc_type', 'line_code', 'line_id', 'pdf_path', 'valid_from', 'fetched_at']
            },
            {
                table: 'official_schedule_hourly',
                columns: ['schedule_id', 'day_group', 'hour', 'promised_headway_min']
            }
        ];

        for (const check of schemaChecks) {
            try {
                const res = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = $1
                `, [check.table]);

                const existingColumns = res.rows.map(r => r.column_name);
                const missing = check.columns.filter(c => !existingColumns.includes(c));

                if (missing.length === 0) {
                    console.log(`  [OK] public.${check.table}`);
                } else {
                    console.error(`  [FAIL] public.${check.table} - Missing columns: ${missing.join(', ')}`);
                }
            } catch (err) {
                console.error(`  [ERROR] public.${check.table}: ${err.message}`);
            }
        }

        // 2. View Compile Checks
        console.log('\n👁️  Checking Critical Views...');
        const views = [
            'vw_recent_stop_events',
            'vw_line_promised_vs_real_30d',
            'vw_stopline_promised_vs_real_30d',
            'vw_neighborhood_polygon_metrics_30d'
        ];

        for (const view of views) {
            try {
                await client.query(`SELECT 1 FROM public.${view} LIMIT 0`);
                console.log(`  [OK] ${view}`);
            } catch (err) {
                console.error(`  [FAIL] ${view}: ${err.message}`);
            }
        }

        // 3. Trigger Checks
        console.log('\n⚡ Checking Triggers...');
        const triggers = [
            'trg_stops_set_neighborhood_norm',
            'trg_partners_set_neighborhood_norm',
            'trg_shapes_set_neighborhood_norm'
        ];

        for (const trigger of triggers) {
            try {
                const res = await client.query(`
                    SELECT trigger_name 
                    FROM information_schema.triggers 
                    WHERE trigger_schema = 'public' AND trigger_name = $1
                `, [trigger]);

                if (res.rows.length > 0) {
                    console.log(`  [OK] ${trigger}`);
                } else {
                    console.warn(`  [MISSING] ${trigger}`);
                }
            } catch (err) {
                console.error(`  [ERROR] ${trigger}: ${err.message}`);
            }
        }

    } catch (err) {
        console.error('\n❌ CRITICAL: Could not connect to database.');
        console.error(err.message);
    } finally {
        await client.end();
        console.log('\n--- Doctor Check Finished ---');
    }
}

runDoctor();
