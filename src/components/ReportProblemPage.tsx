import React, { useMemo, useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import type {
  Language,
  ProblemCategory,
  Province,
  PublicProblemSummary,
} from '../types';
import type { TranslationBundle } from '../i18n/translations';

interface ReportProblemPageProps {
  language: Language;
  t: TranslationBundle;
  problems: PublicProblemSummary[];
  loading: boolean;
  onProblemCreated: (created: PublicProblemSummary) => void;
}

const CATEGORIES: ProblemCategory[] = [
  'Water & Sewerage',
  'Electricity & Gas',
  'Road & Streetlights',
  'Garbage & Sanitation',
  'Education & School',
  'Health & Hospital',
  'Government Office Service',
];

const SINDH_DISTRICTS = [
  'Karachi South',
  'Karachi East',
  'Karachi Central',
  'Karachi West',
  'Korangi',
  'Malir',
  'Keamari',
  'Hyderabad',
  'Sukkur',
  'Larkana',
  'Mirpurkhas',
  'Shaheed Benazirabad',
  'Jamshoro',
  'Thatta',
  'Other District',
];

export const ReportProblemPage: React.FC<ReportProblemPageProps> = ({
  language,
  t,
  problems,
  loading,
  onProblemCreated,
}) => {
  const [category, setCategory] = useState<ProblemCategory>('Water & Sewerage');
  const [province, setProvince] = useState<Exclude<Province, 'All'>>('Sindh');
  const [district, setDistrict] = useState('Karachi East');
  const [area, setArea] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRef, setCreatedRef] = useState<string | null>(null);
  const [trackerSearch, setTrackerSearch] = useState('');

  const filteredProblems = useMemo(() => {
    const q = trackerSearch.trim().toLowerCase();
    if (!q) return problems;
    return problems.filter(
      (p) =>
        p.referenceCode.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.area.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q),
    );
  }, [problems, trackerSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setCreatedRef(null);

    try {
      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          province,
          district,
          area,
          title,
          description,
          reporterName,
          reporterContact,
        }),
      });
      const data = (await res.json()) as { item?: PublicProblemSummary; error?: string };
      if (!res.ok || !data.item) {
        throw new Error(data.error || 'Could not submit problem report.');
      }

      onProblemCreated(data.item);
      setCreatedRef(data.item.referenceCode);
      setArea('');
      setTitle('');
      setDescription('');
      setReporterName('');
      setReporterContact('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-2 focus:outline-emerald-700';
  const labelClass = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1';

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{t.report.title}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">{t.report.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Submit Problem Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.report.formTitle}</h2>

          {createdRef && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.report.submitSuccess}</span>
              </div>
              <p className="font-mono text-base font-bold text-emerald-900 dark:text-emerald-300 tabular-nums">
                {createdRef}
              </p>
            </div>
          )}

          <div>
            <label className={labelClass}>
              {language === 'ur' ? 'مسئلے کی قسم' : 'Issue Category'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProblemCategory)}
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t.provinceLabel}</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value as Exclude<Province, 'All'>)}
                className={inputClass}
              >
                <option value="Sindh">Sindh</option>
                <option value="Federal">Federal / ICT</option>
                <option value="Punjab">Punjab</option>
                <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                <option value="Balochistan">Balochistan</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>
                {language === 'ur' ? 'ضلع / شہر' : 'District / City'}
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className={inputClass}
              >
                {SINDH_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>
              {language === 'ur' ? 'علاقہ / یونین کونسل / محلہ' : 'Area / Union Council / Mohalla'}
            </label>
            <input
              required
              type="text"
              placeholder={language === 'ur' ? 'مثلاً: لطیف آباد یونٹ 8' : 'e.g. Gulshan Block 4 / Latifabad Unit 8'}
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              {language === 'ur' ? 'مختصر عنوان' : 'Short Issue Title'}
            </label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              {language === 'ur' ? 'مکمل تفصیل' : 'Issue Description'}
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className={labelClass}>
                {language === 'ur' ? 'آپ کا نام (اختیاری)' : 'Your Name (Optional)'}
              </label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                {language === 'ur' ? 'فون / ای میل (خفیہ)' : 'Phone / Email (Private)'}
              </label>
              <input
                type="text"
                value={reporterContact}
                onChange={(e) => setReporterContact(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">{t.report.privacyNote}</p>

          {error && <p className="text-xs text-red-700 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg cursor-pointer disabled:opacity-50"
          >
            {submitting ? t.common.submitting : t.common.submit}
          </button>
        </form>

        {/* Public Tracker */}
        <div className="lg:col-span-7 space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.report.trackerTitle}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.report.trackerSubtitle}</p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              value={trackerSearch}
              onChange={(e) => setTrackerSearch(e.target.value)}
              placeholder={t.report.searchRefPlaceholder}
              className="w-full ps-10 pe-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-2 focus:outline-emerald-700"
            />
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-sm text-slate-600 dark:text-slate-400">
              {t.common.loading}
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-sm text-slate-600 dark:text-slate-400">
              {t.common.emptyTitle}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
              {filteredProblems.map((p) => (
                <div key={p.id} className="p-5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                        {p.referenceCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{p.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {p.district} ({p.area})
                      </span>
                    </div>
                    <span
                      className={`font-semibold ${
                        p.status === 'resolved'
                          ? 'text-emerald-800 dark:text-emerald-400'
                          : p.status === 'forwarded'
                            ? 'text-blue-800 dark:text-blue-400'
                            : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {t.report.statuses[p.status]}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{p.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{p.description}</p>

                  {p.adminNote && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2">
                      {p.adminNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
