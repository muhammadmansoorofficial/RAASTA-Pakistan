import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import type {
  AuditLogEntry,
  ContactMessage,
  DocumentGuide,
  MonitoredSource,
  NationalUpdate,
  NotificationSubscription,
  Opportunity,
  ProblemReport,
  PublicProblemSummary,
  SyncEngineState,
} from '../src/types.ts';
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
  type NeonSql,
} from './pgMigrate.ts';
import { SEED_DATA, type AdminCredential, type DatabaseSchema } from './seedData.ts';

export type { AdminCredential, DatabaseSchema };
export { SEED_DATA };

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'raasta-db.json');

let cachedSql: NeonSql | null = null;
let cachedDatabaseUrl: string | null = null;
let pgReadyPromise: Promise<void> | null = null;
let localWriteLock: Promise<void> = Promise.resolve();
let localFallbackSecret: string | null = null;

export function getDbMode(): 'neon_postgres' | 'local_json' {
  const url = process.env.DATABASE_URL?.trim();
  if (url) return 'neon_postgres';
  if (process.env.VERCEL) {
    throw new Error(
      'DATABASE_URL environment variable is required when running on Vercel. Configure your Neon PostgreSQL connection string in Vercel Project Settings -> Environment Variables.',
    );
  }
  return 'local_json';
}

function getSql(): NeonSql {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not configured.');
  }
  if (!cachedSql || cachedDatabaseUrl !== url) {
    cachedSql = neon(url);
    cachedDatabaseUrl = url;
    pgReadyPromise = null;
  }
  return cachedSql;
}

export async function initDb(): Promise<void> {
  if (getDbMode() === 'neon_postgres') {
    const sql = getSql();
    if (!pgReadyPromise) {
      pgReadyPromise = ensurePgSchemaAndSeed(sql).catch((err) => {
        pgReadyPromise = null;
        throw err;
      });
    }
    await pgReadyPromise;
    return;
  }
  ensureDbFile();
}

function ensureDbFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
  }
}

function readLocalDb(): DatabaseSchema {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    return {
      opportunities: Array.isArray(parsed.opportunities)
        ? parsed.opportunities
        : structuredClone(SEED_DATA.opportunities),
      guides: Array.isArray(parsed.guides)
        ? parsed.guides
        : structuredClone(SEED_DATA.guides),
      problems: Array.isArray(parsed.problems)
        ? parsed.problems
        : structuredClone(SEED_DATA.problems),
      contactMessages: Array.isArray(parsed.contactMessages) ? parsed.contactMessages : [],
      adminCredential: parsed.adminCredential ?? null,
      monitoredSources:
        Array.isArray(parsed.monitoredSources) && parsed.monitoredSources.length > 0
          ? parsed.monitoredSources
          : structuredClone(SEED_DATA.monitoredSources),
      nationalUpdates: Array.isArray(parsed.nationalUpdates)
        ? parsed.nationalUpdates.map((u) => ({ ...u, processingMode: 'rule_parser' as const }))
        : structuredClone(SEED_DATA.nationalUpdates),
      notificationSubscriptions: Array.isArray(parsed.notificationSubscriptions)
        ? parsed.notificationSubscriptions
        : [],
      syncAuditLogs: Array.isArray(parsed.syncAuditLogs)
        ? parsed.syncAuditLogs
        : structuredClone(SEED_DATA.syncAuditLogs),
      syncEngineState:
        parsed.syncEngineState && typeof parsed.syncEngineState === 'object'
          ? { ...structuredClone(SEED_DATA.syncEngineState), ...parsed.syncEngineState }
          : structuredClone(SEED_DATA.syncEngineState),
    };
  } catch {
    fs.writeFileSync(DB_FILE, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
    return structuredClone(SEED_DATA);
  }
}

