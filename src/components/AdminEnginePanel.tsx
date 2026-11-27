import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Edit3,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AuditLogEntry,
  MonitoredSource,
  NationalUpdate,
  Province,
  SourceType,
  SyncEngineStats,
  UpdateCategory,
  UpdateVerificationStatus,
} from '../types';

interface AdminEnginePanelProps {
  token: string;
  onDataChanged: () => void;
}

const UPDATE_CATEGORIES: Array<{ value: UpdateCategory; label: string }> = [
  { value: 'gov_jobs', label: 'Government Jobs' },
  { value: 'scholarships', label: 'Scholarships' },
  { value: 'free_courses', label: 'Free Courses' },
  { value: 'gov_schemes', label: 'Government Schemes' },
  { value: 'nadra_updates', label: 'NADRA Updates' },
  { value: 'police_recruitment', label: 'Police Recruitment' },
  { value: 'armed_forces', label: 'Army, Navy & Air Force' },
  { value: 'university_admissions', label: 'University Admissions' },
  { value: 'public_announcements', label: 'Public Announcements' },
  { value: 'citizen_services', label: 'Citizen Services' },
];

const EMPTY_SOURCE_FORM = {
  id: '',
  nameEn: '',
  institutionCode: '',
  url: 'https://',
  sourceType: 'html' as SourceType,
  categoryDefault: 'gov_jobs' as UpdateCategory,
  provinceDefault: 'Federal' as Province,
  trusted: true,
  enabled: true,
  checkIntervalMinutes: 60,
};

