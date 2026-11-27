import type { NeonQueryFunction } from '@neondatabase/serverless';
import type {
  AuditLogEntry,
  ContactMessage,
  DocumentGuide,
  MonitoredSource,
  NationalUpdate,
  NotificationSubscription,
  Opportunity,
  ProblemReport,
  SyncEngineState,
} from '../src/types.ts';
import { SEED_DATA, type AdminCredential } from './seedData.ts';

export type NeonSql = NeonQueryFunction<false, false>;

const DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS raasta_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS admin_credentials (
    id TEXT PRIMARY KEY,
    salt TEXT NOT NULL,
    hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_ur TEXT NOT NULL,
    organization_en TEXT NOT NULL,
    organization_ur TEXT NOT NULL,
    province TEXT NOT NULL,
    city_or_scope_en TEXT NOT NULL,
    city_or_scope_ur TEXT NOT NULL,
    education_level TEXT NOT NULL,
    deadline TEXT NOT NULL,
    stipend_or_scope_en TEXT NOT NULL,
    stipend_or_scope_ur TEXT NOT NULL,
    eligibility_en JSONB NOT NULL DEFAULT '[]'::jsonb,
    eligibility_ur JSONB NOT NULL DEFAULT '[]'::jsonb,
    required_docs_en JSONB NOT NULL DEFAULT '[]'::jsonb,
    required_docs_ur JSONB NOT NULL DEFAULT '[]'::jsonb,
    description_en TEXT NOT NULL,
    description_ur TEXT NOT NULL,
    official_url TEXT NOT NULL,
    verified_source BOOLEAN NOT NULL DEFAULT FALSE,
    last_verified_date TEXT NOT NULL,
    status TEXT NOT NULL,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_by TEXT,
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS document_guides (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_ur TEXT NOT NULL,
    authority_en TEXT NOT NULL,
    authority_ur TEXT NOT NULL,
    province TEXT NOT NULL,
    summary_en TEXT NOT NULL,
    summary_ur TEXT NOT NULL,
    required_docs_en JSONB NOT NULL DEFAULT '[]'::jsonb,
    required_docs_ur JSONB NOT NULL DEFAULT '[]'::jsonb,
    steps_en JSONB NOT NULL DEFAULT '[]'::jsonb,
    steps_ur JSONB NOT NULL DEFAULT '[]'::jsonb,
    fee_note_en TEXT NOT NULL,
    fee_note_ur TEXT NOT NULL,
    official_url TEXT NOT NULL,
    verified_source BOOLEAN NOT NULL DEFAULT FALSE,
    last_verified_date TEXT NOT NULL,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order BIGINT NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS problem_reports (
    id TEXT PRIMARY KEY,
    reference_code TEXT NOT NULL,
    category TEXT NOT NULL,
    province TEXT NOT NULL,
    district TEXT NOT NULL,
    area TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reporter_name TEXT,
    reporter_contact TEXT,
    status TEXT NOT NULL,
    admin_note TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS contact_messages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    topic TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS monitored_sources (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_ur TEXT NOT NULL,
    institution_code TEXT NOT NULL,
    source_type TEXT NOT NULL,
    url TEXT NOT NULL,
    category_default TEXT NOT NULL,
    province_default TEXT NOT NULL,
    trusted BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    check_interval_minutes INTEGER NOT NULL DEFAULT 60,
    last_checked_at TEXT,
    last_success_at TEXT,
    last_status TEXT NOT NULL DEFAULT 'never',
    last_error TEXT,
    items_detected INTEGER NOT NULL DEFAULT 0,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order BIGINT NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS national_updates (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    source_name_en TEXT NOT NULL,
    source_name_ur TEXT NOT NULL,
    source_url TEXT NOT NULL,
    canonical_key TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    category TEXT NOT NULL,
    province TEXT NOT NULL,
    city TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_ur TEXT NOT NULL,
    summary_en TEXT NOT NULL,
    summary_ur TEXT NOT NULL,
    summary_roman_urdu TEXT NOT NULL,
    eligibility_en JSONB NOT NULL DEFAULT '[]'::jsonb,
    eligibility_ur JSONB NOT NULL DEFAULT '[]'::jsonb,
    fee_note_en TEXT NOT NULL,
    fee_note_ur TEXT NOT NULL,
    deadline TEXT NOT NULL,
    previous_deadline TEXT,
    deadline_changed_at TEXT,
    original_published_date TEXT NOT NULL,
    discovered_at TEXT NOT NULL,
    last_verified_date TEXT NOT NULL,
    status TEXT NOT NULL,
    processing_mode TEXT NOT NULL DEFAULT 'rule_parser',
    validation_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    trusted_source BOOLEAN NOT NULL DEFAULT FALSE,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE
  )`,

  `CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id TEXT PRIMARY KEY,
    province TEXT NOT NULL,
    categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS sync_audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    detail TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS sync_engine_state (
    id TEXT PRIMARY KEY,
    scheduler_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    interval_minutes INTEGER NOT NULL DEFAULT 60,
    is_syncing BOOLEAN NOT NULL DEFAULT FALSE,
    last_sync_started_at TEXT,
    last_successful_sync_at TEXT,
    last_scheduled_sync_at TEXT,
    next_scheduled_sync_at TEXT,
    total_sync_runs INTEGER NOT NULL DEFAULT 0,
    new_announcements_detected INTEGER NOT NULL DEFAULT 0,
    auto_published_count INTEGER NOT NULL DEFAULT 0,
    duplicates_skipped_count INTEGER NOT NULL DEFAULT 0,
    last_run_summary TEXT
  )`,

  `CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities (status, category, province)`,
  `CREATE INDEX IF NOT EXISTS idx_national_updates_status_cat ON national_updates (status, category, province)`,
  `CREATE INDEX IF NOT EXISTS idx_national_updates_hash ON national_updates (content_hash, canonical_key)`,
  `CREATE INDEX IF NOT EXISTS idx_sync_audit_timestamp ON sync_audit_logs (timestamp DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_problems_created_at ON problem_reports (created_at DESC)`,
];

export async function pgUpsertOpportunity(
  sql: NeonSql,
  item: Opportunity,
  preserveExisting = false,
): Promise<void> {
  const onConflict = preserveExisting
    ? 'ON CONFLICT (id) DO NOTHING'
    : `ON CONFLICT (id) DO UPDATE SET
        category = EXCLUDED.category,
        title_en = EXCLUDED.title_en,
        title_ur = EXCLUDED.title_ur,
        organization_en = EXCLUDED.organization_en,
        organization_ur = EXCLUDED.organization_ur,
        province = EXCLUDED.province,
        city_or_scope_en = EXCLUDED.city_or_scope_en,
        city_or_scope_ur = EXCLUDED.city_or_scope_ur,
        education_level = EXCLUDED.education_level,
        deadline = EXCLUDED.deadline,
        stipend_or_scope_en = EXCLUDED.stipend_or_scope_en,
        stipend_or_scope_ur = EXCLUDED.stipend_or_scope_ur,
        eligibility_en = EXCLUDED.eligibility_en,
        eligibility_ur = EXCLUDED.eligibility_ur,
        required_docs_en = EXCLUDED.required_docs_en,
        required_docs_ur = EXCLUDED.required_docs_ur,
        description_en = EXCLUDED.description_en,
        description_ur = EXCLUDED.description_ur,
        official_url = EXCLUDED.official_url,
        verified_source = EXCLUDED.verified_source,
        last_verified_date = EXCLUDED.last_verified_date,
        status = EXCLUDED.status,
        is_demo = EXCLUDED.is_demo,
        submitted_by = EXCLUDED.submitted_by,
        created_at = EXCLUDED.created_at`;

  await sql.query(
    `INSERT INTO opportunities (
      id, category, title_en, title_ur, organization_en, organization_ur,
      province, city_or_scope_en, city_or_scope_ur, education_level, deadline,
      stipend_or_scope_en, stipend_or_scope_ur, eligibility_en, eligibility_ur,
      required_docs_en, required_docs_ur, description_en, description_ur,
      official_url, verified_source, last_verified_date, status, is_demo,
      submitted_by, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14::jsonb, $15::jsonb,
      $16::jsonb, $17::jsonb, $18, $19,
      $20, $21, $22, $23, $24,
      $25, $26
    ) ${onConflict}`,
    [
      item.id,
      item.category,
      item.titleEn,
      item.titleUr,
      item.organizationEn,
      item.organizationUr,
      item.province,
      item.cityOrScopeEn,
      item.cityOrScopeUr,
      item.educationLevel,
      item.deadline,
      item.stipendOrScopeEn,
      item.stipendOrScopeUr,
      JSON.stringify(item.eligibilityEn || []),
      JSON.stringify(item.eligibilityUr || []),
      JSON.stringify(item.requiredDocsEn || []),
      JSON.stringify(item.requiredDocsUr || []),
      item.descriptionEn,
      item.descriptionUr,
      item.officialUrl,
      Boolean(item.verifiedSource),
      item.lastVerifiedDate,
      item.status,
      Boolean(item.isDemo),
      item.submittedBy ?? null,
      item.createdAt,
    ],
  );
}

export async function pgUpsertGuide(
  sql: NeonSql,
  guide: DocumentGuide,
  sortOrder = 0,
  preserveExisting = false,
): Promise<void> {
  const onConflict = preserveExisting
    ? 'ON CONFLICT (id) DO NOTHING'
    : `ON CONFLICT (id) DO UPDATE SET
        slug = EXCLUDED.slug,
        title_en = EXCLUDED.title_en,
        title_ur = EXCLUDED.title_ur,
        authority_en = EXCLUDED.authority_en,
        authority_ur = EXCLUDED.authority_ur,
        province = EXCLUDED.province,
        summary_en = EXCLUDED.summary_en,
        summary_ur = EXCLUDED.summary_ur,
        required_docs_en = EXCLUDED.required_docs_en,
        required_docs_ur = EXCLUDED.required_docs_ur,
        steps_en = EXCLUDED.steps_en,
        steps_ur = EXCLUDED.steps_ur,
        fee_note_en = EXCLUDED.fee_note_en,
        fee_note_ur = EXCLUDED.fee_note_ur,
        official_url = EXCLUDED.official_url,
        verified_source = EXCLUDED.verified_source,
        last_verified_date = EXCLUDED.last_verified_date,
        is_demo = EXCLUDED.is_demo`;

  await sql.query(
    `INSERT INTO document_guides (
      id, slug, title_en, title_ur, authority_en, authority_ur,
      province, summary_en, summary_ur, required_docs_en, required_docs_ur,
      steps_en, steps_ur, fee_note_en, fee_note_ur, official_url,
      verified_source, last_verified_date, is_demo, sort_order
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10::jsonb, $11::jsonb,
      $12::jsonb, $13::jsonb, $14, $15, $16,
      $17, $18, $19, $20
    ) ${onConflict}`,
    [
      guide.id,
      guide.slug,
      guide.titleEn,
      guide.titleUr,
      guide.authorityEn,
      guide.authorityUr,
      guide.province,
      guide.summaryEn,
      guide.summaryUr,
      JSON.stringify(guide.requiredDocsEn || []),
      JSON.stringify(guide.requiredDocsUr || []),
      JSON.stringify(guide.stepsEn || []),
      JSON.stringify(guide.stepsUr || []),
      guide.feeNoteEn,
      guide.feeNoteUr,
      guide.officialUrl,
      Boolean(guide.verifiedSource),
      guide.lastVerifiedDate,
      Boolean(guide.isDemo),
      sortOrder,
    ],
  );
}

export async function pgUpsertProblem(
  sql: NeonSql,
  problem: ProblemReport,
  preserveExisting = false,
): Promise<void> {
  const onConflict = preserveExisting
    ? 'ON CONFLICT (id) DO NOTHING'
    : `ON CONFLICT (id) DO UPDATE SET
        reference_code = EXCLUDED.reference_code,
        category = EXCLUDED.category,
        province = EXCLUDED.province,
        district = EXCLUDED.district,
        area = EXCLUDED.area,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        reporter_name = EXCLUDED.reporter_name,
        reporter_contact = EXCLUDED.reporter_contact,
        status = EXCLUDED.status,
        admin_note = EXCLUDED.admin_note,
        is_demo = EXCLUDED.is_demo,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at`;

  await sql.query(
    `INSERT INTO problem_reports (
      id, reference_code, category, province, district, area,
      title, description, reporter_name, reporter_contact,
      status, admin_note, is_demo, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13, $14, $15
    ) ${onConflict}`,
    [
      problem.id,
      problem.referenceCode,
      problem.category,
      problem.province,
      problem.district,
      problem.area,
      problem.title,
      problem.description,
      problem.reporterName ?? null,
      problem.reporterContact ?? null,
      problem.status,
      problem.adminNote ?? null,
      Boolean(problem.isDemo),
      problem.createdAt,
      problem.updatedAt,
    ],
  );
}

export async function pgInsertContactMessage(
  sql: NeonSql,
  msg: ContactMessage,
): Promise<void> {
  await sql.query(
    `INSERT INTO contact_messages (id, name, contact, topic, message, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [msg.id, msg.name, msg.contact, msg.topic, msg.message, msg.createdAt],
  );
}

export async function pgUpsertMonitoredSource(
  sql: NeonSql,
  source: MonitoredSource,
  sortOrder = 0,
  preserveExisting = false,
): Promise<void> {
  const onConflict = preserveExisting
    ? 'ON CONFLICT (id) DO NOTHING'
    : `ON CONFLICT (id) DO UPDATE SET
        name_en = EXCLUDED.name_en,
        name_ur = EXCLUDED.name_ur,
        institution_code = EXCLUDED.institution_code,
        source_type = EXCLUDED.source_type,
        url = EXCLUDED.url,
        category_default = EXCLUDED.category_default,
        province_default = EXCLUDED.province_default,
        trusted = EXCLUDED.trusted,
        enabled = EXCLUDED.enabled,
        check_interval_minutes = EXCLUDED.check_interval_minutes,
        last_checked_at = EXCLUDED.last_checked_at,
        last_success_at = EXCLUDED.last_success_at,
        last_status = EXCLUDED.last_status,
        last_error = EXCLUDED.last_error,
        items_detected = EXCLUDED.items_detected,
        is_demo = EXCLUDED.is_demo`;

  await sql.query(
    `INSERT INTO monitored_sources (
      id, name_en, name_ur, institution_code, source_type, url,
      category_default, province_default, trusted, enabled,
      check_interval_minutes, last_checked_at, last_success_at,
      last_status, last_error, items_detected, is_demo, sort_order
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13,
      $14, $15, $16, $17, $18
    ) ${onConflict}`,
    [
      source.id,
      source.nameEn,
      source.nameUr,
      source.institutionCode,
      source.sourceType,
      source.url,
      source.categoryDefault,
      source.provinceDefault,
      Boolean(source.trusted),
      Boolean(source.enabled),
      Number(source.checkIntervalMinutes || 60),
      source.lastCheckedAt ?? null,
      source.lastSuccessAt ?? null,
      source.lastStatus || 'never',
      source.lastError ?? null,
      Number(source.itemsDetected || 0),
      Boolean(source.isDemo),
      sortOrder,
    ],
  );
}

export async function pgUpsertNationalUpdate(
  sql: NeonSql,
  update: NationalUpdate,
  preserveExisting = false,
): Promise<void> {
  const onConflict = preserveExisting
    ? 'ON CONFLICT (id) DO NOTHING'
    : `ON CONFLICT (id) DO UPDATE SET
        source_id = EXCLUDED.source_id,
        source_name_en = EXCLUDED.source_name_en,
        source_name_ur = EXCLUDED.source_name_ur,
        source_url = EXCLUDED.source_url,
        canonical_key = EXCLUDED.canonical_key,
        content_hash = EXCLUDED.content_hash,
        category = EXCLUDED.category,
        province = EXCLUDED.province,
        city = EXCLUDED.city,
        title_en = EXCLUDED.title_en,
        title_ur = EXCLUDED.title_ur,
        summary_en = EXCLUDED.summary_en,
        summary_ur = EXCLUDED.summary_ur,
        summary_roman_urdu = EXCLUDED.summary_roman_urdu,
        eligibility_en = EXCLUDED.eligibility_en,
        eligibility_ur = EXCLUDED.eligibility_ur,
        fee_note_en = EXCLUDED.fee_note_en,
        fee_note_ur = EXCLUDED.fee_note_ur,
        deadline = EXCLUDED.deadline,
        previous_deadline = EXCLUDED.previous_deadline,
        deadline_changed_at = EXCLUDED.deadline_changed_at,
        original_published_date = EXCLUDED.original_published_date,
        discovered_at = EXCLUDED.discovered_at,
        last_verified_date = EXCLUDED.last_verified_date,
        status = EXCLUDED.status,
        processing_mode = EXCLUDED.processing_mode,
        validation_warnings = EXCLUDED.validation_warnings,
        trusted_source = EXCLUDED.trusted_source,
        is_demo = EXCLUDED.is_demo`;

  await sql.query(
    `INSERT INTO national_updates (
      id, source_id, source_name_en, source_name_ur, source_url,
      canonical_key, content_hash, category, province, city,
      title_en, title_ur, summary_en, summary_ur, summary_roman_urdu,
      eligibility_en, eligibility_ur, fee_note_en, fee_note_ur,
      deadline, previous_deadline, deadline_changed_at,
      original_published_date, discovered_at, last_verified_date,
      status, processing_mode, validation_warnings, trusted_source, is_demo
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15,
      $16::jsonb, $17::jsonb, $18, $19,
      $20, $21, $22,
      $23, $24, $25,
      $26, $27, $28::jsonb, $29, $30
    ) ${onConflict}`,
    [
      update.id,
      update.sourceId,
      update.sourceNameEn,
      update.sourceNameUr,
      update.sourceUrl,
      update.canonicalKey,
      update.contentHash,
      update.category,
      update.province,
      update.city,
      update.titleEn,
      update.titleUr,
      update.summaryEn,
      update.summaryUr,
      update.summaryRomanUrdu,
      JSON.stringify(update.eligibilityEn || []),
      JSON.stringify(update.eligibilityUr || []),
      update.feeNoteEn,
      update.feeNoteUr,
      update.deadline,
      update.previousDeadline ?? null,
      update.deadlineChangedAt ?? null,
      update.originalPublishedDate,
      update.discoveredAt,
      update.lastVerifiedDate,
      update.status,
      'rule_parser',
      JSON.stringify(update.validationWarnings || []),
      Boolean(update.trustedSource),
      Boolean(update.isDemo),
    ],
  );
}

export async function pgUpsertNotificationSubscription(
  sql: NeonSql,
  sub: NotificationSubscription,
  preserveExisting = false,
): Promise<void> {
  const onConflict = preserveExisting
    ? 'ON CONFLICT (id) DO NOTHING'
    : `ON CONFLICT (id) DO UPDATE SET
        province = EXCLUDED.province,
        categories = EXCLUDED.categories,
        topics = EXCLUDED.topics,
        updated_at = EXCLUDED.updated_at`;

  await sql.query(
    `INSERT INTO notification_subscriptions (id, province, categories, topics, created_at, updated_at)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)
     ${onConflict}`,
    [
      sub.id,
      sub.province,
      JSON.stringify(sub.categories || []),
      JSON.stringify(sub.topics || []),
      sub.createdAt,
      sub.updatedAt,
    ],
  );
}

export async function pgInsertAuditLog(
  sql: NeonSql,
  log: AuditLogEntry,
): Promise<void> {
  await sql.query(
    `INSERT INTO sync_audit_logs (id, timestamp, actor, action, target_id, detail)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [log.id, log.timestamp, log.actor, log.action, log.targetId ?? null, log.detail],
  );
}

export async function pgSaveSyncEngineState(
  sql: NeonSql,
  state: SyncEngineState,
  preserveExisting = false,
): Promise<void> {
  const onConflict = preserveExisting
    ? 'ON CONFLICT (id) DO NOTHING'
    : `ON CONFLICT (id) DO UPDATE SET
        scheduler_enabled = EXCLUDED.scheduler_enabled,
        interval_minutes = EXCLUDED.interval_minutes,
        is_syncing = EXCLUDED.is_syncing,
        last_sync_started_at = EXCLUDED.last_sync_started_at,
        last_successful_sync_at = EXCLUDED.last_successful_sync_at,
        last_scheduled_sync_at = EXCLUDED.last_scheduled_sync_at,
        next_scheduled_sync_at = EXCLUDED.next_scheduled_sync_at,
        total_sync_runs = EXCLUDED.total_sync_runs,
        new_announcements_detected = EXCLUDED.new_announcements_detected,
        auto_published_count = EXCLUDED.auto_published_count,
        duplicates_skipped_count = EXCLUDED.duplicates_skipped_count,
        last_run_summary = EXCLUDED.last_run_summary`;

  await sql.query(
    `INSERT INTO sync_engine_state (
      id, scheduler_enabled, interval_minutes, is_syncing,
      last_sync_started_at, last_successful_sync_at, last_scheduled_sync_at,
      next_scheduled_sync_at, total_sync_runs, new_announcements_detected,
      auto_published_count, duplicates_skipped_count, last_run_summary
    ) VALUES (
      'default', $1, $2, $3,
      $4, $5, $6,
      $7, $8, $9,
      $10, $11, $12
    ) ${onConflict}`,
    [
      Boolean(state.schedulerEnabled),
      Number(state.intervalMinutes || 60),
      Boolean(state.isSyncing),
      state.lastSyncStartedAt ?? null,
      state.lastSuccessfulSyncAt ?? null,
      state.lastScheduledSyncAt ?? null,
      state.nextScheduledSyncAt ?? null,
      Number(state.totalSyncRuns || 0),
      Number(state.newAnnouncementsDetected || 0),
      Number(state.autoPublishedCount || 0),
      Number(state.duplicatesSkippedCount || 0),
      state.lastRunSummary ?? null,
    ],
  );
}

export async function pgInsertAdminCredentialIfEmpty(
  sql: NeonSql,
  cred: AdminCredential,
): Promise<boolean> {
  const rows = await sql.query(
    `INSERT INTO admin_credentials (id, salt, hash, created_at)
     VALUES ('primary', $1, $2, $3)
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [cred.salt, cred.hash, cred.createdAt],
  );
  return rows.length > 0;
}

async function tableCount(sql: NeonSql, tableName: string): Promise<number> {
  const rows = await sql.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
  return Number(rows[0]?.count ?? 0);
}

export interface EnsurePgOptions {
  skipDefaultSeed?: boolean;
}

export async function ensurePgSchemaAndSeed(
  sql: NeonSql,
  options: EnsurePgOptions = {},
): Promise<void> {
  for (const stmt of DDL_STATEMENTS) {
    await sql.query(stmt);
  }

  await sql.query(
    `INSERT INTO schema_migrations (version, name)
     VALUES ('001_initial_schema', 'Create core RAASTA Pakistan and National Update Engine tables')
     ON CONFLICT (version) DO NOTHING`,
  );

  if (options.skipDefaultSeed) {
    return;
  }

  const seedMigration = await sql.query(
    `SELECT version FROM schema_migrations WHERE version = '002_initial_seed' LIMIT 1`,
  );

  if (seedMigration.length > 0) {
    return;
  }

  // Only populate tables that currently have 0 rows so existing data is never overwritten
  if ((await tableCount(sql, 'opportunities')) === 0) {
    for (const opp of SEED_DATA.opportunities) {
      await pgUpsertOpportunity(sql, opp, true);
    }
  }

  if ((await tableCount(sql, 'document_guides')) === 0) {
    for (let i = 0; i < SEED_DATA.guides.length; i += 1) {
      await pgUpsertGuide(sql, SEED_DATA.guides[i], i, true);
    }
  }

  if ((await tableCount(sql, 'problem_reports')) === 0) {
    for (const prb of SEED_DATA.problems) {
      await pgUpsertProblem(sql, prb, true);
    }
  }

  if ((await tableCount(sql, 'monitored_sources')) === 0) {
    for (let i = 0; i < SEED_DATA.monitoredSources.length; i += 1) {
      await pgUpsertMonitoredSource(sql, SEED_DATA.monitoredSources[i], i, true);
    }
  }

  if ((await tableCount(sql, 'national_updates')) === 0) {
    for (const upd of SEED_DATA.nationalUpdates) {
      await pgUpsertNationalUpdate(sql, upd, true);
    }
  }

  if ((await tableCount(sql, 'sync_audit_logs')) === 0) {
    for (const log of SEED_DATA.syncAuditLogs) {
      await pgInsertAuditLog(sql, log);
    }
  }

  await pgSaveSyncEngineState(sql, SEED_DATA.syncEngineState, true);

  await sql.query(
    `INSERT INTO schema_migrations (version, name)
     VALUES ('002_initial_seed', 'Populate initial RAASTA Pakistan demo and National Update Engine catalog')
     ON CONFLICT (version) DO NOTHING`,
  );
}
