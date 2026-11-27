import React, { useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Plus, Search, X } from 'lucide-react';
import type { Language, Opportunity, OpportunityCategory, Province } from '../types';
import type { TranslationBundle } from '../i18n/translations';

interface OpportunitiesPageProps {
  category: OpportunityCategory;
  language: Language;
  t: TranslationBundle;
  province: Province;
  opportunities: Opportunity[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const OpportunitiesPage: React.FC<OpportunitiesPageProps> = ({
  category,
  language,
  t,
  province,
  opportunities,
  loading,
  error,
  onRetry,
}) => {
  const [search, setSearch] = useState('');
  const [educationFilter, setEducationFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [selectedItem, setSelectedItem] = useState<Opportunity | null>(null);
  const [showSuggestModal, setShowSuggestModal] = useState(false);

  const [suggestTitle, setSuggestTitle] = useState('');
  const [suggestOrg, setSuggestOrg] = useState('');
  const [suggestUrl, setSuggestUrl] = useState('');
  const [suggestProvince, setSuggestProvince] = useState<Exclude<Province, 'All'>>('Sindh');
  const [suggestDeadline, setSuggestDeadline] = useState('');
  const [suggestDesc, setSuggestDesc] = useState('');
  const [suggestStatus, setSuggestStatus] = useState<'idle' | 'submitting' | 'done' | 'err'>('idle');
  const [suggestErr, setSuggestErr] = useState('');

  const categoryKey =
    category === 'scholarship'
      ? 'scholarships'
      : category === 'job'
        ? 'jobs'
        : category === 'internship'
          ? 'internships'
          : 'courses';

  const categoryItems = useMemo(
    () => opportunities.filter((o) => o.category === category),
    [opportunities, category],
  );

  const educationLevels = useMemo(() => {
    const set = new Set(categoryItems.map((i) => i.educationLevel));
    return ['All', ...Array.from(set)];
  }, [categoryItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categoryItems.filter((item) => {
      if (province !== 'All' && item.province !== province) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (educationFilter !== 'All' && item.educationLevel !== educationFilter) return false;
      if (!q) return true;
      return (
        item.titleEn.toLowerCase().includes(q) ||
        item.titleUr.toLowerCase().includes(q) ||
        item.organizationEn.toLowerCase().includes(q) ||
        item.cityOrScopeEn.toLowerCase().includes(q) ||
        item.descriptionEn.toLowerCase().includes(q)
      );
    });
  }, [categoryItems, province, statusFilter, educationFilter, search]);

  const handleSuggestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuggestStatus('submitting');
    setSuggestErr('');

    try {
      const res = await fetch('/api/opportunities/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          titleEn: suggestTitle,
          organizationEn: suggestOrg,
          officialUrl: suggestUrl,
          province: suggestProvince,
          deadline: suggestDeadline || 'Rolling',
          descriptionEn: suggestDesc,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit suggestion.');
      }
      setSuggestStatus('done');
      setSuggestTitle('');
      setSuggestOrg('');
      setSuggestUrl('');
      setSuggestDeadline('');
      setSuggestDesc('');
    } catch (err) {
      setSuggestStatus('err');
      setSuggestErr(err instanceof Error ? err.message : 'Submission error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {t.opportunities.titles[categoryKey]}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            {t.opportunities.subtitles[categoryKey]}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSuggestStatus('idle');
            setSuggestErr('');
            setShowSuggestModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.common.suggestListing}</span>
        </button>
      </div>

      {/* Explicit MVP DEMO Notice */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-lg px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
        {t.demoBanner}
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.common.searchPlaceholder}
              className="w-full ps-10 pe-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-emerald-700"
            />
          </div>

          <div className="md:col-span-3">
            <select
              aria-label={t.opportunities.educationFilter}
              value={educationFilter}
              onChange={(e) => setEducationFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-2 focus:outline-emerald-700"
            >
              {educationLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl === 'All' ? `${t.opportunities.educationFilter}: ${t.common.all}` : lvl}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1">
            {(['all', 'active', 'expired'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.common[st]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading / Error / Empty / Data List */}
      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
              <div className="h-3 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800/60 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-700 rounded-lg cursor-pointer"
          >
            {t.common.retry}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
          <p className="text-base font-bold text-slate-900 dark:text-white">{t.common.emptyTitle}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t.common.emptySubtitle}</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setEducationFilter('All');
              setStatusFilter('all');
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
          >
            {t.common.resetFilters}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {item.isDemo && (
                    <>
                      <span className="font-semibold text-amber-700 dark:text-amber-400">{t.common.demoTag}</span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <span>{t.provinces[item.province]}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.educationLevel}</span>
                  <span aria-hidden="true">·</span>
                  <span className={item.status === 'expired' ? 'text-red-700 dark:text-red-400 font-semibold' : 'text-emerald-800 dark:text-emerald-400 font-semibold'}>
                    {item.status === 'expired' ? t.common.expired : t.common.active}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {language === 'ur' ? item.titleUr : item.titleEn}
                </h2>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {language === 'ur' ? item.organizationUr : item.organizationEn}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                  {language === 'ur' ? item.descriptionUr : item.descriptionEn}
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                  <span>
                    {t.common.deadline}: <strong className="text-slate-900 dark:text-white">{item.deadline}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {t.common.lastVerified}: {item.lastVerifiedDate}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap cursor-pointer"
                >
                  {t.common.viewDetails}
                </button>
                <a
                  href={item.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg whitespace-nowrap"
                >
                  <span>{t.common.officialWebsite}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {selectedItem.isDemo && (
                    <>
                      <span className="font-semibold text-amber-700 dark:text-amber-400">{t.common.demoTag}</span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <span>{t.provinces[selectedItem.province]}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {selectedItem.verifiedSource ? t.common.verifiedSource : t.common.unverifiedSource}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {language === 'ur' ? selectedItem.titleUr : selectedItem.titleEn}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {language === 'ur' ? selectedItem.organizationUr : selectedItem.organizationEn}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label={t.common.close}
                className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5 text-xs tabular-nums">
              <div>
                <p className="text-slate-500 dark:text-slate-400">{t.common.deadline}</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{selectedItem.deadline}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">{t.opportunities.educationFilter}</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{selectedItem.educationLevel}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">{t.common.lastVerified}</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{selectedItem.lastVerifiedDate}</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {language === 'ur' ? selectedItem.descriptionUr : selectedItem.descriptionEn}
            </p>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.common.eligibility}</h3>
              <ul className="list-disc ps-5 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                {(language === 'ur' ? selectedItem.eligibilityUr : selectedItem.eligibilityEn).map(
                  (el, i) => (
                    <li key={i}>{el}</li>
                  ),
                )}
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.common.requiredDocuments}</h3>
              <ul className="list-disc ps-5 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                {(language === 'ur' ? selectedItem.requiredDocsUr : selectedItem.requiredDocsEn).map(
                  (doc, i) => (
                    <li key={i}>{doc}</li>
                  ),
                )}
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                {t.common.close}
              </button>
              <a
                href={selectedItem.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg"
              >
                <span>{t.common.officialWebsite}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Suggest Opportunity Modal */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.opportunities.suggestTitle}</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{t.opportunities.suggestSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSuggestModal(false)}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {suggestStatus === 'done' ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-900 dark:text-emerald-200 space-y-3">
                <p>{t.opportunities.suggestSuccess}</p>
                <button
                  type="button"
                  onClick={() => setShowSuggestModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg cursor-pointer"
                >
                  {t.common.close}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSuggestSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'ur' ? 'عنوان' : 'Opportunity Title'}
                  </label>
                  <input
                    required
                    type="text"
                    value={suggestTitle}
                    onChange={(e) => setSuggestTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'ur' ? 'ادارہ / محکمہ' : 'Official Department / Organization'}
                  </label>
                  <input
                    required
                    type="text"
                    value={suggestOrg}
                    onChange={(e) => setSuggestOrg(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.provinceLabel}
                    </label>
                    <select
                      value={suggestProvince}
                      onChange={(e) => setSuggestProvince(e.target.value as Exclude<Province, 'All'>)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="Sindh">Sindh</option>
                      <option value="Federal">Federal</option>
                      <option value="Punjab">Punjab</option>
                      <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                      <option value="Balochistan">Balochistan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.common.deadline}
                    </label>
                    <input
                      type="date"
                      value={suggestDeadline}
                      onChange={(e) => setSuggestDeadline(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'ur' ? 'سرکاری ویب سائٹ لنک (https://...)' : 'Official Source URL (https://...)'}
                  </label>
                  <input
                    required
                    type="url"
                    placeholder="https://sindh.gov.pk/..."
                    value={suggestUrl}
                    onChange={(e) => setSuggestUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'ur' ? 'مختصر تفصیل' : 'Summary / Notes'}
                  </label>
                  <textarea
                    rows={3}
                    value={suggestDesc}
                    onChange={(e) => setSuggestDesc(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                {suggestStatus === 'err' && (
                  <p className="text-xs text-red-700 dark:text-red-400">{suggestErr}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSuggestModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={suggestStatus === 'submitting'}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                  >
                    {suggestStatus === 'submitting' ? t.common.submitting : t.common.submit}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