function writeLocalDb(data: DatabaseSchema): void {
  ensureDbFile();
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

async function mutateLocalDb<T>(fn: (db: DatabaseSchema) => T | Promise<T>): Promise<T> {
  const run = localWriteLock.then(async () => {
    const db = readLocalDb();
    const res = await fn(db);
    writeLocalDb(db);
    return res;
  });
  localWriteLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function asStrArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map((v) => String(v));
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapOpportunityRow(r: Record<string, any>): Opportunity {
  return {
    id: r.id,
    category: r.category,
    titleEn: r.title_en,
    titleUr: r.title_ur,
    organizationEn: r.organization_en,
    organizationUr: r.organization_ur,
    province: r.province,
    cityOrScopeEn: r.city_or_scope_en,
    cityOrScopeUr: r.city_or_scope_ur,
    educationLevel: r.education_level,
    deadline: r.deadline,
    stipendOrScopeEn: r.stipend_or_scope_en,
    stipendOrScopeUr: r.stipend_or_scope_ur,
    eligibilityEn: asStrArray(r.eligibility_en),
    eligibilityUr: asStrArray(r.eligibility_ur),
    requiredDocsEn: asStrArray(r.required_docs_en),
    requiredDocsUr: asStrArray(r.required_docs_ur),
    descriptionEn: r.description_en,
    descriptionUr: r.description_ur,
    officialUrl: r.official_url,
    verifiedSource: Boolean(r.verified_source),
    lastVerifiedDate: r.last_verified_date,
    status: r.status,
    isDemo: Boolean(r.is_demo),
    submittedBy: r.submitted_by ?? undefined,
    createdAt: r.created_at,
  };
}

function mapGuideRow(r: Record<string, any>): DocumentGuide {
  return {
    id: r.id,
    slug: r.slug,
    titleEn: r.title_en,
    titleUr: r.title_ur,
    authorityEn: r.authority_en,
    authorityUr: r.authority_ur,
    province: r.province,
    summaryEn: r.summary_en,
    summaryUr: r.summary_ur,
    requiredDocsEn: asStrArray(r.required_docs_en),
    requiredDocsUr: asStrArray(r.required_docs_ur),
    stepsEn: asStrArray(r.steps_en),
    stepsUr: asStrArray(r.steps_ur),
    feeNoteEn: r.fee_note_en,
    feeNoteUr: r.fee_note_ur,
    officialUrl: r.official_url,
    verifiedSource: Boolean(r.verified_source),
    lastVerifiedDate: r.last_verified_date,
    isDemo: Boolean(r.is_demo),
  };
}

function mapProblemRow(r: Record<string, any>): ProblemReport {
  return {
    id: r.id,
    referenceCode: r.reference_code,
    category: r.category,
    province: r.province,
    district: r.district,
    area: r.area,
    title: r.title,
    description: r.description,
    reporterName: r.reporter_name ?? undefined,
    reporterContact: r.reporter_contact ?? undefined,
    status: r.status,
    adminNote: r.admin_note ?? undefined,
    isDemo: Boolean(r.is_demo),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapSourceRow(r: Record<string, any>): MonitoredSource {
  return {
    id: r.id,
    nameEn: r.name_en,
    nameUr: r.name_ur,
    institutionCode: r.institution_code,
    sourceType: r.source_type,
    url: r.url,
    categoryDefault: r.category_default,
    provinceDefault: r.province_default,
    trusted: Boolean(r.trusted),
    enabled: Boolean(r.enabled),
    checkIntervalMinutes: Number(r.check_interval_minutes ?? 60),
    lastCheckedAt: r.last_checked_at ?? null,
    lastSuccessAt: r.last_success_at ?? null,
    lastStatus: r.last_status ?? 'never',
    lastError: r.last_error ?? null,
    itemsDetected: Number(r.items_detected ?? 0),
    isDemo: Boolean(r.is_demo),
  };
}

function mapUpdateRow(r: Record<string, any>): NationalUpdate {
  return {
    id: r.id,
    sourceId: r.source_id,
    sourceNameEn: r.source_name_en,
    sourceNameUr: r.source_name_ur,
    sourceUrl: r.source_url,
    canonicalKey: r.canonical_key,
    contentHash: r.content_hash,
    category: r.category,
    province: r.province,
    city: r.city,
    titleEn: r.title_en,
    titleUr: r.title_ur,
    summaryEn: r.summary_en,
    summaryUr: r.summary_ur,
    summaryRomanUrdu: r.summary_roman_urdu,
    eligibilityEn: asStrArray(r.eligibility_en),
    eligibilityUr: asStrArray(r.eligibility_ur),
    feeNoteEn: r.fee_note_en,
    feeNoteUr: r.fee_note_ur,
    deadline: r.deadline,
    previousDeadline: r.previous_deadline ?? undefined,
    deadlineChangedAt: r.deadline_changed_at ?? undefined,
    originalPublishedDate: r.original_published_date,
    discoveredAt: r.discovered_at,
    lastVerifiedDate: r.last_verified_date,
    status: r.status,
    processingMode: 'rule_parser',
    validationWarnings: asStrArray(r.validation_warnings),
    trustedSource: Boolean(r.trusted_source),
    isDemo: Boolean(r.is_demo),
  };
}

function mapSyncStateRow(r: Record<string, any> | undefined): SyncEngineState {
  if (!r) return structuredClone(SEED_DATA.syncEngineState);
  return {
    schedulerEnabled: Boolean(r.scheduler_enabled),
    intervalMinutes: Number(r.interval_minutes ?? 60),
    isSyncing: Boolean(r.is_syncing),
    lastSyncStartedAt: r.last_sync_started_at ?? null,
    lastSuccessfulSyncAt: r.last_successful_sync_at ?? null,
    lastScheduledSyncAt: r.last_scheduled_sync_at ?? null,
    nextScheduledSyncAt: r.next_scheduled_sync_at ?? null,
    totalSyncRuns: Number(r.total_sync_runs ?? 0),
    newAnnouncementsDetected: Number(r.new_announcements_detected ?? 0),
    autoPublishedCount: Number(r.auto_published_count ?? 0),
    duplicatesSkippedCount: Number(r.duplicates_skipped_count ?? 0),
    lastRunSummary: r.last_run_summary ?? null,
  };
}

export async function readDb(): Promise<DatabaseSchema> {
  await initDb();
  if (getDbMode() === 'local_json') {
    return readLocalDb();
  }

  const sql = getSql();
  const [
    oppRows,
    guideRows,
    problemRows,
    msgRows,
    credRows,
    sourceRows,
    updateRows,
    subRows,
    logRows,
    stateRows,
  ] = await Promise.all([
    sql.query('SELECT * FROM opportunities ORDER BY created_at DESC'),
    sql.query('SELECT * FROM document_guides ORDER BY sort_order ASC, id ASC'),
    sql.query('SELECT * FROM problem_reports ORDER BY created_at DESC'),
    sql.query('SELECT * FROM contact_messages ORDER BY created_at DESC'),
    sql.query(`SELECT salt, hash, created_at FROM admin_credentials WHERE id = 'primary' LIMIT 1`),
    sql.query('SELECT * FROM monitored_sources ORDER BY sort_order ASC, id ASC'),
    sql.query('SELECT * FROM national_updates ORDER BY discovered_at DESC'),
    sql.query('SELECT * FROM notification_subscriptions ORDER BY updated_at DESC LIMIT 500'),
    sql.query('SELECT * FROM sync_audit_logs ORDER BY timestamp DESC LIMIT 200'),
    sql.query(`SELECT * FROM sync_engine_state WHERE id = 'default' LIMIT 1`),
  ]);

  const adminCredential: AdminCredential | null = credRows[0]
    ? {
        salt: String(credRows[0].salt),
        hash: String(credRows[0].hash),
        createdAt: String(credRows[0].created_at),
      }
    : null;

  return {
    opportunities: oppRows.map(mapOpportunityRow),
    guides: guideRows.map(mapGuideRow),
    problems: problemRows.map(mapProblemRow),
    contactMessages: msgRows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      contact: String(r.contact),
      topic: String(r.topic),
      message: String(r.message),
      createdAt: String(r.created_at),
    })),
    adminCredential,
    monitoredSources: sourceRows.map(mapSourceRow),
    nationalUpdates: updateRows.map(mapUpdateRow),
    notificationSubscriptions: subRows.map((r) => ({
      id: String(r.id),
      province: r.province,
      categories: asStrArray(r.categories) as NotificationSubscription['categories'],
      topics: asStrArray(r.topics) as NotificationSubscription['topics'],
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    })),
    syncAuditLogs: logRows.map((r) => ({
      id: String(r.id),
      timestamp: String(r.timestamp),
      actor: r.actor,
      action: r.action,
      targetId: r.target_id ?? undefined,
      detail: String(r.detail),
    })),
    syncEngineState: mapSyncStateRow(stateRows[0]),
  };
}

export async function getOrCreateSessionSecret(): Promise<string> {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret) return envSecret;

  if (getDbMode() === 'neon_postgres') {
    await initDb();
    const sql = getSql();
    const candidate = crypto.randomBytes(32).toString('hex');
    await sql.query(
      `INSERT INTO raasta_settings (key, value)
       VALUES ('session_secret', $1)
       ON CONFLICT (key) DO NOTHING`,
      [candidate],
    );
    const rows = await sql.query(
      `SELECT value FROM raasta_settings WHERE key = 'session_secret' LIMIT 1`,
    );
    if (rows[0]?.value) {
      return String(rows[0].value);
    }
    return candidate;
  }

  if (!localFallbackSecret) {
    localFallbackSecret = crypto.randomBytes(32).toString('hex');
  }
  return localFallbackSecret;
}