function formatStamp(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 19)} UTC`;
}

export const AdminEnginePanel: React.FC<AdminEnginePanelProps> = ({ token, onDataChanged }) => {
  const [stats, setStats] = useState<SyncEngineStats | null>(null);
  const [sources, setSources] = useState<MonitoredSource[]>([]);
  const [updates, setUpdates] = useState<NationalUpdate[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [subscriptionCount, setSubscriptionCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [subView, setSubView] = useState<'queue' | 'sources' | 'ingest' | 'audit'>('queue');
  const [statusFilter, setStatusFilter] = useState<'all' | UpdateVerificationStatus>('all');

  // Source Modal
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [sourceForm, setSourceForm] = useState(EMPTY_SOURCE_FORM);
  const [sourceErr, setSourceErr] = useState<string | null>(null);
  const [savingSource, setSavingSource] = useState(false);

  // Ingest / Test Form
  const [ingestSourceId, setIngestSourceId] = useState('');
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestUrl, setIngestUrl] = useState('https://spsc.gos.pk/');
  const [ingestDeadline, setIngestDeadline] = useState('2026-12-30');
  const [ingestContent, setIngestContent] = useState('');
  const [ingestIsDemo, setIngestIsDemo] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResultMsg, setIngestResultMsg] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/engine/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        stats: SyncEngineStats;
        sources: MonitoredSource[];
        updates: NationalUpdate[];
        auditLogs: AuditLogEntry[];
        subscriptionCount: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Failed to load Update Engine telemetry.');
      setStats(data.stats);
      setSources(data.sources);
      setUpdates(data.updates);
      setAuditLogs(data.auditLogs);
      setSubscriptionCount(data.subscriptionCount ?? 0);
      if (!ingestSourceId && data.sources.length > 0) {
        setIngestSourceId(data.sources[0].id);
        setIngestUrl(data.sources[0].url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load engine data.');
    } finally {
      setLoading(false);
    }
  }, [token, ingestSourceId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/engine/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        ok: boolean;
        summary: string;
        stats: SyncEngineStats;
        sources: MonitoredSource[];
        updates: NationalUpdate[];
        auditLogs: AuditLogEntry[];
      };
      if (!res.ok) throw new Error('Manual sync failed.');
      setStats(data.stats);
      setSources(data.sources);
      setUpdates(data.updates);
      setAuditLogs(data.auditLogs);
      setSyncMessage(data.summary);
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Manual sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleScheduler = async () => {
    if (!stats) return;
    const res = await fetch('/api/admin/engine/scheduler', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ schedulerEnabled: !stats.schedulerEnabled }),
    });
    if (res.ok) {
      await loadOverview();
    }
  };

  const handleUpdateStatus = async (id: string, status: UpdateVerificationStatus) => {
    const res = await fetch(`/api/admin/engine/updates/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await loadOverview();
      onDataChanged();
    }
  };

  const handleDeleteUpdate = async (id: string) => {
    const res = await fetch(`/api/admin/engine/updates/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await loadOverview();
      onDataChanged();
    }
  };

  const openCreateSource = () => {
    setSourceErr(null);
    setSourceForm(EMPTY_SOURCE_FORM);
    setSourceModalOpen(true);
  };

  const openEditSource = (src: MonitoredSource) => {
    setSourceErr(null);
    setSourceForm({
      id: src.id,
      nameEn: src.nameEn,
      institutionCode: src.institutionCode,
      url: src.url,
      sourceType: src.sourceType,
      categoryDefault: src.categoryDefault,
      provinceDefault: src.provinceDefault,
      trusted: src.trusted,
      enabled: src.enabled,
      checkIntervalMinutes: src.checkIntervalMinutes,
    });
    setSourceModalOpen(true);
  };

  const handleSaveSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSource(true);
    setSourceErr(null);
    try {
      const isEdit = Boolean(sourceForm.id);
      const endpoint = isEdit
        ? `/api/admin/engine/sources/${sourceForm.id}`
        : '/api/admin/engine/sources';
      const res = await fetch(endpoint, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sourceForm),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not save source.');
      setSourceModalOpen(false);
      await loadOverview();
    } catch (err) {
      setSourceErr(err instanceof Error ? err.message : 'Save error.');
    } finally {
      setSavingSource(false);
    }
  };

  const handleToggleSource = async (src: MonitoredSource, patch: Partial<MonitoredSource>) => {
    const res = await fetch(`/api/admin/engine/sources/${src.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      await loadOverview();
    }
  };

  const handleDeleteSource = async (id: string) => {
    const res = await fetch(`/api/admin/engine/sources/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await loadOverview();
    }
  };

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngesting(true);
    setIngestResultMsg(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/engine/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceId: ingestSourceId,
          title: ingestTitle,
          url: ingestUrl,
          explicitDeadline: ingestDeadline,
          content: ingestContent,
          isDemo: ingestIsDemo,
        }),
      });
      const data = (await res.json()) as {
        result?: { outcome: string; reason?: string; update?: NationalUpdate };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Ingestion failed.');
      const outcome = data.result?.outcome || 'processed';
      const status = data.result?.update?.status;
      setIngestResultMsg(
        `Pipeline result: ${outcome.toUpperCase()}${status ? ` (Status: ${status})` : ''}${data.result?.reason ? ` — ${data.result.reason}` : ''}`,
      );
      await loadOverview();
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ingestion failed.');
    } finally {
      setIngesting(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-2 focus:outline-emerald-700';
  const labelClass = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1';

  if (loading && !stats) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-600 dark:text-slate-400">
        Loading National Update Engine...
      </div>
    );
  }

  const visibleUpdates =
    statusFilter === 'all' ? updates : updates.filter((u) => u.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Sync Header Bar & Manual Sync Now */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            RAASTA National Update Engine Control
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span>
              Last Successful Sync:{' '}
              <strong className="text-slate-900 dark:text-white">
                {formatStamp(stats?.lastSuccessfulSyncAt ?? null)}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Next Scheduled:{' '}
              <strong className="text-slate-900 dark:text-white">
                {stats?.schedulerEnabled ? formatStamp(stats.nextScheduledSyncAt) : 'Paused'}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Sync Runs: <strong className="text-slate-900 dark:text-white">{stats?.totalSyncRuns ?? 0}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Citizen Alert Profiles:{' '}
              <strong className="text-slate-900 dark:text-white">{subscriptionCount}</strong>
            </span>
          </div>
          {stats?.lastRunSummary && (
            <p className="text-xs text-slate-600 dark:text-slate-400 pt-1">{stats.lastRunSummary}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleToggleScheduler()}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
          >
            {stats?.schedulerEnabled ? 'Auto-Sync: Enabled' : 'Auto-Sync: Paused'}
          </button>

          <button
            type="button"
            disabled={syncing || stats?.isSyncing}
            onClick={() => void handleManualSync()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-60 rounded-lg cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Synchronizing...' : 'Manual Sync Now'}</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs font-medium text-emerald-900 dark:text-emerald-300">
          {syncMessage}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* 8-Card National Update Engine KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Sources Monitored</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats?.totalSources ?? 0}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Working Sources</p>
          <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-400 mt-1">
            {stats?.workingSources ?? 0}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Sources with Errors</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">
            {stats?.errorSources ?? 0}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">New Detected</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats?.newAnnouncementsDetected ?? 0}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Auto-Published</p>
          <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-400 mt-1">
            {stats?.autoPublishedPosts ?? 0}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Pending Verification</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {stats?.pendingVerification ?? 0}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Expired Updates</p>
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">
            {stats?.expiredAnnouncements ?? 0}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Duplicates Skipped</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats?.duplicateAnnouncements ?? 0}
          </p>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg flex flex-wrap gap-1">
          {(
            [
              { id: 'queue', label: `Updates Queue (${updates.length})` },
              { id: 'sources', label: `Monitored Sources (${sources.length})` },
              { id: 'ingest', label: 'Process / Test Announcement' },
              { id: 'audit', label: `Audit Log (${auditLogs.length})` },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSubView(item.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                subView === item.id
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {subView === 'sources' && (
          <button
            type="button"
            onClick={openCreateSource}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Monitored Source</span>
          </button>
        )}
      </div>

      {/* Sub-view 1: Updates Verification Queue */}
      {subView === 'queue' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                'all',
                'pending_verification',
                'auto_published',
                'approved',
                'expired',
                'rejected',
              ] as const
            ).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 dark:bg-emerald-700 text-white border-slate-900 dark:border-emerald-700'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {st.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
            {visibleUpdates.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No updates match this verification filter.
              </p>
            ) : (
              visibleUpdates.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      <span className="font-semibold text-slate-900 dark:text-white uppercase">
                        {item.category.replace('_', ' ')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.province}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-semibold ${
                          item.status === 'auto_published' || item.status === 'approved'
                            ? 'text-emerald-800 dark:text-emerald-400'
                            : item.status === 'pending_verification'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.processingMode === 'groq_ai' ? 'Groq AI' : 'Rule Parser'}</span>
                      {item.isDemo && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-amber-700 dark:text-amber-400">DEMO</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.titleEn}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                      {item.sourceNameEn} · Deadline: {item.deadline} · Discovered:{' '}
                      {item.discoveredAt.slice(0, 10)}
                    </p>
                    {item.validationWarnings.length > 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Warning: {item.validationWarnings.join(' · ')}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {item.status !== 'approved' && item.status !== 'auto_published' && (
                      <button
                        type="button"
                        onClick={() => void handleUpdateStatus(item.id, 'approved')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}
                    {item.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => void handleUpdateStatus(item.id, 'rejected')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 rounded-md cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}
                    {item.status !== 'expired' && (
                      <button
                        type="button"
                        onClick={() => void handleUpdateStatus(item.id, 'expired')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 rounded-md cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Expire</span>
                      </button>
                    )}
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      aria-label="Open Source"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleDeleteUpdate(item.id)}
                      aria-label="Delete update"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sub-view 2: Monitored Official Sources */}
      {subView === 'sources' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
          {sources.map((src) => (
            <div
              key={src.id}
              className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {src.institutionCode}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="uppercase">{src.sourceType}</span>
                  <span aria-hidden="true">·</span>
                  <span>{src.provinceDefault}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-semibold ${
                      src.lastStatus === 'ok'
                        ? 'text-emerald-800 dark:text-emerald-400'
                        : src.lastStatus === 'error'
                          ? 'text-red-700 dark:text-red-400'
                          : src.lastStatus === 'skipped'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-500'
                    }`}
                  >
                    STATUS: {src.lastStatus.toUpperCase()}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{src.trusted ? 'Trusted' : 'Untrusted'}</span>
                  <span aria-hidden="true">·</span>
                  <span>Items: {src.itemsDetected}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{src.nameEn}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{src.url}</p>
                {src.lastError && (
                  <p className="text-xs text-red-700 dark:text-red-400">{src.lastError}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleToggleSource(src, { enabled: !src.enabled })}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                    src.enabled
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {src.enabled ? 'Enabled' : 'Disabled'}
                </button>
                <button
                  type="button"
                  onClick={() => openEditSource(src)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteSource(src.id)}
                  aria-label="Remove source"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-view 3: Announcement Ingestion & AI Validation Tester */}
      {subView === 'ingest' && (
        <form
          onSubmit={handleIngestSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4"
        >
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Process Announcement Through National Update Pipeline
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Runs Groq AI extraction (or deterministic non-hallucinating fallback), duplicate hash check, deadline change detection, expiry check, and validation rules.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Registered Source</label>
              <select
                value={ingestSourceId}
                onChange={(e) => {
                  setIngestSourceId(e.target.value);
                  const found = sources.find((s) => s.id === e.target.value);
                  if (found) setIngestUrl(found.url);
                }}
                className={inputClass}
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.institutionCode} — {s.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Original Announcement URL</label>
              <input
                required
                type="url"
                value={ingestUrl}
                onChange={(e) => setIngestUrl(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={labelClass}>Announcement Title</label>
              <input
                required
                type="text"
                value={ingestTitle}
                onChange={(e) => setIngestTitle(e.target.value)}
                placeholder="e.g. SPSC Medical Officer & Lecturer Recruitment Notice"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Deadline (YYYY-MM-DD or Rolling)</label>
              <input
                type="text"
                value={ingestDeadline}
                onChange={(e) => setIngestDeadline(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Raw Official Announcement Content</label>
            <textarea
              required
              rows={4}
              value={ingestContent}
              onChange={(e) => setIngestContent(e.target.value)}
              placeholder="Paste official notice text including eligibility, target province/cities, and explicit fee if mentioned..."
              className={inputClass}
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={ingestIsDemo}
              onChange={(e) => setIngestIsDemo(e.target.checked)}
              className="accent-amber-600"
            />
            <span>Label processed entry as DEMO</span>
          </label>

          {ingestResultMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-900 dark:text-emerald-200">
              {ingestResultMsg}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={ingesting}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
            >
              {ingesting ? 'Processing...' : 'Run Extraction & Publishing Workflow'}
            </button>
          </div>
        </form>
      )}

      {/* Sub-view 4: Audit Log */}
      {subView === 'audit' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  {log.action.replace('_', ' ').toUpperCase()} ·{' '}
                  <span className="text-emerald-800 dark:text-emerald-400">{log.actor}</span>
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{log.detail}</p>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                {formatStamp(log.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Monitored Source Modal */}
      {sourceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {sourceForm.id ? 'Edit Monitored Source' : 'Add Official Monitored Source'}
              </h3>
              <button
                type="button"
                onClick={() => setSourceModalOpen(false)}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSource} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Institution Name</label>
                  <input
                    required
                    type="text"
                    value={sourceForm.nameEn}
                    onChange={(e) => setSourceForm((s) => ({ ...s, nameEn: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Code</label>
                  <input
                    required
                    type="text"
                    value={sourceForm.institutionCode}
                    onChange={(e) =>
                      setSourceForm((s) => ({ ...s, institutionCode: e.target.value }))
                    }
                    placeholder="SPSC"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Official Source URL (http/https public domain)</label>
                <input
                  required
                  type="url"
                  value={sourceForm.url}
                  onChange={(e) => setSourceForm((s) => ({ ...s, url: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Feed Type</label>
                  <select
                    value={sourceForm.sourceType}
                    onChange={(e) =>
                      setSourceForm((s) => ({ ...s, sourceType: e.target.value as SourceType }))
                    }
                    className={inputClass}
                  >
                    <option value="html">HTML Portal</option>
                    <option value="rss">RSS / Atom</option>
                    <option value="sitemap">XML Sitemap</option>
                    <option value="api">Official JSON API</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Default Category</label>
                  <select
                    value={sourceForm.categoryDefault}
                    onChange={(e) =>
                      setSourceForm((s) => ({
                        ...s,
                        categoryDefault: e.target.value as UpdateCategory,
                      }))
                    }
                    className={inputClass}
                  >
                    {UPDATE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Province</label>
                  <select
                    value={sourceForm.provinceDefault}
                    onChange={(e) =>
                      setSourceForm((s) => ({
                        ...s,
                        provinceDefault: e.target.value as Province,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="All">All Pakistan</option>
                    <option value="Federal">Federal</option>
                    <option value="Sindh">Sindh</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                    <option value="Balochistan">Balochistan</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sourceForm.trusted}
                    onChange={(e) => setSourceForm((s) => ({ ...s, trusted: e.target.checked }))}
                    className="accent-emerald-700"
                  />
                  <span>Trusted Official Source (Auto-Publish eligible)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sourceForm.enabled}
                    onChange={(e) => setSourceForm((s) => ({ ...s, enabled: e.target.checked }))}
                    className="accent-emerald-700"
                  />
                  <span>Enabled</span>
                </label>
              </div>

              {sourceErr && <p className="text-xs text-red-700 dark:text-red-400">{sourceErr}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSourceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSource}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                >
                  {savingSource ? 'Saving...' : 'Save Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
