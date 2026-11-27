import crypto from 'node:crypto';
import type {
  AuditLogEntry,
  MonitoredSource,
  NationalUpdate,
  SyncEngineStats,
} from '../src/types.ts';
import { readDb, writeDb, type DatabaseSchema } from './db.ts';
import { fetchSourceAnnouncements, type RawDiscoveredItem } from './sourceFetcher.ts';
import { isDeadlineExpired, processDiscoveredAnnouncement } from './updateProcessor.ts';

let syncLock = false;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let startupTimer: ReturnType<typeof setTimeout> | null = null;

export function appendAuditLog(
  db: DatabaseSchema,
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>,
): void {
  db.syncAuditLogs.unshift({
    id: `aud-${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (db.syncAuditLogs.length > 200) {
    db.syncAuditLogs = db.syncAuditLogs.slice(0, 200);
  }
}

export function sweepExpiredItems(
  db: DatabaseSchema,
  actor: AuditLogEntry['actor'] = 'scheduler',
): number {
  let expiredCount = 0;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  for (const item of db.nationalUpdates) {
    if (
      (item.status === 'auto_published' ||
        item.status === 'approved' ||
        item.status === 'pending_verification') &&
      isDeadlineExpired(item.deadline, now)
    ) {
      item.status = 'expired';
      item.lastVerifiedDate = today;
      expiredCount += 1;
      appendAuditLog(db, {
        actor,
        action: 'marked_expired',
        targetId: item.id,
        detail: `Marked update "${item.titleEn}" expired (deadline ${item.deadline} passed).`,
      });
    }
  }

  for (const opp of db.opportunities) {
    if ((opp.status === 'active' || opp.status === 'pending') && isDeadlineExpired(opp.deadline, now)) {
      opp.status = 'expired';
      opp.lastVerifiedDate = today;
      expiredCount += 1;
    }
  }

  return expiredCount;
}

export interface IngestResult {
  outcome: 'created' | 'duplicate' | 'deadline_updated' | 'blocked';
  update?: NationalUpdate;
  reason?: string;
}

export async function ingestRawItem(
  db: DatabaseSchema,
  rawItem: RawDiscoveredItem,
  source: MonitoredSource,
  actor: AuditLogEntry['actor'],
  isDemo = false,
): Promise<IngestResult> {
  const { candidate, blockedReason } = await processDiscoveredAnnouncement(rawItem, source, isDemo);
  if (blockedReason) {
    appendAuditLog(db, {
      actor,
      action: 'source_skipped',
      targetId: source.id,
      detail: blockedReason,
    });
    return { outcome: 'blocked', reason: blockedReason };
  }

  // Check exact hash or canonical URL+title match
  const existingIdx = db.nationalUpdates.findIndex(
    (u) =>
      u.contentHash === candidate.contentHash ||
      u.canonicalKey === candidate.canonicalKey ||
      (u.sourceUrl.trim().toLowerCase() === candidate.sourceUrl.trim().toLowerCase() &&
        u.titleEn.trim().toLowerCase() === candidate.titleEn.trim().toLowerCase()),
  );

  if (existingIdx !== -1) {
    const existing = db.nationalUpdates[existingIdx];
    // Detect deadline change on existing announcement
    if (
      candidate.deadline !== 'Not specified' &&
      candidate.deadline !== existing.deadline &&
      existing.deadline !== candidate.deadline
    ) {
      const prevDeadline = existing.deadline;
      existing.previousDeadline = prevDeadline;
      existing.deadline = candidate.deadline;
      existing.deadlineChangedAt = new Date().toISOString();
      existing.lastVerifiedDate = candidate.lastVerifiedDate;
      existing.contentHash = candidate.contentHash;
      if (isDeadlineExpired(candidate.deadline)) {
        existing.status = 'expired';
      } else if (existing.status === 'expired') {
        existing.status = candidate.trustedSource ? 'auto_published' : 'pending_verification';
      }
      appendAuditLog(db, {
        actor,
        action: 'deadline_updated',
        targetId: existing.id,
        detail: `Deadline updated for "${existing.titleEn}": ${prevDeadline} -> ${candidate.deadline}.`,
      });
      return { outcome: 'deadline_updated', update: existing };
    }

    db.syncEngineState.duplicatesSkippedCount += 1;
    appendAuditLog(db, {
      actor,
      action: 'duplicate_skipped',
      targetId: existing.id,
      detail: `Skipped duplicate announcement "${candidate.titleEn}" from ${source.institutionCode}.`,
    });
    return { outcome: 'duplicate', update: existing, reason: 'Duplicate announcement skipped.' };
  }

  const created: NationalUpdate = {
    id: `upd-${crypto.randomBytes(4).toString('hex')}`,
    ...candidate,
  };

  db.nationalUpdates.unshift(created);
  db.syncEngineState.newAnnouncementsDetected += 1;
  if (created.status === 'auto_published') {
    db.syncEngineState.autoPublishedCount += 1;
    appendAuditLog(db, {
      actor,
      action: 'auto_published',
      targetId: created.id,
      detail: `Auto-published "${created.titleEn}" (${created.category}, ${created.province}) via ${created.processingMode}.`,
    });
  } else if (created.status === 'expired') {
    appendAuditLog(db, {
      actor,
      action: 'marked_expired',
      targetId: created.id,
      detail: `Discovered already-expired notice "${created.titleEn}" (deadline ${created.deadline}).`,
    });
  } else {
    appendAuditLog(db, {
      actor,
      action: 'queued_for_review',
      targetId: created.id,
      detail: `Queued "${created.titleEn}" for Admin verification (${created.validationWarnings.join('; ') || 'Manual check'}).`,
    });
  }

  return { outcome: 'created', update: created };
}

export async function runSyncCycle(
  trigger: 'scheduler' | 'manual_sync',
): Promise<{ ok: boolean; summary: string; state: DatabaseSchema['syncEngineState'] }> {
  if (syncLock) {
    const db = readDb();
    return {
      ok: false,
      summary: 'A synchronization cycle is already in progress.',
      state: db.syncEngineState,
    };
  }

  syncLock = true;
  const startIso = new Date().toISOString();

  try {
    const db = readDb();
    db.syncEngineState.isSyncing = true;
    db.syncEngineState.lastSyncStartedAt = startIso;
    writeDb(db);

    const expiredSwept = sweepExpiredItems(db, trigger);
    const enabledSources = db.monitoredSources.filter((s) => s.enabled);

    let sourcesChecked = 0;
    let sourcesWorking = 0;
    let sourcesErrored = 0;
    let sourcesSkipped = 0;
    let cycleNew = 0;
    let cycleDupes = 0;
    let cycleUpdated = 0;

    // Process enabled sources in bounded parallel batches of 4
    const batchSize = 4;
    for (let i = 0; i < enabledSources.length; i += batchSize) {
      const batch = enabledSources.slice(i, i + batchSize);
      const outcomes = await Promise.all(
        batch.map(async (src) => ({
          source: src,
          outcome: await fetchSourceAnnouncements(src),
        })),
      );

      for (const { source, outcome } of outcomes) {
        sourcesChecked += 1;
        const checkedIso = new Date().toISOString();
        source.lastCheckedAt = checkedIso;
        source.lastStatus = outcome.status;
        source.lastError = outcome.error;

        if (outcome.status === 'ok') {
          sourcesWorking += 1;
          source.lastSuccessAt = checkedIso;
          source.itemsDetected += outcome.items.length;

          for (const rawItem of outcome.items) {
            const res = await ingestRawItem(db, rawItem, source, trigger, false);
            if (res.outcome === 'created') cycleNew += 1;
            else if (res.outcome === 'duplicate') cycleDupes += 1;
            else if (res.outcome === 'deadline_updated') cycleUpdated += 1;
          }
        } else if (outcome.status === 'skipped') {
          sourcesSkipped += 1;
          appendAuditLog(db, {
            actor: trigger,
            action: 'source_skipped',
            targetId: source.id,
            detail: `${source.institutionCode}: ${outcome.error || 'Access restricted'}`,
          });
        } else {
          sourcesErrored += 1;
          appendAuditLog(db, {
            actor: trigger,
            action: 'source_error',
            targetId: source.id,
            detail: `${source.institutionCode}: ${outcome.error || 'Fetch failed'}`,
          });
        }
      }
    }

    const doneIso = new Date().toISOString();
    const intervalMs = Math.max(5, db.syncEngineState.intervalMinutes || 60) * 60 * 1000;
    const summary = `Checked ${sourcesChecked} sources (${sourcesWorking} ok, ${sourcesSkipped} skipped, ${sourcesErrored} errors). New: ${cycleNew}, Updated: ${cycleUpdated}, Duplicates skipped: ${cycleDupes}, Expired marked: ${expiredSwept}.`;

    db.syncEngineState.isSyncing = false;
    db.syncEngineState.lastSuccessfulSyncAt = doneIso;
    if (trigger === 'scheduler') {
      db.syncEngineState.lastScheduledSyncAt = doneIso;
    }
    db.syncEngineState.nextScheduledSyncAt = new Date(Date.now() + intervalMs).toISOString();
    db.syncEngineState.totalSyncRuns += 1;
    db.syncEngineState.lastRunSummary = summary;

    appendAuditLog(db, {
      actor: trigger,
      action: 'sync_completed',
      detail: summary,
    });

    writeDb(db);
    return { ok: true, summary, state: db.syncEngineState };
  } finally {
    syncLock = false;
    try {
      const latest = readDb();
      if (latest.syncEngineState.isSyncing) {
        latest.syncEngineState.isSyncing = false;
        writeDb(latest);
      }
    } catch {
      // Ignore cleanup error
    }
  }
}

export function startSyncScheduler(): void {
  if (schedulerTimer || startupTimer) return;

  // Run initial scheduled check 2.5 seconds after server startup (non-blocking)
  startupTimer = setTimeout(() => {
    startupTimer = null;
    const db = readDb();
    if (db.syncEngineState.schedulerEnabled) {
      void runSyncCycle('scheduler');
    }
  }, 2500);

  // Check every 60 seconds whether the scheduled interval has elapsed
  schedulerTimer = setInterval(() => {
    const db = readDb();
    if (!db.syncEngineState.schedulerEnabled || syncLock) return;
    const nextRun = db.syncEngineState.nextScheduledSyncAt
      ? Date.parse(db.syncEngineState.nextScheduledSyncAt)
      : 0;
    if (!nextRun || Date.now() >= nextRun) {
      void runSyncCycle('scheduler');
    }
  }, 60 * 1000);
}

export function computeEngineStats(db: DatabaseSchema): SyncEngineStats {
  const totalSources = db.monitoredSources.length;
  const workingSources = db.monitoredSources.filter((s) => s.lastStatus === 'ok').length;
  const errorSources = db.monitoredSources.filter((s) => s.lastStatus === 'error').length;

  const autoPublishedPosts = db.nationalUpdates.filter(
    (u) => u.status === 'auto_published' || u.status === 'approved',
  ).length;
  const pendingVerification = db.nationalUpdates.filter(
    (u) => u.status === 'pending_verification',
  ).length;
  const expiredAnnouncements = db.nationalUpdates.filter((u) => u.status === 'expired').length;

  return {
    totalSources,
    workingSources,
    errorSources,
    newAnnouncementsDetected: db.syncEngineState.newAnnouncementsDetected,
    autoPublishedPosts,
    pendingVerification,
    expiredAnnouncements,
    duplicateAnnouncements: db.syncEngineState.duplicatesSkippedCount,
    lastSuccessfulSyncAt: db.syncEngineState.lastSuccessfulSyncAt,
    lastScheduledSyncAt: db.syncEngineState.lastScheduledSyncAt,
    nextScheduledSyncAt: db.syncEngineState.nextScheduledSyncAt,
    schedulerEnabled: db.syncEngineState.schedulerEnabled,
    intervalMinutes: db.syncEngineState.intervalMinutes,
    isSyncing: db.syncEngineState.isSyncing,
    totalSyncRuns: db.syncEngineState.totalSyncRuns,
    lastRunSummary: db.syncEngineState.lastRunSummary,
  };
}
