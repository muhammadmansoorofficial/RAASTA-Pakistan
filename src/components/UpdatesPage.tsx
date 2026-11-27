import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Calendar,
  Check,
  ExternalLink,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import type {
  Language,
  NationalUpdate,
  NotificationTopic,
  Province,
  UpdateCategory,
} from '../types';
import type { TranslationBundle } from '../i18n/translations';

interface UpdatesPageProps {
  language: Language;
  t: TranslationBundle;
  province: Province;
  onProvinceChange: (province: Province) => void;
  initialCategory?: UpdateCategory | 'all';
}

const ALL_CATEGORIES: Array<UpdateCategory | 'all'> = [
  'all',
  'gov_jobs',
  'scholarships',
  'free_courses',
  'gov_schemes',
  'nadra_updates',
  'police_recruitment',
  'armed_forces',
  'university_admissions',
  'public_announcements',
  'citizen_services',
];

function safeExternalUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.toString();
  } catch {
    // ignore invalid url
  }
  return '#';
}

function formatDateTimeShort(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
}

export const UpdatesPage: React.FC<UpdatesPageProps> = ({
  language,
  t,
  province,
  onProvinceChange,
  initialCategory = 'all',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<UpdateCategory | 'all'>(initialCategory);
  const [deadlineFilter, setDeadlineFilter] = useState<
    'all' | 'active' | 'closing_soon' | 'rolling' | 'expired'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [updates, setUpdates] = useState<NationalUpdate[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [monitoredCount, setMonitoredCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUpdate, setSelectedUpdate] = useState<NationalUpdate | null>(null);

  // Citizen Notification Preferences State (zero PII)
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifProvince, setNotifProvince] = useState<Province>(province === 'All' ? 'Sindh' : province);
  const [notifCategories, setNotifCategories] = useState<UpdateCategory[]>([
    'gov_jobs',
    'scholarships',
    'free_courses',
    'citizen_services',
  ]);
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifSavedMsg, setNotifSavedMsg] = useState<string | null>(null);
  const [matchedAlerts, setMatchedAlerts] = useState<NationalUpdate[]>([]);

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    try {
      const savedCats = localStorage.getItem('raasta-notif-cats');
      const savedProv = localStorage.getItem('raasta-notif-prov') as Province | null;
      if (savedCats) {
        const parsed = JSON.parse(savedCats) as UpdateCategory[];
        if (Array.isArray(parsed) && parsed.length > 0) setNotifCategories(parsed);
      }
      if (savedProv) setNotifProvince(savedProv);
    } catch {
      // ignore storage errors
    }
  }, []);

  const loadUpdates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (province !== 'All') params.set('province', province);
      if (deadlineFilter !== 'all') params.set('deadlineFilter', deadlineFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/updates?${params.toString()}`);
      if (!res.ok) throw new Error('Unable to load National Updates.');
      const data = (await res.json()) as {
        items: NationalUpdate[];
        lastSuccessfulSyncAt: string | null;
        totalMonitoredSources: number;
      };
      setUpdates(data.items ?? []);
      setLastSyncedAt(data.lastSuccessfulSyncAt ?? null);
      setMonitoredCount(data.totalMonitoredSources ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, province, deadlineFilter, searchQuery]);

  useEffect(() => {
    void loadUpdates();
  }, [loadUpdates]);

  const loadMatchedAlerts = useCallback(async (prov: Province, cats: UpdateCategory[]) => {
    try {
      const params = new URLSearchParams();
      params.set('province', prov);
      if (cats.length > 0) params.set('categories', cats.join(','));
      const res = await fetch(`/api/notifications/match?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { alerts: NationalUpdate[] };
        setMatchedAlerts(data.alerts ?? []);
      }
    } catch {
      // ignore alert fetch errors
    }
  }, []);

  useEffect(() => {
    if (notifOpen) {
      void loadMatchedAlerts(notifProvince, notifCategories);
    }
  }, [notifOpen, notifProvince, notifCategories, loadMatchedAlerts]);

  const toggleNotifCategory = (cat: UpdateCategory) => {
    setNotifSavedMsg(null);
    setNotifCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleSaveNotifications = async () => {
    setSavingNotif(true);
    setNotifSavedMsg(null);
    try {
      let existingSubId = '';
      try {
        existingSubId = localStorage.getItem('raasta-notif-sub-id') || '';
      } catch {
        // ignore
      }

      const topics: NotificationTopic[] = [];
      if (notifCategories.includes('gov_jobs') || notifCategories.includes('police_recruitment')) {
        topics.push('gov_jobs');
      }
      if (notifCategories.includes('scholarships') || notifCategories.includes('university_admissions')) {
        topics.push('scholarships');
      }
      if (notifCategories.includes('free_courses')) {
        topics.push('free_courses');
      }
      if (
        notifCategories.includes('citizen_services') ||
        notifCategories.includes('nadra_updates') ||
        notifCategories.includes('gov_schemes')
      ) {
        topics.push('citizen_services');
      }

      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: existingSubId || undefined,
          province: notifProvince,
          categories: notifCategories,
          topics,
        }),
      });
      if (!res.ok) throw new Error('Could not save preferences.');
      const data = (await res.json()) as {
        subscriptionId: string;
        alerts: NationalUpdate[];
      };

      try {
        localStorage.setItem('raasta-notif-sub-id', data.subscriptionId);
        localStorage.setItem('raasta-notif-cats', JSON.stringify(notifCategories));
        localStorage.setItem('raasta-notif-prov', notifProvince);
      } catch {
        // ignore storage restrictions
      }

      setMatchedAlerts(data.alerts ?? []);
      setNotifSavedMsg(t.updates.alertsSaved);
    } catch {
      setNotifSavedMsg('Unable to save preferences right now.');
    } finally {
      setSavingNotif(false);
    }
  };

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: updates.length };
    for (const u of updates) {
      map[u.category] = (map[u.category] || 0) + 1;
    }
    return map;
  }, [updates]);

  return (
    <div className="space-y-6">
      {/* Header & Engine Metadata */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {t.updates.title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
            {t.updates.subtitle}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1 tabular-nums">
            <span>
              {t.updates.monitoredCount}: <strong className="text-slate-800 dark:text-slate-200">{monitoredCount}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {t.updates.lastSynced}:{' '}
              <strong className="text-slate-800 dark:text-slate-200">{formatDateTimeShort(lastSyncedAt)}</strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setNotifOpen((v) => !v)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            notifOpen
              ? 'bg-emerald-700 text-white border-emerald-700 dark:bg-emerald-600 dark:border-emerald-600'
              : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>{t.updates.notificationsTitle}</span>
        </button>
      </div>

      {/* Citizen Notification Preferences & Matched Alerts Panel */}
      {notifOpen && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t.updates.notificationsTitle}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
                {t.updates.notificationsSubtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotifOpen(false)}
              aria-label={t.common.close}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.provinceLabel}
                </label>
                <select
                  value={notifProvince}
                  onChange={(e) => {
                    setNotifProvince(e.target.value as Province);
                    setNotifSavedMsg(null);
                  }}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="All">{t.provinces.All}</option>
                  <option value="Sindh">{t.provinces.Sindh}</option>
                  <option value="Federal">{t.provinces.Federal}</option>
                  <option value="Punjab">{t.provinces.Punjab}</option>
                  <option value="Khyber Pakhtunkhwa">{t.provinces['Khyber Pakhtunkhwa']}</option>
                  <option value="Balochistan">{t.provinces.Balochistan}</option>
                </select>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {language === 'ur' ? 'پسندیدہ شعبے منتخب کریں' : 'Preferred Alert Categories'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_CATEGORIES.filter((c): c is UpdateCategory => c !== 'all').map((cat) => {
                    const checked = notifCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleNotifCategory(cat)}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border text-start transition-colors cursor-pointer ${
                          checked
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            checked
                              ? 'bg-emerald-700 border-emerald-700 text-white'
                              : 'border-slate-400 dark:border-slate-500'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" />}
                        </span>
                        <span className="truncate">{t.updates.categories[cat]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={savingNotif}
                  onClick={() => void handleSaveNotifications()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg cursor-pointer"
                >
                  {savingNotif ? t.common.submitting : t.updates.saveAlerts}
                </button>
                {notifSavedMsg && (
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-400">
                    {notifSavedMsg}
                  </p>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  {t.updates.matchingAlertsTitle} ({matchedAlerts.length})
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t.provinces[notifProvince]}
                </span>
              </div>

              {matchedAlerts.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4">{t.updates.noAlerts}</p>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-72 overflow-y-auto">
                  {matchedAlerts.map((alert) => (
                    <div key={alert.id} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-[11px] font-medium text-emerald-800 dark:text-emerald-400 tabular-nums">
                          {t.updates.categories[alert.category]} · {t.common.deadline}: {alert.deadline}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedUpdate(alert)}
                          className="text-xs font-bold text-slate-900 dark:text-white hover:underline text-start cursor-pointer"
                        >
                          {language === 'ur' ? alert.titleUr : alert.titleEn}
                        </button>
                      </div>
                      <a
                        href={safeExternalUrl(alert.sourceUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-800 dark:text-emerald-400 shrink-0 p-1"
                        aria-label={t.common.officialWebsite}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Search + Province + Deadline Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.common.searchPlaceholder}
              className="w-full ps-9 pe-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-2 focus:outline-emerald-700"
            />
          </div>

          <div className="md:col-span-3">
            <select
              aria-label={t.provinceLabel}
              value={province}
              onChange={(e) => onProvinceChange(e.target.value as Province)}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="All">{t.provinces.All}</option>
              <option value="Sindh">{t.provinces.Sindh}</option>
              <option value="Federal">{t.provinces.Federal}</option>
              <option value="Punjab">{t.provinces.Punjab}</option>
              <option value="Khyber Pakhtunkhwa">{t.provinces['Khyber Pakhtunkhwa']}</option>
              <option value="Balochistan">{t.provinces.Balochistan}</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              aria-label={t.updates.deadlineFilterLabel}
              value={deadlineFilter}
              onChange={(e) =>
                setDeadlineFilter(
                  e.target.value as 'all' | 'active' | 'closing_soon' | 'rolling' | 'expired',
                )
              }
              className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="all">{t.updates.deadlineFilters.all}</option>
              <option value="active">{t.updates.deadlineFilters.active}</option>
              <option value="closing_soon">{t.updates.deadlineFilters.closing_soon}</option>
              <option value="rolling">{t.updates.deadlineFilters.rolling}</option>
              <option value="expired">{t.updates.deadlineFilters.expired}</option>
            </select>
          </div>
        </div>

        {/* 10 National Update Categories Strip */}
        <div className="flex flex-wrap gap-1.5">
          {ALL_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-900 dark:bg-emerald-700 text-white border-slate-900 dark:border-emerald-700'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {t.updates.categories[cat]}
                {cat === 'all' && !loading ? ` (${categoryCounts.all || 0})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-sm text-slate-600 dark:text-slate-400">
          {t.common.loading}
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-xl p-8 text-center space-y-3">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => void loadUpdates()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.common.retry}</span>
          </button>
        </div>
      ) : updates.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
          <p className="text-base font-bold text-slate-900 dark:text-white">{t.common.emptyTitle}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t.common.emptySubtitle}</p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setDeadlineFilter('all');
              setSearchQuery('');
              onProvinceChange('All');
            }}
            className="px-4 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg cursor-pointer"
          >
            {t.common.resetFilters}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {updates.map((item) => {
            const isExpired = item.status === 'expired';
            return (
              <article
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                      {t.updates.categories[item.category]}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{t.provinces[item.province]}</span>
                    {item.city && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{item.city}</span>
                      </>
                    )}
                    {item.isDemo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          {t.common.demoTag}
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-semibold ${
                        isExpired
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-emerald-800 dark:text-emerald-400'
                      }`}
                    >
                      {isExpired ? t.common.expired : t.common.active}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {language === 'ur' ? item.titleUr : item.titleEn}
                  </h2>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                    {language === 'ur' ? item.summaryUr : item.summaryEn}
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed">
                    <span className="font-semibold not-italic text-slate-700 dark:text-slate-300">
                      Roman Urdu:{' '}
                    </span>
                    {item.summaryRomanUrdu}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {t.common.deadline}:{' '}
                        <strong className="text-slate-800 dark:text-slate-200">{item.deadline}</strong>
                        {item.previousDeadline ? ` (was ${item.previousDeadline})` : ''}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{language === 'ur' ? item.sourceNameUr : item.sourceNameEn}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {t.updates.publishedDate}: {item.originalPublishedDate} · {t.updates.discoveredDate}:{' '}
                      {item.discoveredAt.slice(0, 10)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedUpdate(item)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                      >
                        {t.common.viewDetails}
                      </button>
                      <a
                        href={safeExternalUrl(item.sourceUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg"
                      >
                        <span>{t.common.officialWebsite}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Detailed Multilingual Announcement Modal */}
      {selectedUpdate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
                  {t.updates.categories[selectedUpdate.category]} · {t.provinces[selectedUpdate.province]} ·{' '}
                  {selectedUpdate.city}
                </p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {language === 'ur' ? selectedUpdate.titleUr : selectedUpdate.titleEn}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'ur' ? selectedUpdate.sourceNameUr : selectedUpdate.sourceNameEn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUpdate(null)}
                aria-label={t.common.close}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg text-xs tabular-nums">
              <div>
                <p className="text-slate-500 dark:text-slate-400">{t.common.deadline}</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedUpdate.deadline}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">{t.updates.publishedDate}</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedUpdate.originalPublishedDate}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">{t.updates.discoveredDate}</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedUpdate.discoveredAt.slice(0, 10)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">{t.common.lastVerified}</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedUpdate.lastVerifiedDate}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                  {t.updates.englishSummaryLabel}
                </h3>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedUpdate.summaryEn}
                </p>
              </div>

              <div dir="rtl" className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg">
                <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-1">
                  {t.updates.urduSummaryLabel}
                </h3>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedUpdate.summaryUr}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                  {t.updates.romanUrduLabel}
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedUpdate.summaryRomanUrdu}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                  {t.common.eligibility}
                </h3>
                <ul className="list-disc ps-5 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  {(language === 'ur' ? selectedUpdate.eligibilityUr : selectedUpdate.eligibilityEn).map(
                    (line, idx) => (
                      <li key={idx}>{line}</li>
                    ),
                  )}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                  {t.updates.feeLabel}
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {language === 'ur' ? selectedUpdate.feeNoteUr : selectedUpdate.feeNoteEn}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {selectedUpdate.trustedSource ? t.common.verifiedSource : t.common.unverifiedSource}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUpdate(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                >
                  {t.common.close}
                </button>
                <a
                  href={safeExternalUrl(selectedUpdate.sourceUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 rounded-lg"
                >
                  <span>{t.common.officialWebsite}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
