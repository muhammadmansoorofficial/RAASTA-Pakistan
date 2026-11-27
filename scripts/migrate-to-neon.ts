import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import type { DatabaseSchema } from '../server/seedData.ts';
import {
  ensurePgSchemaAndSeed,
  pgInsertAdminCredentialIfEmpty,
  pgInsertAuditLog,
  pgInsertContactMessage,
  pgSaveSyncEngineState,
  pgUpsertGuide,
  pgUpsertMonitoredSource,
  pgUpsertNationalUpdate,
  pgUpsertNotificationSubscription,
  pgUpsertOpportunity,
  pgUpsertProblem,
} from '../server/pgMigrate.ts';

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error(
      'ERROR: DATABASE_URL is not set. Add your Neon PostgreSQL connection string to .env or your environment before running db:migrate.',
    );
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const jsonPath = path.resolve(process.cwd(), 'data', 'raasta-db.json');
  const hasLocalJson = fs.existsSync(jsonPath);

  console.log('1. Ensuring Neon PostgreSQL schema & indexes...');
  // If local JSON exists, run DDL without default seed first so local records are imported non-destructively,
  // then run ensurePgSchemaAndSeed() afterward so any still-empty tables get seeded safely.
  await ensurePgSchemaAndSeed(sql, { skipDefaultSeed: hasLocalJson });

  if (hasLocalJson) {
    console.log(`2. Found ${jsonPath} — importing records safely (ON CONFLICT DO NOTHING)...`);
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;

    if (parsed.adminCredential) {
      await pgInsertAdminCredentialIfEmpty(sql, parsed.adminCredential);
    }

    if (Array.isArray(parsed.opportunities)) {
      for (const opp of parsed.opportunities) {
        await pgUpsertOpportunity(sql, opp, true);
      }
    }

    if (Array.isArray(parsed.guides)) {
      for (let i = 0; i < parsed.guides.length; i += 1) {
        await pgUpsertGuide(sql, parsed.guides[i], i, true);
      }
    }

    if (Array.isArray(parsed.problems)) {
      for (const prb of parsed.problems) {
        await pgUpsertProblem(sql, prb, true);
      }
    }

    if (Array.isArray(parsed.contactMessages)) {
      for (const msg of parsed.contactMessages) {
        await pgInsertContactMessage(sql, msg);
      }
    }

    if (Array.isArray(parsed.monitoredSources)) {
      for (let i = 0; i < parsed.monitoredSources.length; i += 1) {
        await pgUpsertMonitoredSource(sql, parsed.monitoredSources[i], i, true);
      }
    }

    if (Array.isArray(parsed.nationalUpdates)) {
      for (const upd of parsed.nationalUpdates) {
        await pgUpsertNationalUpdate(sql, { ...upd, processingMode: 'rule_parser' }, true);
      }
    }

    if (Array.isArray(parsed.notificationSubscriptions)) {
      for (const sub of parsed.notificationSubscriptions) {
        await pgUpsertNotificationSubscription(sql, sub, true);
      }
    }

    if (Array.isArray(parsed.syncAuditLogs)) {
      for (const log of parsed.syncAuditLogs) {
        await pgInsertAuditLog(sql, log);
      }
    }

    if (parsed.syncEngineState) {
      await pgSaveSyncEngineState(sql, parsed.syncEngineState, true);
    }
  }

  // Ensure any remaining empty core tables and migration record are initialized
  await ensurePgSchemaAndSeed(sql, { skipDefaultSeed: false });

  const summary = await sql.query(`
    SELECT
      (SELECT COUNT(*)::int FROM opportunities) AS opportunities,
      (SELECT COUNT(*)::int FROM document_guides) AS guides,
      (SELECT COUNT(*)::int FROM problem_reports) AS problems,
      (SELECT COUNT(*)::int FROM monitored_sources) AS monitored_sources,
      (SELECT COUNT(*)::int FROM national_updates) AS national_updates,
      (SELECT COUNT(*)::int FROM sync_audit_logs) AS audit_logs
  `);

  console.log('3. Neon PostgreSQL migration complete! Current row counts:', summary[0]);
}

main().catch((err) => {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