export async function getAdminCredential(): Promise<AdminCredential | null> {
  await initDb();
  if (getDbMode() === 'local_json') {
    return readLocalDb().adminCredential;
  }
  const sql = getSql();
  const rows = await sql.query(
    `SELECT salt, hash, created_at FROM admin_credentials WHERE id = 'primary' LIMIT 1`,
  );
  if (!rows[0]) return null;
  return {
    salt: String(rows[0].salt),
    hash: String(rows[0].hash),
    createdAt: String(rows[0].created_at),
  };
}

export async function claimAdminCredential(cred: AdminCredential): Promise<boolean> {
  await initDb();
  if (getDbMode() === 'local_json') {
    return mutateLocalDb((db) => {
      if (db.adminCredential) return false;
      db.adminCredential = cred;
      return true;
    });
  }
  return pgInsertAdminCredentialIfEmpty(getSql(), cred);
}

export async function insertOpportunity(item: Opportunity): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      db.opportunities.unshift(item);
    });
    return;
  }
  await pgUpsertOpportunity(getSql(), item, false);
}

export async function updateOpportunity(item: Opportunity): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      const idx = db.opportunities.findIndex((o) => o.id === item.id);
      if (idx !== -1) db.opportunities[idx] = item;
    });
    return;
  }
  await pgUpsertOpportunity(getSql(), item, false);
}

