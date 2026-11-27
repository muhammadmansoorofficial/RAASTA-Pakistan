import React, { useState } from 'react';
import { CheckSquare, ExternalLink, FileCheck2, Square } from 'lucide-react';
import type { DocumentGuide, Language } from '../types';
import type { TranslationBundle } from '../i18n/translations';

interface DocumentGuidesPageProps {
  language: Language;
  t: TranslationBundle;
  guides: DocumentGuide[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const DocumentGuidesPage: React.FC<DocumentGuidesPageProps> = ({
  language,
  t,
  guides,
  loading,
  error,
  onRetry,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});
  const [imgFailed, setImgFailed] = useState(false);

  const activeGuide = guides.find((g) => g.id === selectedId) || guides[0] || null;

  const toggleDoc = (guideId: string, idx: number) => {
    const key = `${guideId}-${idx}`;
    setCheckedDocs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-600 dark:text-slate-400">
        {t.common.loading}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-xl p-8 text-center space-y-3">
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-700 rounded-lg cursor-pointer"
        >
          {t.common.retry}
        </button>
      </div>
    );
  }

  if (!activeGuide) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
        <p className="text-base font-bold text-slate-900 dark:text-white">{t.common.emptyTitle}</p>
      </div>
    );
  }

  const docsList = language === 'ur' ? activeGuide.requiredDocsUr : activeGuide.requiredDocsEn;
  const stepsList = language === 'ur' ? activeGuide.stepsUr : activeGuide.stepsEn;
  const readyCount = docsList.filter((_, idx) => checkedDocs[`${activeGuide.id}-${idx}`]).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 flex flex-col justify-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{t.guides.title}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">{t.guides.subtitle}</p>
        </div>

        <div className="lg:col-span-4">
          <div className="h-36 lg:h-full min-h-[140px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
            {!imgFailed ? (
              <img
                src="/src/assets/images/guide_citizen_documents_1795725312248.jpg"
                alt="Organized citizen application folder and document checklist on a desk"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-800 dark:text-emerald-400">
                <FileCheck2 className="w-8 h-8" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Selector + Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/70 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {t.guides.selectGuide}
          </div>
          {guides.map((guide) => {
            const isSelected = guide.id === activeGuide.id;
            return (
              <button
                key={guide.id}
                type="button"
                onClick={() => setSelectedId(guide.id)}
                className={`w-full text-start p-4 transition-colors cursor-pointer ${
                  isSelected ? 'bg-emerald-50 dark:bg-emerald-950/60' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <p className={`text-sm font-bold ${isSelected ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-900 dark:text-slate-100'}`}>
                  {language === 'ur' ? guide.titleUr : guide.titleEn}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {language === 'ur' ? guide.authorityUr : guide.authorityEn} · {t.provinces[guide.province]}
                </p>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                <span>{language === 'ur' ? activeGuide.authorityUr : activeGuide.authorityEn}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {t.common.lastVerified}: {activeGuide.lastVerifiedDate}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {language === 'ur' ? activeGuide.titleUr : activeGuide.titleEn}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {language === 'ur' ? activeGuide.summaryUr : activeGuide.summaryEn}
              </p>
            </div>

            <a
              href={activeGuide.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg whitespace-nowrap shrink-0"
            >
              <span>{t.common.officialWebsite}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Interactive Required Documents Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.common.requiredDocuments}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.guides.checklistHelp}</p>
              </div>
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
                {readyCount}/{docsList.length} {t.guides.checklistProgress}
              </span>
            </div>

            <div className="space-y-2">
              {docsList.map((doc, idx) => {
                const checked = Boolean(checkedDocs[`${activeGuide.id}-${idx}`]);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDoc(activeGuide.id, idx)}
                    className={`w-full text-start p-3 rounded-lg border flex items-start gap-3 transition-colors cursor-pointer ${
                      checked
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200'
                        : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${checked ? 'line-through opacity-75' : ''}`}>
                      {doc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step by step procedure */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.common.stepByStep}</h3>
            <ol className="space-y-2.5">
              {stepsList.map((step, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5"
                >
                  <span className="w-6 h-6 rounded-md bg-slate-900 dark:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Fee Note */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-lg p-4 space-y-1">
            <p className="text-xs font-bold text-amber-900 dark:text-amber-300">{t.guides.feeNoteLabel}</p>
            <p className="text-sm text-amber-900 dark:text-amber-200">
              {language === 'ur' ? activeGuide.feeNoteUr : activeGuide.feeNoteEn}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