export async function deleteOpportunityById(id: string): Promise<boolean> {
  await initDb();
  if (getDbMode() === 'local_json') {
    return mutateLocalDb((db) => {
      const before = db.opportunities.length;
      db.opportunities = db.opportunities.filter((o) => o.id !== id);
      return db.opportunities.length < before;
    });
  }
  const rows = await getSql().query(
    `DELETE FROM opportunities WHERE id = $1 RETURNING id`,
    [id],
  );
  return rows.length > 0;
}

export async function insertGuide(guide: DocumentGuide): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      db.guides.unshift(guide);
    });
    return;
  }
  await pgUpsertGuide(getSql(), guide, -Date.now(), false);
}

export async function updateGuide(guide: DocumentGuide): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      const idx = db.guides.findIndex((g) => g.id === guide.id);
      if (idx !== -1) db.guides[idx] = guide;
    });
    return;
  }
  await pgUpsertGuide(getSql(), guide, 0, false);
}

export async function deleteGuideById(id: string): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      db.guides = db.guides.filter((g) => g.id !== id);
    });
    return;
  }
  await getSql().query(`DELETE FROM document_guides WHERE id = $1`, [id]);
}

export async function insertProblem(problem: ProblemReport): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      db.problems.unshift(problem);
    });
    return;
  }
  await pgUpsertProblem(getSql(), problem, false);
}

export async function updateProblem(problem: ProblemReport): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      const idx = db.problems.findIndex((p) => p.id === problem.id);
      if (idx !== -1) db.problems[idx] = problem;
    });
    return;
  }
  await pgUpsertProblem(getSql(), problem, false);
}

export async function deleteProblemById(id: string): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      db.problems = db.problems.filter((p) => p.id !== id);
    });
    return;
  }
  await getSql().query(`DELETE FROM problem_reports WHERE id = $1`, [id]);
}

export async function insertContactMessage(msg: ContactMessage): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      db.contactMessages.unshift(msg);
    });
    return;
  }
  await pgInsertContactMessage(getSql(), msg);
}

export async function upsertMonitoredSource(
  source: MonitoredSource,
  isNew = false,
): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      const idx = db.monitoredSources.findIndex((s) => s.id === source.id);
      if (idx !== -1) {
        db.monitoredSources[idx] = source;
      } else {
        db.monitoredSources.unshift(source);
      }
    });
    return;
  }
  await pgUpsertMonitoredSource(getSql(), source, isNew ? -Date.now() : 0, false);
}

export async function deleteMonitoredSourceById(id: string): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      db.monitoredSources = db.monitoredSources.filter((s) => s.id !== id);
    });
    return;
  }
  await getSql().query(`DELETE FROM monitored_sources WHERE id = $1`, [id]);
}

export async function upsertNationalUpdate(update: NationalUpdate): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      const idx = db.nationalUpdates.findIndex((u) => u.id === update.id);
      if (idx !== -1) {
        db.nationalUpdates[idx] = update;
      } else {
        db.nationalUpdates.unshift(update);
      }
    });
    return;
  }
  await pgUpsertNationalUpdate(getSql(), update, false);
}

export async function deleteNationalUpdateById(id: string): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      db.nationalUpdates = db.nationalUpdates.filter((u) => u.id !== id);
    });
    return;
  }
  await getSql().query(`DELETE FROM national_updates WHERE id = $1`, [id]);
}

export async function upsertNotificationSubscription(
  sub: NotificationSubscription,
): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      const idx = db.notificationSubscriptions.findIndex((s) => s.id === sub.id);
      if (idx !== -1) {
        db.notificationSubscriptions[idx] = sub;
      } else {
        db.notificationSubscriptions.unshift(sub);
        if (db.notificationSubscriptions.length > 500) {
          db.notificationSubscriptions = db.notificationSubscriptions.slice(0, 500);
        }
      }
    });
    return;
  }
  await pgUpsertNotificationSubscription(getSql(), sub, false);
}

export async function insertAuditLogEntry(entry: AuditLogEntry): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      db.syncAuditLogs.unshift(entry);
      if (db.syncAuditLogs.length > 200) {
        db.syncAuditLogs = db.syncAuditLogs.slice(0, 200);
      }
    });
    return;
  }
  await pgInsertAuditLog(getSql(), entry);
}

export async function saveSyncEngineState(state: SyncEngineState): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      db.syncEngineState = state;
    });
    return;
  }
  await pgSaveSyncEngineState(getSql(), state, false);
}

export async function persistSyncBatch(params: {
  sources?: MonitoredSource[];
  updates?: NationalUpdate[];
  expiredOpportunities?: Opportunity[];
  logs?: AuditLogEntry[];
  state?: SyncEngineState;
}): Promise<void> {
  await initDb();
  if (getDbMode() === 'local_json') {
    await mutateLocalDb((db) => {
      if (params.sources) {
        for (const src of params.sources) {
          const idx = db.monitoredSources.findIndex((s) => s.id === src.id);
          if (idx !== -1) db.monitoredSources[idx] = src;
          else db.monitoredSources.unshift(src);
        }
      }
      if (params.updates) {
        for (const upd of params.updates) {
          const idx = db.nationalUpdates.findIndex((u) => u.id === upd.id);
          if (idx !== -1) db.nationalUpdates[idx] = upd;
          else db.nationalUpdates.unshift(upd);
        }
      }
      if (params.expiredOpportunities) {
        for (const opp of params.expiredOpportunities) {
          const idx = db.opportunities.findIndex((o) => o.id === opp.id);
          if (idx !== -1) db.opportunities[idx] = opp;
        }
      }
      if (params.logs && params.logs.length > 0) {
        db.syncAuditLogs = [...params.logs, ...db.syncAuditLogs].slice(0, 200);
      }
      if (params.state) {
        db.syncEngineState = params.state;
      }
    });
    return;
  }

  const sql = getSql();
  if (params.sources) {
    for (const src of params.sources) {
      await pgUpsertMonitoredSource(sql, src, 0, false);
    }
  }
  if (params.updates) {
    for (const upd of params.updates) {
      await pgUpsertNationalUpdate(sql, upd, false);
    }
  }
  if (params.expiredOpportunities) {
    for (const opp of params.expiredOpportunities) {
      await pgUpsertOpportunity(sql, opp, false);
    }
  }
  if (params.logs) {
    for (const log of params.logs) {
      await pgInsertAuditLog(sql, log);
    }
  }
  if (params.state) {
    await pgSaveSyncEngineState(sql, params.state, false);
  }
}

export function toPublicProblem(problem: ProblemReport): PublicProblemSummary {
  return {
    id: problem.id,
    referenceCode: problem.referenceCode,
    category: problem.category,
    province: problem.province,
    district: problem.district,
    area: problem.area,
    title: problem.title,
    description: problem.description,
    status: problem.status,
    adminNote: problem.adminNote,
    isDemo: problem.isDemo,
    createdAt: problem.createdAt,
    updatedAt: problem.updatedAt,
  };
}

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}
